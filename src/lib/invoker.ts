import { invoke } from "@tauri-apps/api/core";
import { tryCatch } from "./utils";
import type { Album, AlbumComp, ImportItem, ImportCandidate, Item, ItemAlbumRef, Library, Settings, LibraryDetails } from "./models";

export function getLibraries() {
    return tryCatch(() => invoke<Library[]>("get_libraries"));
}

export function updateLibraryPath(opts: { libraryId: string; newPath: string }) {
    return tryCatch(() => invoke("update_library_path", opts));
}

export function removeLibrary(opts: { libraryId: string }) {
    return tryCatch(() => invoke("remove_library", opts));
}

export function getSelectedLibrary() {
    return tryCatch(() => invoke<string | null>("get_selected_library"));
}

export function setSelectedLibrary(opts: { libraryId: string | null }) {
    return tryCatch(() => invoke("set_selected_library", opts));
}

export function getSettings() {
    return tryCatch(() => invoke<Settings>("get_settings"));
}

export function setSettings(opts: { settings: Settings }) {
    return tryCatch(() => invoke("set_settings", opts));
}

export function checkLibraryHealth(opts: { libraryId: string }) {
    return tryCatch(() => invoke<boolean>("check_library_health", opts));
}

export function upgradeLibrary(opts: { libraryId: string }) {
    return tryCatch(() => invoke<boolean>("upgrade_library", opts));
}

export function createLibrary(opts: { name: string; icon: string; color: string; path: string }) {
    return tryCatch(() => invoke<Library>("create_library", opts));
}

export function getLibraryInfoFromPath(opts: { path: string }) {
    return tryCatch(() => invoke<LibraryDetails>("get_library_info_from_path", opts));
}

export function addLibrary(opts: { path: string }) {
    return tryCatch(() => invoke<Library>("add_library", opts));
}

export function getItems(opts: { libraryId: string }) {
    return tryCatch(() => invoke<Item[]>("get_items", opts));
}

export function verifyConflicts(opts: { sourcePaths: string[]; checkLivePhotos: boolean; parseEdits: boolean }) {
    return tryCatch(() => invoke<ImportCandidate>("verify_conflicts", opts));
}

export function addItems(opts: { libraryId: string; items: ImportItem[]; deleteSource: boolean }) {
    return tryCatch(() => invoke<Item[]>("add_items", opts));
}

export function setItemsFavorite(opts: { libraryId: string; itemIds: string[]; value: boolean }) {
    return tryCatch(() => invoke("set_items_favorite", opts));
}

export function transferItems(opts: { sourceId: string; targetId: string; itemIds: string[]; doMove?: boolean }) {
    return tryCatch(() => invoke("transfer_items", opts));
}

export function deleteItems(opts: { libraryId: string; itemIds: string[] }) {
    return tryCatch(() => invoke("delete_items", opts));
}

export function getAlbums(opts: { libraryId: string; parent?: string }) {
    return tryCatch(() => invoke<AlbumComp[]>("get_albums", opts));
}

export function createAlbum(opts: { libraryId: string; name: string; description?: string; parent?: string; color: string; icon: string }) {
    return tryCatch(() => invoke<Album>("create_album", opts));
}

export function addItemsToAlbum(opts: { libraryId: string; albumId: string; itemIds: string[] }) {
    return tryCatch(() => invoke("add_items_to_album", opts));
}

export function removeItemsFromAlbum(opts: { libraryId: string; albumId: string; itemIds: string[] }) {
    return tryCatch(() => invoke("remove_items_from_album", opts));
}

export function getAlbumItems(opts: { libraryId: string; albumId: string }) {
    return tryCatch(() => invoke<ItemAlbumRef[]>("get_album_items", opts));
}