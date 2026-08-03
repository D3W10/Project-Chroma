import { optional, sqlify } from "../schema.ts";
import { boolToInt, type DbRow } from "../types.ts";
import type { Item, ItemSearchMatch, Tag, TagItemRef } from "@project-chroma/contracts/gallery";
import type { ChromaDB } from "../connection.ts";

export function getAllItems(db: ChromaDB): Item[] {
    const orderColumn = hasColumn(db, "item", "takenDate") ? "takenDate" : "taken_date";
    return (db.prepare(`SELECT * FROM item ORDER BY ${orderColumn} DESC`).all() as DbRow[]).map(rowToItem);
}

export function addItems(db: ChromaDB, items: Item[]) {
    db.transaction(items => {
        for (const item of items) {
            db.prepare(`INSERT INTO item (
                id,
                originalName,
                extension,
                type,
                size,
                width,
                height,
                duration,
                checksum,
                takenDate,
                isFavorite,
                isScreenshot,
                isScreenRecording,
                liveVideo,
                rawOriginalName,
                rawSize,
                rawChecksum,
                rawLiveVideo,
                hasAdjustments,
                createdAt
            ) VALUES (
                @id,
                @originalName,
                @extension,
                @type,
                @size,
                @width,
                @height,
                @duration,
                @checksum,
                @takenDate,
                @isFavorite,
                @isScreenshot,
                @isScreenRecording,
                @liveVideo,
                @rawOriginalName,
                @rawSize,
                @rawChecksum,
                @rawLiveVideo,
                @hasAdjustments,
                @createdAt
            )`).run(sqlify(item));
        }
    })(items);
}

export function setFavoriteState(db: ChromaDB, itemIds: readonly string[], value: boolean): void {
    const placeholders = itemIds.map(() => "?").join(",");
    db.prepare(`UPDATE item SET isFavorite = ? WHERE id IN (${placeholders})`).run(boolToInt(value), ...itemIds);
}
}
