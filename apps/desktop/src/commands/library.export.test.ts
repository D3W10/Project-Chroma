import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultChromaConfig } from "@project-chroma/contracts/config";
import { ipc, type ChromaIpcHandler } from "@project-chroma/contracts/ipc";
import { Result } from "@project-chroma/utils";
import { registerHandle } from "./ipc.ts";
import { registerLibraryCommands } from "./library.ts";
import * as DB from "../db/index.ts";
import type { Item } from "@project-chroma/contracts/gallery";
import type { ConfigStore } from "../lib/config.ts";

vi.mock("./ipc.ts", () => ({ registerHandle: vi.fn() }));
vi.mock("../db/index.ts", () => ({ withDatabase: vi.fn() }));
vi.mock("../lib/search.ts", () => ({ createSearchService: () => ({}) }));

describe("export filenames", () => {
    let root: string;
    let destination: string;
    let exportItems: ChromaIpcHandler<Electron.IpcMainInvokeEvent, typeof ipc.ITEMS_EXPORT>;

    beforeEach(async () => {
        vi.clearAllMocks();
        root = await fs.mkdtemp(path.join(tmpdir(), "chroma-export-"));
        destination = path.join(root, "export");
        const libraryPath = path.join(root, "library");
        await fs.mkdir(path.join(libraryPath, "originals"), { recursive: true });
        await fs.mkdir(path.join(libraryPath, "adjustments"));
        await fs.mkdir(destination);
        const item: Item = {
            id: "photo", originalName: "Photo.jpg", extension: "jpg", type: "image/jpeg",
            size: 1, width: 1, height: 1, duration: 0, checksum: "test",
            takenDate: new Date(2026, 8, 5, 14, 7, 9).toISOString(),
            isFavorite: false, isScreenshot: false, isScreenRecording: false,
            liveVideo: "photo.mov", liveVideoOriginalName: "Live.mov",
            rawOriginalName: "Original.jpg", rawLiveVideo: "photo-raw.mov", rawLiveVideoOriginalName: "Original Live.mov",
            hasAdjustments: true, createdAt: new Date().toISOString(),
        };
        for (const name of ["photo.jpg", "photo.mov", "photo-raw.jpg", "photo-raw.mov"]) {
            await fs.writeFile(path.join(libraryPath, "originals", name), name);
        }
        await fs.writeFile(path.join(libraryPath, "adjustments", "photo.AAE"), "adjustments");
        vi.mocked(DB.withDatabase).mockReturnValue(Result.accept([item]));
        const config = {
            get: async () => ({ ...defaultChromaConfig, libraries: [{ id: "library", path: libraryPath, name: "Library", icon: "", color: "" }] }),
        } as ConfigStore;
        registerLibraryCommands({} as Electron.App, config);
        exportItems = vi.mocked(registerHandle).mock.calls.find(([channel]) => channel === ipc.ITEMS_EXPORT)![1] as typeof exportItems;
    });

    afterEach(async () => {
        await fs.rm(root, { recursive: true, force: true });
    });

    it("uses one collision suffix for the photo, live videos, original, and adjustments", async () => {
        await fs.writeFile(path.join(destination, "2026-09-05 14.07.09.jpg"), "existing file");
        const result = await exportItems({} as Electron.IpcMainInvokeEvent, {
            libraryId: "library", destination, itemIds: ["photo"], live: true, edits: true, adjustments: true, nameByTakenDate: true, dateFormat: "",
        });
        expect(result).toEqual({ itemCount: 1, fileCount: 5 });
        expect((await fs.readdir(destination)).sort()).toEqual([
            "2026-09-05 14.07.09 (1)-orig.jpg", "2026-09-05 14.07.09 (1)-orig.mov",
            "2026-09-05 14.07.09 (1).aae", "2026-09-05 14.07.09 (1).jpg", "2026-09-05 14.07.09 (1).mov",
            "2026-09-05 14.07.09.jpg",
        ]);
        expect(await fs.readFile(path.join(destination, "2026-09-05 14.07.09.jpg"), "utf8")).toBe("existing file");
        expect(await fs.readFile(path.join(destination, "2026-09-05 14.07.09 (1)-orig.jpg"), "utf8")).toBe("photo-raw.jpg");
    });

    it.each([[false, "Photo.jpg"], [true, "05-09-2026.jpg"]])("honors the date naming toggle: %s", async (nameByTakenDate, filename) => {
        const result = await exportItems({} as Electron.IpcMainInvokeEvent, {
            libraryId: "library", destination, itemIds: ["photo"], live: false, edits: false, adjustments: false, nameByTakenDate, dateFormat: "dd-MM-yyyy",
        });
        expect(result).toEqual({ itemCount: 1, fileCount: 1 });
        expect(await fs.readdir(destination)).toEqual([filename]);
    });
});
