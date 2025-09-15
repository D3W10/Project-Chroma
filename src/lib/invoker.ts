import { invoke } from "@tauri-apps/api/core";
import { tryCatch } from "./utils";
import type { Library } from "./models";

export function getLibraries() {
    return tryCatch(() => invoke<Library[]>("get_libraries"));
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