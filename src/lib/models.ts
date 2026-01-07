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
    checksum: string;
    is_favorite: boolean;
    is_screenshot: boolean;
    is_screen_recording: boolean;
    live_video?: string;
    created_at: string;
}

export interface Album {
    id: string;
    name: string;
    description: string | null;
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