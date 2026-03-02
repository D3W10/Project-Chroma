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
    taken_date: string;
    is_favorite: boolean;
    is_screenshot: boolean;
    is_screen_recording: boolean;
    live_video?: string;
    raw_original_name?: string;
    raw_file_size?: number;
    raw_checksum?: string;
    raw_live_video?: string;
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
    parent?: string;
    selected_cover: number;
    selected_banner: number;
    icon?: string;
    color?: string;
    cover_photo?: string;
    banner_photo?: string;
    created_at: string;
}

export interface AlbumComp extends Album {
    size: number;
    peek_thumbs: string[];
}

export interface Tag {
    id: string;
    name: string;
    color: string;
    created_at: string;
}

export interface TagItemRef extends Tag {
    added_at: string;
}

export interface ImportItem {
    source_path: string;
    live_path?: string;
    original_source_path?: string;
    original_live_path?: string;
    adjustments_path?: string;
}

export interface ImportCandidate {
    items_to_import: ImportItem[];
    conflicts: Group[];
}

export interface Group {
    original_items: string[];
    edited_items: string[];
    original_videos: string[];
    edited_videos: string[];
    adjustments?: string;
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
    importOptions: {
        livePhotos: boolean;
        edits: boolean;
    };
    exportOptions: {
        livePhotos: boolean;
        edits: boolean;
        adjustments: boolean;
    };
};

export interface LibraryDetails {
    name: string;
    icon: string;
    color: string;
    count: number;
}

export interface LibraryDetailsPath extends LibraryDetails {
    path: string;
}

export const appColors = ["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "blue", "sky", "dark-blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];
export const gridSizes = ["grid-cols-3", "grid-cols-5", "grid-cols-7", "grid-cols-9"];
export const gridSizesNum = [3, 5, 7, 9];