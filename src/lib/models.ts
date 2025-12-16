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

export interface Notification {
    id: string;
    title: string;
    description?: string;
    type: NotificationType;
    peek?: string;
    timestamp: Date;
    progress?: number;
}

export type NotificationType = "info" | "success" | "error" | "warning" | "promise";