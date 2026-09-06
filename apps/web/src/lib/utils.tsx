import type { Easing } from "motion/react";
import type { Item } from "@project-chroma/contracts/gallery";
import type { Result } from "@project-chroma/utils";

export const QUICK_EASE: Easing = [0.22, 1, 0.36, 1];

export function unwrapResult<T, E = string>(result: Result<T, E> | Promise<Result<T, E>>): Promise<T> {
    return new Promise<T>((resolve, reject) =>
        Promise.resolve(result).then(e => {
            if (e.success) resolve(e.data);
            else reject(e.error);
        }),
    );
}

export function isValidColor(color: string) {
    document.head.style.color = color;
    const isValid = document.head.style.color;
    document.head.removeAttribute("style");

    return !!isValid;
}

export const pathToName = (p: string) => /[^\\/]+(?=[/|\\]?$)/g.exec(p)?.[0] || "";
export const pathToStem = (p: string) => /([^/\\]+?)(?:\.[^.]*$|$)/g.exec(p)?.[1] || "";
export const formatDuration = (d: number) => {
    const totalSeconds = Math.ceil(d);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const queryKeys = {
    libraryHealth: (libraryId?: string) => [libraryId, "library-health"] as const,
    items: (libraryId?: string) => [libraryId, "items"] as const,
    albums: (libraryId?: string, parent?: string | null) => [libraryId, "albums", parent] as const,
    albumItems: (libraryId?: string, albumId?: string) => [libraryId, "albums", albumId, "items"] as const,
    tags: (libraryId?: string) => [libraryId, "tags"] as const,
    itemTags: (libraryId?: string, itemIds: readonly string[] = []) => [libraryId, "items", [...itemIds].sort(), "tags"] as const,
    itemSearchStatus: (libraryId?: string) => [libraryId, "item-search-status"] as const,
    itemSearchResults: (libraryId?: string, query?: string) => [libraryId, "item-search-results", query] as const,
};

export function refreshSelectionData<T extends { id: string }>(items: T[], setSelected: (a: T[] | ((prev: T[]) => T[])) => unknown) {
    if (items.length === 0) {
        setSelected([]);
        return;
    }

    const itemMap = new Map(items.map(item => [item.id, item]));
    setSelected(prev => prev.map(p => itemMap.get(p.id)).filter(p => !!p));
}

export const getThumbPath = (item: string, path: string | undefined) => window.chroma?.fileUrl(path + "/thumbnails/" + item + ".webp") ?? "";
export const getOriginalPath = (item: Item, path: string | undefined) => window.chroma?.fileUrl(path + "/originals/" + item.id + "." + item.extension) ?? "";
