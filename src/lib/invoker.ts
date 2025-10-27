import { invoke } from "@tauri-apps/api/core";
import { tryCatch } from "./utils";
import type { Library, Photo } from "./models";

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

export function getPhotos(libraryId: string) {
    return tryCatch(() => invoke<Photo[]>("get_photos", { libraryId }));
}

export function addPhoto(libraryId: string, sourcePath: string) {
    return tryCatch(() => invoke("add_photo", { libraryId, sourcePath }));
}