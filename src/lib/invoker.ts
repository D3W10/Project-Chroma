import { invoke } from "@tauri-apps/api/core";
import type { Library } from "./models";

export function getLibraries() {
    return invoke<Library[]>("get_libraries");
}

export function checkLibraryPath(libraryId: string) {
    return invoke<boolean>("check_library_path", { libraryId });
}