import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
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
        createdAt: new Date().toISOString(),
    });
}
