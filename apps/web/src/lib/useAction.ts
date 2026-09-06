import { useQueryClient } from "@tanstack/react-query";
import { useLibrary } from "@/lib/useLibrary";
import { useMutationSafe } from "@/lib/useMutationSafe";
import { useNotifications } from "@/lib/useNotifications";
import { pathToName, queryKeys, unwrapResult } from "@/lib/utils";
import { isAppError, isResult, Result } from "@project-chroma/utils";
import type { Album, Item, Library } from "@project-chroma/contracts/gallery";
import type { ChromaIpcArgs, ChromaIpcMap } from "@project-chroma/contracts/ipc";

type Params<T extends keyof ChromaIpcMap> = ChromaIpcArgs<T> extends [infer TOptions] ? TOptions : never;

export function useAction() {
    const { libraries, selectedLibrary, setLibraries, selectLibraryById } = useLibrary();
    const { pushNoti } = useNotifications();
    const queryClient = useQueryClient();
    const libraryErrorNotification = (error: unknown, fallbackTitle: string, fallbackDescription: string) =>
        isAppError(error) && error.code === "library:path-conflict"
            ? {
                  title: "Library path already in use",
                  description: "Choose a location outside the path of an existing library.",
              }
            : { title: fallbackTitle, description: fallbackDescription };

    function syncItems(libraryId: string, update: (items: Item[]) => Item[]) {
        if (!libraryId) return;

        queryClient.setQueriesData({ predicate: q => q.queryKey[0] === libraryId && (q.queryKey[1] === "items" || (q.queryKey[1] === "albums" && q.queryKey[3] === "items")) }, oldData => {
            if (isResult(oldData)) {
                if (!oldData.success || !Array.isArray(oldData.data)) return oldData;

                return Result.accept([...update(oldData.data as Item[])]);
            }

            if (!Array.isArray(oldData)) return oldData;

            return [...update(oldData as Item[])];
        });
    }

    const removeLibrary = useMutationSafe({
        mutationFn: (opts: Params<"chroma:library:remove">) => window.chroma!.library.remove(opts),
        onSuccess: (_, data) => setLibraries(libraries.filter(lib => lib.id !== data.libraryId)),
    });
    const setItemsFavorite = useMutationSafe({
        mutationFn: (opts: Params<"chroma:items:set-favorite">) => window.chroma!.items.setItemsFavorite(opts),
        onSuccess: (_, vars) =>
            syncItems(vars.libraryId, items =>
                items.map(i => {
                    if (vars.itemIds.includes(i.id)) return { ...i, isFavorite: vars.value };
                    return i;
                }),
            ),
    });
    const transferItems = useMutationSafe({
        mutationFn: (opts: { sourceId: string; targetId: string; itemIds: string[]; doMove: boolean }) =>
            window.chroma!.items.transferItems({
                sourceId: opts.sourceId,
                targetId: opts.targetId,
                itemIds: opts.itemIds,
                doMove: opts.doMove,
            }),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.items(vars.targetId) });
            if (vars.doMove) syncItems(vars.sourceId, items => items.filter(item => !vars.itemIds.includes(item.id)));
        },
    });
    const exportItems = useMutationSafe({
        mutationFn: (opts: Params<"chroma:items:export">) => window.chroma!.items.exportItems(opts),
    });
    const deleteItems = useMutationSafe({
        mutationFn: (opts: Params<"chroma:items:delete">) => window.chroma!.items.deleteItems(opts),
        onSuccess: (_, vars) => syncItems(vars.libraryId, items => items.filter(item => !vars.itemIds.includes(item.id))),
    });
    const createAlbum = useMutationSafe({
        mutationFn: (opts: Params<"chroma:albums:create">) => window.chroma!.albums.create(opts),
        onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: queryKeys.albums(vars.libraryId, vars.album.parent) }),
    });
    const addItemsToAlbum = useMutationSafe({
        mutationFn: (opts: Params<"chroma:albums:add-items">) =>
            window.chroma!.albums.addItems({
                libraryId: opts.libraryId,
                albumId: opts.albumId,
                itemIds: opts.itemIds,
            }),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.albumItems(vars.libraryId, vars.albumId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.albums(vars.libraryId, vars.parent) });
        },
    });
    const createTag = useMutationSafe({
        mutationFn: (opts: { libraryId: string; name: string; color: string }) => window.chroma!.tags.create(opts),
        onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: queryKeys.tags(vars.libraryId) }),
    });
    const updateTag = useMutationSafe({
        mutationFn: (opts: { libraryId: string; tagId: string; name?: string; color?: string }) => window.chroma!.tags.update(opts),
        onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: queryKeys.tags(vars.libraryId) }),
    });
    const deleteTags = useMutationSafe({
        mutationFn: (opts: { libraryId: string; tagIds: string[] }) => window.chroma!.tags.delete(opts),
        onSuccess: (_, vars) => queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === vars.libraryId && q.queryKey.includes("tags") }),
    });
    const setTagsOnItems = useMutationSafe({
        mutationFn: (opts: Params<"chroma:tags:set-on-items">) => window.chroma!.tags.setOnItems(opts),
        onSuccess: (_, vars) => queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === vars.libraryId && q.queryKey[1] === "items" && q.queryKey[3] === "tags" }),
    });

    return {
        createLibrary: (name: string, icon: string, color: string, path: string, onSuccess?: () => void) => {
            if (!window.chroma) return;

            pushNoti({
                title: "Creating library",
                description: `Library "${name}" is being created...`,
                type: "promise",
                promise: unwrapResult(window.chroma.library.create({ name, icon, color, path })),
                peek: "Creating library",
                success: () => ({
                    title: "Library created",
                    description: `The library "${name}" was created successfully!`,
                }),
                error: error => libraryErrorNotification(error, "Error creating library", "An error occurred while creating the library"),
                onSuccess: async d => {
                    await selectLibraryById(d.id);
                    onSuccess?.();
                },
            });
        },
        addLibrary: (name: string, path: string, onSuccess?: () => void, onError?: () => void) => {
            if (!window.chroma) return;

            pushNoti({
                title: "Adding library",
                description: `Library "${name}" is being added...`,
                type: "promise",
                promise: unwrapResult(window.chroma.library.add({ path })),
                peek: "Adding library",
                success: () => ({
                    title: "Library added",
                    description: `The library "${name}" was added successfully!`,
                }),
                error: error => libraryErrorNotification(error, "Error adding library", "An error occurred while adding the library"),
                onError,
                onSuccess: async d => {
                    await selectLibraryById(d.id);
                    onSuccess?.();
                },
            });
        },
        removeLibrary: async (libraryId: string) => {
            await removeLibrary.mutateAsync({ libraryId });

            const idx = libraries.findIndex(lib => lib.id === libraryId);
            const rest = libraries.filter(lib => lib.id !== libraryId);

            setLibraries(rest);
            await selectLibraryById(rest.length >= idx + 1 ? rest[idx].id : rest.length > 0 ? rest[idx - 1].id : null);
        },
        setItemsFavorite: (itemIds: string[], value: boolean) => {
            if (!selectedLibrary || !itemIds.length) return;
            return setItemsFavorite.mutateAsync({ libraryId: selectedLibrary.id, itemIds, value });
        },
        transferItems: (target: Library, itemIds: string[], doMove: boolean) => {
            if (!selectedLibrary) return;

            const plural = itemIds.length === 1 ? "Item" : "Items";
            pushNoti({
                title: (!doMove ? "Copying" : "Moving") + " " + plural.toLowerCase(),
                description: `${!doMove ? "Copying" : "Moving"} ${itemIds.length} ${plural.toLowerCase()} to "${target.name}"`,
                type: "promise",
                promise: transferItems.mutateAsync({
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
                error: error => ({
                    title: isAppError(error) ? error.title : "Transfer failed",
                    description: isAppError(error) ? (error.message ?? `Unable to ${!doMove ? "copy" : "move"} the selected items.`) : `Unable to ${!doMove ? "copy" : "move"} the selected items to the target library`,
                }),
            });
        },
        exportItems: (destination: string, itemIds: string[], live: boolean, edits: boolean, adjustments: boolean, nameByTakenDate: boolean, dateFormat: string) => {
            if (!selectedLibrary || !itemIds.length) return;
            pushNoti({
                title: "Exporting items",
                description: "Exporting " + itemIds.length + ' items to "' + pathToName(destination) + '"',
                type: "promise",
                promise: exportItems.mutateAsync({ libraryId: selectedLibrary.id, destination, itemIds, live, edits, adjustments, nameByTakenDate, dateFormat }),
                peek: "Exporting items",
                success: () => ({
                    title: "Items exported",
                    description: itemIds.length + ' items have been exported to "' + pathToName(destination) + '"',
                }),
                error: error => ({
                    title: isAppError(error) ? error.title : "Error exporting items",
                    description: isAppError(error) ? (error.message ?? "The selected items could not be exported.") : "An error occurred and the selected items could not be exported",
                }),
            });
        },
        deleteItems: (itemIds: string[]) => {
            if (!selectedLibrary || !itemIds.length) return;
            pushNoti({
                title: "Deleting items",
                description: `Deleting ${itemIds.length} ${itemIds.length === 1 ? "item" : "items"}`,
                type: "promise",
                promise: deleteItems.mutateAsync({ libraryId: selectedLibrary.id, itemIds }),
                peek: "Deleting " + (itemIds.length === 1 ? "item" : "items"),
                success: () => ({
                    title: (itemIds.length === 1 ? "Item" : "Items") + " deleted",
                    description: `${itemIds.length} ${itemIds.length === 1 ? "item" : "items"} have been deleted`,
                }),
                error: () => ({
                    title: "Delete failed",
                    description: "Unable to delete the selected items",
                }),
            });
        },
        createAlbum: (album: Omit<Album, "id">) => {
            if (!selectedLibrary) return;
            return createAlbum.mutateAsync({
                libraryId: selectedLibrary.id,
                album,
            });
        },
        addItemsToAlbum: (itemIds: string[], album: Album) => {
            if (!selectedLibrary) return;
            pushNoti({
                title: 'Adding items to "' + album.name + '"',
                description: `Adding ${itemIds.length} ${itemIds.length === 1 ? "item" : "items"} to album "${album.name}"`,
                type: "promise",
                promise: addItemsToAlbum.mutateAsync({
                    libraryId: selectedLibrary.id,
                    albumId: album.id,
                    itemIds,
                    parent: album.parent,
                }),
                peek: "Adding items",
                success: () => ({
                    title: 'Items added to "' + album.name + '"',
                    description: `${itemIds.length} ${itemIds.length === 1 ? "item" : "items"} have been added to the album "${album.name}"`,
                }),
                error: e => ({
                    title: 'Error adding items to "' + album.name + '"',
                    description: e,
                }),
            });
        },
        createTag: (name: string, color: string) => {
            if (!selectedLibrary) return;
            return createTag.mutateAsync({
                libraryId: selectedLibrary.id,
                name,
                color,
            });
        },
        updateTag: (tagId: string, opts: { name?: string; color?: string }) => {
            if (!selectedLibrary) return;
            return updateTag.mutateAsync({
                libraryId: selectedLibrary.id,
                tagId,
                name: opts.name,
                color: opts.color,
            });
        },
        deleteTags: (tagIds: string[]) => {
            if (!selectedLibrary || !tagIds.length) return;
            return deleteTags.mutateAsync({ libraryId: selectedLibrary.id, tagIds });
        },
        setTagsOnItems: (itemIds: string[], tagIds: string[], assigned: boolean) => {
            if (!selectedLibrary) return;
            return setTagsOnItems.mutateAsync({
                libraryId: selectedLibrary.id,
                itemIds,
                tagIds,
                assigned,
            });
        },
    };
}
