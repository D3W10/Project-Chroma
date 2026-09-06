import type { Album, Item } from "@project-chroma/contracts/gallery";

type CompleteKeys<T, K extends readonly (keyof T)[]> = Exclude<keyof T, K[number]> extends never ? K : never;

export function keysOf<T>() {
    return <const K extends readonly (keyof T)[]>(keys: K & CompleteKeys<T, K>) => keys;
}

const itemProperties = keysOf<Item>()([
    "id",
    "originalName",
    "extension",
    "type",
    "size",
    "width",
    "height",
    "duration",
    "checksum",
    "takenDate",
    "isFavorite",
    "isScreenshot",
    "isScreenRecording",
    "liveVideo",
    "liveVideoOriginalName",
    "rawOriginalName",
    "rawSize",
    "rawChecksum",
    "rawLiveVideo",
    "rawLiveVideoOriginalName",
    "hasAdjustments",
    "createdAt",
]);

const albumProperties = keysOf<Album>()(["id", "name", "description", "parent", "selectedCover", "selectedBanner", "icon", "color", "coverPhoto", "bannerPhoto", "createdAt"]);

type PropertyValues<T extends object, K extends readonly string[]> = T & {
    [P in K[number]]-?: P extends keyof T ? T[P] | undefined : undefined;
};

function setProperties<T extends object, K extends readonly string[]>(item: T, properties: K): PropertyValues<T, K> {
    const result = { ...item } as Record<string, unknown>;

    for (const property of properties) {
        result[property] = item[property as keyof T];
    }

    return result as PropertyValues<T, K>;
}

export function ensureItemProps<T extends object>(item: T): PropertyValues<T, typeof itemProperties> {
    return setProperties(item, itemProperties);
}

export function ensureAlbumProps<T extends object>(album: T): PropertyValues<T, typeof albumProperties> {
    return setProperties(album, albumProperties);
}
