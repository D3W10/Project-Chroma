import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import prepareItem, { type PrepareItemProps } from "./prepareItem.worker.ts";

describe("imported Live Photo filenames", () => {
    let root: string;
    let options: PrepareItemProps;

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(tmpdir(), "chroma-import-"));
        options = {
            importItem: { sourcePath: path.join(root, "Edited Photo.png") },
            originalsDir: path.join(root, "originals"),
            thumbsDir: path.join(root, "thumbnails"),
            adjustmentsDir: path.join(root, "adjustments"),
            deleteSource: false,
        };
        await fs.mkdir(options.originalsDir);
        await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toFile(options.importItem.sourcePath);
    });

    afterEach(async () => {
        await fs.rm(root, { recursive: true, force: true });
    });

    it("retains both original video basenames while copying to internal filenames", async () => {
        options.importItem.livePath = path.join(root, "Edited Live.MOV");
        options.importItem.originalLivePath = path.join(root, "Original Live.mov");
        await fs.writeFile(options.importItem.livePath, "edited live video");
        await fs.writeFile(options.importItem.originalLivePath, "original live video");

        const result = await prepareItem(options);
        expect(result.success).toBe(true);
        if (!result.success) throw result.error;
        expect(result.data.liveVideoOriginalName).toBe("Edited Live.MOV");
        expect(result.data.rawLiveVideoOriginalName).toBe("Original Live.mov");
        expect(await fs.readFile(path.join(options.originalsDir, result.data.liveVideo!), "utf8")).toBe("edited live video");
        expect(await fs.readFile(path.join(options.originalsDir, result.data.rawLiveVideo!), "utf8")).toBe("original live video");
    });

    it("omits video names when no companion files were copied", async () => {
        options.importItem.livePath = path.join(root, "missing.mov");
        const result = await prepareItem(options);
        expect(result.success).toBe(true);
        if (!result.success) throw result.error;
        expect(result.data.liveVideoOriginalName).toBeUndefined();
        expect(result.data.rawLiveVideoOriginalName).toBeUndefined();
    });
});
