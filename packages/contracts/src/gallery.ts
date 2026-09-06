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
    liveVideoOriginalName?: string;
    rawOriginalName?: string;
    rawSize?: number;
    rawChecksum?: string;
    rawLiveVideo?: string;
    rawLiveVideoOriginalName?: string;
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

export interface TagItemsRef extends Tag {
    itemCount: number;
}

export interface ItemFileOperationSummary {
    itemCount: number;
    fileCount: number;
}

export interface ImportItem {
    sourcePath: string;
    livePath?: string | undefined;
    originalSourcePath?: string | undefined;
    originalLivePath?: string | undefined;
    adjustmentsPath?: string | undefined;
}

export interface ImportGroupingResult {
    items: ImportItem[];
    livePhotoConflicts: ImportLivePhotoConflict[];
    adjustmentConflicts: ImportAdjustmentConflict[];
}

export interface ImportLivePhotoConflict {
    itemIndex: number;
    field: "livePath" | "originalLivePath";
    candidatePaths: string[];
}

export interface ImportAdjustmentConflict {
    adjustmentPath: string;
    candidateItemIndexes: number[];
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

export interface LibraryMetadataPath extends LibraryMetadata {
    path: string;
}

export interface ItemSearchStatus {
    totalItems: number;
    indexedItems: number;
    failedItems: number;
    pendingItems: number;
    indexing: boolean;
}

export interface ItemSearchMatch {
    itemId: string;
    score: number;
}

export type FixedLengthArray<T, N extends number> = N extends N ? (number extends N ? T[] : FixedLengthArrayBuilder<T, N, []>) : never;

type FixedLengthArrayBuilder<T, N extends number, R extends T[]> = R["length"] extends N ? R : FixedLengthArrayBuilder<T, N, [...R, T]>;
