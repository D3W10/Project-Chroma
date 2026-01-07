import { invoke } from "@tauri-apps/api/core";
import { tryCatch } from "./utils";
import type { Library, Item, Album, ImportItem, ImportCandidate } from "./models";

export function getLibraries() {
    return tryCatch(() => invoke<Library[]>("get_libraries"));
}

export function createLibrary(opts: { name: string; icon: string; color: string; path: string }) {
    return tryCatch(() => invoke<Library>("create_library", opts));
}

export function checkLibraryPath(opts: { libraryId: string }) {
    return tryCatch(() => invoke<boolean>("check_library_path", opts));
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

export function getItems(opts: { libraryId: string }) {
    return tryCatch(() => invoke<Item[]>("get_items", opts));
}

export function verifyConflicts(opts: { sourcePaths: string[] }) {
    return tryCatch(() => invoke<ImportCandidate>("verify_conflicts", opts));
}

export function addItems(opts: { libraryId: string; items: ImportItem[]; deleteSource: boolean }) {
    return tryCatch(() => invoke<Item[]>("add_items", opts));
}

export function deleteItems(opts: { libraryId: string; itemIds: string[] }) {
    return tryCatch(() => invoke("delete_items", opts));
}

export function setItemsFavorite(opts: { libraryId: string; itemIds: string[]; value: boolean }) {
    return tryCatch(() => invoke("set_items_favorite", opts));
}

export function addPhotoToAlbum(opts: { libraryId: string; albumId: string; photoId: string }) {
    return tryCatch(() => invoke("add_photo_to_album", opts));
}