import type { Library } from "./gallery.ts";

export const DEFAULT_EXPORT_DATE_FORMAT = "yyyy-MM-dd HH.mm.ss";

export interface ChromaConfig {
    libraries: Library[];
    selected_library: string | null;
    settings: ChromaSettings;
}

export interface ChromaSettings {
    configured: boolean;
    theme: "dark" | "light";
    accentColor: string;
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
        nameByTakenDate: boolean;
        dateFormat: string;
    };
}

export const defaultChromaConfig = {
    libraries: [],
    selected_library: null,
    settings: {
        configured: false,
        theme: "dark",
        accentColor: "skyaqua",
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
            nameByTakenDate: false,
            dateFormat: DEFAULT_EXPORT_DATE_FORMAT,
        },
    },
} satisfies ChromaConfig;
