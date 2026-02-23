import { useQueryClient } from "@tanstack/react-query";
import * as invoke from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import type { Album, Item, Library } from "@/lib/models";

export function useAction() {
    const { selectedLibrary } = useLibrary();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();

    function syncItems(update: (items: Item[]) => Item[]) {
        if (!selectedLibrary) return;

        queryClient.setQueriesData(
            {
                predicate: query => query.queryKey[0] === selectedLibrary.id && (query.queryKey[1] === "items" || (query.queryKey[1] === "albums" && query.queryKey[3] === "items")),
            },
            oldData => {
                if (!oldData || typeof oldData !== "object" || !("data" in oldData) || !Array.isArray(oldData.data))
                    return oldData;

                const result = oldData as { data: Item[] };

                return { ...result, data: update(result.data) };
            },
        );
    }

    async function setItemsFavorite(itemIds: string[], value: boolean) {
        if (!selectedLibrary) return;

        await invoke.setItemsFavorite({ libraryId: selectedLibrary.id, itemIds, value });

        syncItems(items => items.map(i => {
            if (itemIds.includes(i.id))
                return { ...i, is_favorite: value };
            return i;
        }));
    }

    async function transferItems(target: Library, itemIds: string[], doMove: boolean) {
        if (!selectedLibrary) return;

        const plural = itemIds.length === 1 ? "Item" : "Items";
        pushNoti((!doMove ? "Copying" : "Moving") + " " + plural.toLowerCase(), `${!doMove ? "Copying" : "Moving"} ${itemIds.length} ${plural.toLowerCase()} to "${target.name}"`, "promise", {
            promise: invoke.transferItems({
                sourceId: selectedLibrary.id,
                targetId: target.id,
                itemIds,
                doMove,
            }),
            peek: (!doMove ? "Copying" : "Moving") + " " + plural.toLowerCase(),
            success: () => ({
                title: plural + (!doMove ? " copied" : " moved"),
                description: `${itemIds.length} ${itemIds.length === 1 ? "item was" : "items were"} ${!doMove ? "copied" : "moved"} to "${target.name}"`,
            }),
            error: () => ({
                title: "Transfer failed",
                description: `Unable to ${!doMove ? "copy" : "move"} the selected items to the target library`,
            }),
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: [target.id, "items"] });
                if (doMove)
                    syncItems(items => items.filter(item => !itemIds.includes(item.id)));
            },
        });
    }

    async function deleteItems(itemIds: string[]) {
        if (!selectedLibrary || !itemIds.length) return;

        await invoke.deleteItems({ libraryId: selectedLibrary.id, itemIds });
        syncItems(items => items.filter(item => !itemIds.includes(item.id)));
        pushNoti("Items deleted", `${itemIds.length} ${itemIds.length === 1 ? "item" : "items"} have been deleted`, "success");
    }

    async function createAlbum(name: string, parent: string | undefined, color: string, icon: string) {
        if (!selectedLibrary) return;

        const { data } = await invoke.createAlbum({
            libraryId: selectedLibrary.id,
            name,
            description: "",
            parent,
            color,
            icon,
        });

        if (data)
            queryClient.invalidateQueries({ queryKey: [selectedLibrary?.id, "albums", parent] });

        return data;
    }

    async function addItemsToAlbum(itemIds: string[], album: Album) {
        if (!selectedLibrary) return;

        const nItems = itemIds.length;

        pushNoti("Adding items to \"" + album.name + "\"", `Adding ${nItems} ${nItems === 1 ? "item" : "items"} to album "${album.name}"`, "promise", {
            promise: invoke.addItemsToAlbum({ libraryId: selectedLibrary.id, albumId: album.id, itemIds }),
            peek: "Adding items",
            success: () => ({
                title: "Items added to \"" + album.name + "\"",
                description: `${nItems} ${nItems === 1 ? "item" : "items"} have been added to the album "${album.name}"`,
            }),
            error: e => ({
                title: "Error adding items to \"" + album.name + "\"",
                description: e,
            }),
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "albums", album.id, "items"] });
            },
        });
    }

    return {
        setItemsFavorite,
        transferItems,
        deleteItems,
        createAlbum,
        addItemsToAlbum,
    };
}