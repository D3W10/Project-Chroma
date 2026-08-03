export interface Library {
    id: string;
    name: string;
    icon: string;
    color: string;
    path: string;
}

export interface Item {
    id: string;
    originalName: string;
    extension: string;
    type: string;
    size: number;
    width: number;
    height: number;
    duration: number;
    checksum: string;
    takenDate: string;
    isFavorite: boolean;
    isScreenshot: boolean;
    isScreenRecording: boolean;
    liveVideo?: string;
    rawOriginalName?: string;
    rawSize?: number;
    rawChecksum?: string;
    rawLiveVideo?: string;
    hasAdjustments: boolean;
    createdAt: string;
}

export interface ItemAlbumRef extends Item {
    addedAt: string;
}

export interface Album {
    id: string;
    name: string;
    description: string;
    parent?: string;
    selectedCover: number;
    selectedBanner: number;
    icon?: string;
    color?: string;
    coverPhoto?: string;
    bannerPhoto?: string;
    createdAt: string;
}

export interface AlbumComp extends Album {
    size: number;
    peekThumbs: string[];
}

export interface Tag {
    id: string;
    name: string;
    color: string;
    createdAt: string;
}

export interface TagItemRef extends Tag {
    addedAt: string;
}

export interface ImportItem {
    sourcePath: string;
    livePath?: string | undefined;
    originalSourcePath?: string | undefined;
    originalLivePath?: string | undefined;
    adjustmentsPath?: string | undefined;
}

export interface ImportCandidate {
    itemsToImport: ImportItem[];
    conflicts: ConflictGroup[];
}

export interface ConflictGroup {
    originalItems: string[];
    editedItems: string[];
    originalVideos: string[];
    editedVideos: string[];
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

export type LibraryHealth = "healthy" | "outdated" | "recent";

export interface LibraryMetadata {
    name: string;
    icon: string;
    color: string;
    count: number;
    createdAt: string;
}
