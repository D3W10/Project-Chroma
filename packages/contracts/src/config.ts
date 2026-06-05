import type { Library } from "./gallery.ts";

export interface ChromaConfig {
    libraries: Library[];
    selected_library: string | null;
    settings: ChromaSettings;
}

export interface ChromaSettings {
    configured: boolean;
    theme: "dark" | "light";
    accentColor: number;
    libraryZoom: number;
    libraryExpanded: boolean;
    searchEnabled: boolean;
    importOptions: {
        livePhotos: boolean;
        edits: boolean;
    };
    exportOptions: {
        livePhotos: boolean;
        edits: boolean;
        adjustments: boolean;
    };
}

export const defaultChromaConfig = {
    libraries: [],
    selected_library: null,
    settings: {
        configured: false,
        theme: "dark",
        accentColor: 8,
        libraryZoom: 2,
        libraryExpanded: false,
        searchEnabled: false,
        importOptions: {
            livePhotos: false,
            edits: false,
        },
        exportOptions: {
            livePhotos: false,
            edits: false,
            adjustments: false,
        },
    },
} satisfies ChromaConfig;
