import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { Errors, extToMime, Result, rollbackStack, type AppError } from "@project-chroma/utils";
import { generateImageThumbnail, generateVideoThumbnail, getVideoMetadata } from "../commands/utils.ts";
import type { ImportItem, Item } from "@project-chroma/contracts/gallery";

export interface PrepareItemProps {
    importItem: ImportItem;
    originalsDir: string;
    thumbsDir: string;
    adjustmentsDir: string;
    deleteSource: boolean;
}

export default async function prepareItem({ importItem, originalsDir, thumbsDir, adjustmentsDir, deleteSource }: PrepareItemProps): Promise<Result<Item, AppError>> {
    const rollback = rollbackStack();

    if (!fsSync.existsSync(importItem.sourcePath)) {
        return Result.reject(Errors.missingSource({ details: { sourcePath: importItem.sourcePath } }));
    }

    const originalName = path.basename(importItem.sourcePath);
    const fileExtension = path.extname(importItem.sourcePath).replace(".", "");
    const fileType = extToMime(fileExtension);

    let fileData: Buffer;
    try {
        fileData = await fs.readFile(importItem.sourcePath);
    } catch (e) {
        return Result.reject(Errors.itemReadFail({ error: e, details: { sourcePath: importItem.sourcePath } }));
    }

    const checksum = crypto.createHash("md5").update(fileData).digest("hex");
    const fileSize = fileData.length;
    const itemId = uuidv4();
    const fileName = `${itemId}.${fileExtension}`;
    const destPath = path.join(originalsDir, fileName);

    try {
        await fs.copyFile(importItem.sourcePath, destPath);
        rollback.push(() => fs.unlink(destPath));
    } catch (e) {
        rollback.revert();
        return Result.reject(Errors.itemCopyFail({ error: e }));
    }

    let width: number;
    let height: number;
    let duration = 0;
    let takenDate = new Date();
    const thumbPath = path.join(thumbsDir, `${itemId}.webp`);

    try {
        const stats = await fs.stat(importItem.sourcePath);
        takenDate = stats.birthtime || stats.mtime || takenDate;
    } catch {}

    try {
        if (!fileType.startsWith("video/")) {
            const image = sharp(fileData);
            const { width: w, height: h } = await image.metadata();

            width = w;
            height = h;

            await generateImageThumbnail(image, { destination: thumbPath });
        } else {
            const metadata = await getVideoMetadata(importItem.sourcePath);
            if (!metadata.success) {
                await rollback.revert();
                return Result.reject(metadata.error);
            }

            width = metadata.data.width;
            height = metadata.data.height;
            duration = metadata.data.duration;

            const thumbnail = await generateVideoThumbnail(importItem.sourcePath, { destination: thumbPath });
            if (!thumbnail.success) {
                await rollback.revert();
                return Result.reject(thumbnail.error);
            }
        }
    } catch (error) {
        await rollback.revert();
        return Result.reject(Errors.itemReadFail({ message: "Unable to prepare item metadata or thumbnail", error, details: { sourcePath: importItem.sourcePath } }));
    }

    let rawOriginalName: string | null = null;
    let rawFileSize: number | null = null;
    let rawChecksum: string | null = null;
    if (importItem.originalSourcePath) {
        const originalSourcePath = importItem.originalSourcePath;

        if (fsSync.existsSync(originalSourcePath)) {
            try {
                const origData = await fs.readFile(originalSourcePath);

                rawFileSize = origData.length;
                rawChecksum = crypto.createHash("md5").update(origData).digest("hex");
            } catch {}

            const origExt = path.extname(originalSourcePath).replace(".", "") || "";
            const origDestName = `${itemId}-raw.${origExt}`;

            try {
                await fs.copyFile(originalSourcePath, path.join(originalsDir, origDestName));
                rollback.push(() => fs.unlink(path.join(originalsDir, origDestName)));
            } catch (e) {
                rollback.revert();
                return Result.reject(Errors.itemCopyFail({ message: "Unable to copy original item", error: e, details: { sourcePath: originalSourcePath } }));
            }

            rawOriginalName = path.basename(originalSourcePath);
            if (deleteSource) fs.unlink(originalSourcePath);
        }
    }

    let liveVideoName: string | null = null;
    let liveVideoOriginalName: string | null = null;
    if (importItem.livePath) {
        const livePath = importItem.livePath;

        if (fsSync.existsSync(livePath)) {
            const ext = path.extname(livePath).replace(".", "") || "mov";
            const name = `${itemId}.${ext}`;

            try {
                await fs.copyFile(livePath, path.join(originalsDir, name));
                rollback.push(() => fs.unlink(path.join(originalsDir, name)));
            } catch (e) {
                rollback.revert();
                return Result.reject(Errors.itemCopyFail({ message: "Unable to copy live video", error: e, details: { sourcePath: livePath } }));
            }

            liveVideoName = name;
            liveVideoOriginalName = path.basename(livePath);
            if (deleteSource) fs.unlink(livePath);
        }
    }

    let rawLiveVideoName: string | null = null;
    let rawLiveVideoOriginalName: string | null = null;
    if (importItem.originalLivePath) {
        const originalLivePath = importItem.originalLivePath;

        if (fsSync.existsSync(originalLivePath)) {
            const ext = path.extname(originalLivePath).replace(".", "") || "mov";
            const name = `${itemId}-raw.${ext}`;

            try {
                await fs.copyFile(originalLivePath, path.join(originalsDir, name));
                rollback.push(() => fs.unlink(path.join(originalsDir, name)));
            } catch (e) {
                rollback.revert();
                return Result.reject(Errors.itemCopyFail({ message: "Unable to copy live video", error: e, details: { sourcePath: originalLivePath } }));
            }

            rawLiveVideoName = name;
            rawLiveVideoOriginalName = path.basename(originalLivePath);
            if (deleteSource) fs.unlink(originalLivePath);
        }
    }

    let validAdjustments = false;
    if (importItem.adjustmentsPath) {
        const adjustmentsPath = importItem.adjustmentsPath;

        if (fsSync.existsSync(adjustmentsPath)) {
            try {
                await fs.copyFile(adjustmentsPath, path.join(adjustmentsDir, `${itemId}.AAE`));
                rollback.push(() => fs.unlink(path.join(adjustmentsDir, `${itemId}.AAE`)));
            } catch (e) {
                rollback.revert();
                return Result.reject(Errors.itemCopyFail({ message: "Unable to copy adjustments", error: e, details: { sourcePath: adjustmentsPath } }));
            }

            validAdjustments = true;
            if (deleteSource) fs.unlink(adjustmentsPath);
        }
    }

    if (deleteSource) fs.unlink(importItem.sourcePath);

    return Result.accept({
        id: itemId,
        originalName: originalName,
        extension: fileExtension,
        type: fileType,
        size: fileSize,
        width,
        height,
        duration,
        checksum,
        takenDate: takenDate.toISOString(),
        isFavorite: false,
        isScreenshot: false,
        isScreenRecording: false,
        ...(liveVideoName ? { liveVideo: liveVideoName } : {}),
        ...(liveVideoOriginalName ? { liveVideoOriginalName } : {}),
        ...(rawOriginalName ? { rawOriginalName } : {}),
        ...(rawFileSize !== null ? { rawSize: rawFileSize } : {}),
        ...(rawChecksum ? { rawChecksum } : {}),
        ...(rawLiveVideoName ? { rawLiveVideo: rawLiveVideoName } : {}),
        ...(rawLiveVideoOriginalName ? { rawLiveVideoOriginalName } : {}),
        hasAdjustments: validAdjustments,
        createdAt: new Date().toISOString(),
    });
}
