export interface Library {
    id: string;
    name: string;
    icon: string;
    color: string;
    path: string;
}

export interface Item {
    id: string;
    original_name: string;
    file_ext: string;
    file_type: string;
    file_size: number;
    width: number;
    height: number;
    duration: number;
    checksum: string;
    is_favorite: boolean;
    is_screenshot: boolean;
    is_screen_recording: boolean;
    live_video?: string;
    raw_original_name?: string;
    raw_file_size?: number;
    raw_checksum?: string;
    has_adjustments: boolean;
    created_at: string;
}

export interface ItemAlbumRef extends Item {
    added_at: string;
}

export interface Album {
    id: string;
    name: string;
    description: string;
    parent: string | null;
    selected_cover: number;
    icon: string | null;
    color: string | null;
    cover_photo: string | null;
    created_at: string;
}

export interface ImportItem {
    source_path: string;
    live_video_path: string | null;
    original_source_path?: string;
    original_live_video_path?: string;
    aae_record_path?: string;
}

export interface ImportCandidate {
    items_to_import: ImportItem[];
    conflicts: Conflict[];
}

export interface Conflict {
    photo_path: string;
    video_candidates: string[];
}

export interface Notification {
    id: string;
    title: string;
    description?: string;
    type: NotificationType;
    peek?: string;
    timestamp: Date;
    hasProgress?: boolean;
    progress: number;
}

export type NotificationType = "info" | "success" | "error" | "warning" | "promise";

export type Settings = {
    theme: "dark" | "light";
    accentColor: number;
    libraryZoom: number;
    libraryExpanded: boolean;
    albumLayout: "card" | "grid" | "list";
    importOptions: {
        livePhotos: boolean;
        edits: boolean;
    };
};

export const appColors = ["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "blue", "sky", "dark-blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];