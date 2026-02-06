import { useQueryClient } from "@tanstack/react-query";
import * as invoke from "@/lib/invoker";
import { useLibrary } from "@/lib/useLibrary";
import { useNotifications } from "@/lib/useNotifications";
import type { Album } from "@/lib/models";

export function useAction() {
    const { selectedLibrary } = useLibrary();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();

    async function setItemsFavorite(itemIds: string[], value: boolean) {
        if (!selectedLibrary) return;

        await invoke.setItemsFavorite({ libraryId: selectedLibrary.id, itemIds, value });
        queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "items"] });
    }

    async function deleteItems(itemIds: string[]) {
        if (!selectedLibrary || !itemIds.length) return;

        await invoke.deleteItems({ libraryId: selectedLibrary.id, itemIds });
        queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "items"] });
        pushNoti("Items deleted", `${itemIds.length} items have been deleted`, "success");
    }

    async function addItemsToAlbum(itemIds: string[], album: Album) {
        if (!selectedLibrary) return;

        const nItems = itemIds.length;

        pushNoti("Adding items to \"" + album.name + "\"", `Adding ${nItems} items to album "${album.name}"`, "success", {
            promise: invoke.addItemsToAlbum({ libraryId: selectedLibrary.id, albumId: album.id, itemIds }),
            peek: "Adding items",
            success: () => ({
                title: "Items added to \"" + album.name + "\"",
                description: nItems + "items have been added to the album \"" + album.name + "\"",
            }),
            error: e => ({
                title: "Error adding items to \"" + album.name + "\"",
                description: e,
            }),
            onSuccess: () => queryClient.invalidateQueries({ queryKey: [selectedLibrary.id, "albums"] }),
        });
    }

    return {
        setItemsFavorite,
        deleteItems,
        addItemsToAlbum,
    };
}