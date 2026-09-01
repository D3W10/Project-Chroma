import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export * from "@project-chroma/core";
export * from "./result.ts";
export * from "./errors.ts";
export * from "./objects.ts";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function rollbackStack() {
    const stack: (() => Promise<void>)[] = [];

    return {
        push: (roll: () => Promise<void>) => stack.push(roll),
        async revert() {
            for (const roll of stack.reverse()) await roll();
        },
    };
}

export function extToMime(ext: string) {
    const mapper: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        heic: "image/heic",
        heif: "image/heic",
        mp4: "video/mp4",
        mov: "video/quicktime",
        avi: "video/x-msvideo",
    };

    return mapper[ext.toLowerCase()] ?? "application/octet-stream";
}

export function uint8ToBase64(bytes: Uint8Array) {
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join("");
    return btoa(binary);
}

export const appColors = [
    { name: "red", color: "--color-red-500" },
    { name: "orange", color: "--color-orange-500" },
    { name: "amber", color: "--color-amber-500" },
    { name: "yellow", color: "--color-yellow-500" },
    { name: "lime", color: "--color-lime-500" },
    { name: "green", color: "--color-green-500" },
    { name: "emerald", color: "--color-emerald-500" },
    { name: "teal", color: "--color-teal-500" },
    { name: "skyaqua", color: "--color-sky-aqua" },
    { name: "blue", color: "--color-blue-500" },
    { name: "indigo", color: "--color-indigo-500" },
    { name: "violet", color: "--color-violet-500" },
    { name: "purple", color: "--color-purple-500" },
    { name: "fuchsia", color: "--color-fuchsia-500" },
    { name: "pink", color: "--color-pink-500" },
    { name: "rose", color: "--color-rose-500" },
    { name: "slate", color: "--color-slate-500" },
    { name: "stone", color: "--color-stone-500" },
] as const;
export const gridSizes = ["grid-cols-3", "grid-cols-5", "grid-cols-7", "grid-cols-9"] as const;
export const gridSizesNum = [3, 5, 7, 9] as const;
