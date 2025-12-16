import { invoke } from "@tauri-apps/api/core";
import { tryCatch } from "./utils";
import type { Library, Item } from "./models";

export function getLibraries() {
    return tryCatch(() => invoke<Library[]>("get_libraries"));
}

export function createLibrary(name: string, icon: string, color: string, path: string) {
    return tryCatch(() => invoke<Library>("create_library", { name, icon, color, path }));
}

export function checkLibraryPath(libraryId: string) {
    return tryCatch(() => invoke<boolean>("check_library_path", { libraryId }));
}

export function updateLibraryPath(libraryId: string, newPath: string) {
    return tryCatch(() => invoke("update_library_path", { libraryId, newPath }));
}

export function removeLibrary(libraryId: string) {
    return tryCatch(() => invoke("remove_library", { libraryId }));
}

export function getSelectedLibrary() {
    return tryCatch(() => invoke<string | null>("get_selected_library"));
}

export function setSelectedLibrary(libraryId: string | null) {
    return tryCatch(() => invoke("set_selected_library", { libraryId }));
}

export function getItems(libraryId: string) {
    return tryCatch(() => invoke<Item[]>("get_items", { libraryId }));
}

export function addItems(libraryId: string, sourcePaths: string[], deleteSource: boolean) {
    return tryCatch(() => invoke<Item[]>("add_items", { libraryId, sourcePaths, deleteSource }));
}

export function setItemsFavorite(libraryId: string, itemIds: string[], value: boolean) {
    return tryCatch(() => invoke("set_items_favorite", { libraryId, itemIds, value }));
}