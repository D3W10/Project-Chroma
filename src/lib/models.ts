export interface Library {
    id: string;
    name: string;
    icon: string;
    color: string;
    path: string;
}

export interface Photo {
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
    created_at: string;
}