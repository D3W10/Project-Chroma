import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as invoke from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import { useMutationSafe } from "@/lib/useMutationSafe";
import { pathToName } from "@/lib/utils";
import type { Album, Item, Library } from "@/lib/models";

export function useAction() {
    const { selectedLibrary } = useLibrary();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();

    function syncItems(libraryId: string, update: (items: Item[]) => Item[]) {
        if (!libraryId) return;

        queryClient.setQueriesData(
            { predicate: q => q.queryKey[0] === libraryId && (q.queryKey[1] === "items" || (q.queryKey[1] === "albums" && q.queryKey[3] === "items")) },
            oldData => {
                if (!oldData || typeof oldData !== "object" || !("data" in oldData) || !Array.isArray(oldData.data))
                    return oldData;

                const result = oldData as { data: Item[] };
                return { ...result, data: update(result.data) };
            },
        );
    }

    const mutations = {
        setItemsFavorite: useMutationSafe({
            mutationFn: (opts: { libraryId: string; itemIds: string[]; value: boolean }) => invoke.setItemsFavorite(opts),
            onSuccess: (data, vars) => {
                if (data.error) return;
                syncItems(vars.libraryId, items => items.map(i => {
                    if (vars.itemIds.includes(i.id))
                        return { ...i, is_favorite: vars.value };
                    return i;
                }));
            },
        }),
        transferItems: useMutationSafe({
            mutationFn: (opts: { sourceId: string; targetId: string; itemIds: string[]; doMove: boolean }) => invoke.transferItems({
                sourceId: opts.sourceId,
                targetId: opts.targetId,
                itemIds: opts.itemIds,
                doMove: opts.doMove,
            }),
            onSuccess: (data, vars) => {
                if (data.error) return;
                queryClient.invalidateQueries({ queryKey: [vars.targetId, "items"] });
                if (vars.doMove)
                    syncItems(vars.sourceId, items => items.filter(item => !vars.itemIds.includes(item.id)));
            },
        }),
        deleteItems: useMutationSafe({
            mutationFn: (opts: { libraryId: string; itemIds: string[] }) => invoke.deleteItems(opts),
            onSuccess: (data, vars) => {
                if (data.error) return;
                syncItems(vars.libraryId, items => items.filter(item => !vars.itemIds.includes(item.id)));
            },
        }),
        exportItems: useMutationSafe({
            mutationFn: (opts: { libraryId: string; destination: string; itemIds: string[]; live: boolean; edits: boolean; adjustments: boolean }) => invoke.exportItems(opts),
        }),
        createAlbum: useMutationSafe({
            mutationFn: (opts: { libraryId: string; name: string; description?: string; parent?: string; color: string; icon: string }) => invoke.createAlbum(opts),
            onSuccess: (data, vars) => {
                if (data.error) return;
                queryClient.invalidateQueries({ queryKey: [vars.libraryId, "albums", vars.parent] });
            },
        }),
        addItemsToAlbum: useMutationSafe({
            mutationFn: (opts: { libraryId: string; albumId: string; itemIds: string[]; parent?: string }) => invoke.addItemsToAlbum({
                libraryId: opts.libraryId,
                albumId: opts.albumId,
                itemIds: opts.itemIds,
            }),
            onSuccess: (data, vars) => {
                if (data.error) return;
                queryClient.invalidateQueries({ queryKey: [vars.libraryId, "albums", vars.albumId, "items"] });
                queryClient.invalidateQueries({ queryKey: [vars.libraryId, "albums", vars.parent] });
            },
        }),
        createTag: useMutationSafe({
            mutationFn: (opts: { libraryId: string; name: string; color: string }) => invoke.createTag(opts),
            onSuccess: (data, vars) => {
                if (data.error) return;
                queryClient.invalidateQueries({ queryKey: [vars.libraryId, "tags"] });
            },
        }),
        updateTag: useMutationSafe({
            mutationFn: (opts: { libraryId: string; tagId: string; name?: string; color?: string }) => invoke.updateTag(opts),
            onSuccess: (data, vars) => {
                if (data.error) return;
                queryClient.invalidateQueries({ queryKey: [vars.libraryId, "tags"] });
            },
        }),
        deleteTags: useMutationSafe({
            mutationFn: (opts: { libraryId: string; tagIds: string[] }) => invoke.deleteTags(opts),
            onSuccess: (data, vars) => {
                if (data.error) return;
                queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === vars.libraryId && q.queryKey.includes("tags") });
            },
        }),
        addTagsToItems: useMutationSafe({
            mutationFn: (opts: { libraryId: string; itemIds: string[]; tagIds: string[] }) => invoke.addTagsToItems({
                libraryId: opts.libraryId,
                itemIds: opts.itemIds,
                tagIds: opts.tagIds,
            }),
            onSuccess: (data, vars) => {
                if (data.error) return;
                queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === vars.libraryId && q.queryKey[1] === "items" && q.queryKey[3] === "tags" });
            },
        }),
        removeTagsFromItems: useMutationSafe({
            mutationFn: (opts: { libraryId: string; itemIds: string[]; tagIds: string[] }) => invoke.removeTagsFromItems({
                libraryId: opts.libraryId,
                itemIds: opts.itemIds,
                tagIds: opts.tagIds,
            }),
            onSuccess: (data, vars) => {
                if (data.error) return;
                queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === vars.libraryId && q.queryKey[1] === "items" && q.queryKey[3] === "tags" });
            },
        }),
    };

    async function setItemsFavorite(itemIds: string[], value: boolean) {
        if (!selectedLibrary) return;

        return mutations.setItemsFavorite.mutateAsync({ libraryId: selectedLibrary.id, itemIds, value });
    }

    async function transferItems(target: Library, itemIds: string[], doMove: boolean) {
        if (!selectedLibrary) return;

        const plural = itemIds.length === 1 ? "Item" : "Items";
        pushNoti((!doMove ? "Copying" : "Moving") + " " + plural.toLowerCase(), `${!doMove ? "Copying" : "Moving"} ${itemIds.length} ${plural.toLowerCase()} to "${target.name}"`, "promise", {
            promise: mutations.transferItems.mutateAsync({
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
        });
    }

    async function deleteItems(itemIds: string[]) {
        if (!selectedLibrary || !itemIds.length) return;

        await mutations.deleteItems.mutateAsync({ libraryId: selectedLibrary.id, itemIds });
        pushNoti("Items deleted", `${itemIds.length} ${itemIds.length === 1 ? "item" : "items"} have been deleted`, "success");
    }

    async function exportItems(destination: string, itemIds: string[], live: boolean, edits: boolean, adjustments: boolean) {
        if (!selectedLibrary || !itemIds.length) return;

        pushNoti("Exporting items", "Exporting " + itemIds.length + " items to \"" + pathToName(destination) + "\"", "promise", {
            promise: mutations.exportItems.mutateAsync({ libraryId: selectedLibrary.id, destination, itemIds, live, edits, adjustments }),
            peek: "Exporting items",
            success: () => ({
                title: "Items exported",
                description: itemIds.length + " items have been exported to \"" + pathToName(destination) + "\"",
            }),
            error: () => ({
                title: "Error exporting items",
                description: "An error occurred and some of the items could not be exported",
            }),
        });
    }

    async function createAlbum(name: string, parent: string | undefined, color: string, icon: string) {
        if (!selectedLibrary) return;

        return mutations.createAlbum.mutateAsync({
            libraryId: selectedLibrary.id,
            name,
            description: "",
            parent,
            color,
            icon,
        });
    }

    async function addItemsToAlbum(itemIds: string[], album: Album) {
        if (!selectedLibrary) return;

        const nItems = itemIds.length;

        pushNoti("Adding items to \"" + album.name + "\"", `Adding ${nItems} ${nItems === 1 ? "item" : "items"} to album "${album.name}"`, "promise", {
            promise: mutations.addItemsToAlbum.mutateAsync({
                libraryId: selectedLibrary.id,
                albumId: album.id,
                itemIds,
                parent: album.parent,
            }),
            peek: "Adding items",
            success: () => ({
                title: "Items added to \"" + album.name + "\"",
                description: `${nItems} ${nItems === 1 ? "item" : "items"} have been added to the album "${album.name}"`,
            }),
            error: e => ({
                title: "Error adding items to \"" + album.name + "\"",
                description: e,
            }),
        });
    }

    async function createTag(name: string, color: string) {
        if (!selectedLibrary) return;

        return mutations.createTag.mutateAsync({
            libraryId: selectedLibrary.id,
            name,
            color,
        });
    }

    async function updateTag(tagId: string, opts: { name?: string; color?: string }) {
        if (!selectedLibrary) return;

        return mutations.updateTag.mutateAsync({
            libraryId: selectedLibrary.id,
            tagId,
            name: opts.name,
            color: opts.color,
        });
    }

    async function deleteTags(tagIds: string[]) {
        if (!selectedLibrary || !tagIds.length) return;

        return mutations.deleteTags.mutateAsync({ libraryId: selectedLibrary.id, tagIds });
    }

    async function addTagsToItems(opts: { libraryId: string; itemIds: string[]; tagIds: string[] }) {
        if (!selectedLibrary) return;

        return mutations.addTagsToItems.mutateAsync({
            libraryId: selectedLibrary.id,
            itemIds: opts.itemIds,
            tagIds: opts.tagIds,
        });
    }

    async function removeTagsFromItems(opts: { libraryId: string; itemIds: string[]; tagIds: string[] }) {
        if (!selectedLibrary) return;

        return mutations.removeTagsFromItems.mutateAsync({
            libraryId: selectedLibrary.id,
            itemIds: opts.itemIds,
            tagIds: opts.tagIds,
        });
    }

    return {
        setItemsFavorite,
        transferItems,
        deleteItems,
        exportItems,
        createAlbum,
        addItemsToAlbum,
        createTag,
        updateTag,
        deleteTags,
        addTagsToItems,
        removeTagsFromItems,
    };
}