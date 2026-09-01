import type { Item } from "@project-chroma/contracts/gallery";
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
    itemTags: (libraryId?: string, itemId?: string) => [libraryId, "items", itemId, "tags"] as const,
    itemSearchStatus: (libraryId?: string) => [libraryId, "item-search-status"] as const,
    itemSearchResults: (libraryId?: string, query?: string) => [libraryId, "item-search-results", query] as const,
};


export const getThumbPath = (item: string, path: string | undefined) => window.chroma?.fileUrl(path + "/thumbnails/" + item + ".webp") ?? "";
export const getOriginalPath = (item: Item, path: string | undefined) => window.chroma?.fileUrl(path + "/originals/" + item.id + "." + item.extension) ?? "";
