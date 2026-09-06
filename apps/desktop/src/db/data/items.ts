import { ensureItemProps } from "@project-chroma/utils";
import { optional, sqlify } from "../schema.ts";
import { boolToInt, type DbRow } from "../types.ts";
import type { Item, Tag, TagItemsRef } from "@project-chroma/contracts/gallery";
import type { ChromaDB } from "../connection.ts";

export type ItemSearchEmbedding = {
    itemId: string;
    embedding: Buffer;
    embeddingDim: number;
};

export function getAll(db: ChromaDB): Item[] {
    return (db.prepare(`SELECT * FROM item ORDER BY takenDate DESC`).all() as DbRow[]).map(rowToItem);
}

export function getByIds(db: ChromaDB, itemIds: readonly string[]): Item[] {
    if (itemIds.length === 0) return [];
    const placeholders = itemIds.map(() => "?").join(",");
    return (db.prepare(`SELECT * FROM item WHERE id IN (${placeholders})`).all(...itemIds) as DbRow[]).map(rowToItem);
}

export function getById(db: ChromaDB, itemId: string): Item | undefined {
    const row = db.prepare("SELECT * FROM item WHERE id = ?").get(itemId) as DbRow | undefined;
    return row ? rowToItem(row) : undefined;
}

export function count(db: ChromaDB): number {
    return Number((db.prepare("SELECT COUNT(*) AS count FROM item").get() as { count: number }).count);
}

export function add(db: ChromaDB, items: Item[]) {
    const columns = ["originalName", "extension", "type", "size", "width", "height", "duration", "checksum", "takenDate", "isFavorite", "isScreenshot", "isScreenRecording", "liveVideo", "liveVideoOriginalName", "rawOriginalName", "rawSize", "rawChecksum", "rawLiveVideo", "rawLiveVideoOriginalName", "hasAdjustments", "createdAt"];
    const insert = db.prepare(`INSERT INTO item (id, ${columns.join(", ")}) VALUES (@id, ${columns.map(value => `@${value}`).join(", ")})`);

    db.transaction((items: Item[]) => {
        for (const item of items) {
            insert.run(sqlify(ensureItemProps(item)));
        }
    })(items);
}

export function setFavoriteState(db: ChromaDB, itemIds: readonly string[], value: boolean): void {
    if (itemIds.length === 0) return;
    const placeholders = itemIds.map(() => "?").join(",");
    db.prepare(`UPDATE item SET isFavorite = ? WHERE id IN (${placeholders})`).run(boolToInt(value), ...itemIds);
}

export function deleteByIds(db: ChromaDB, itemIds: readonly string[]): void {
    if (itemIds.length === 0) return;
    const placeholders = itemIds.map(() => "?").join(",");
    db.prepare(`DELETE FROM item WHERE id IN (${placeholders})`).run(...itemIds);
}

export function rowToItem(row: DbRow): Item {
    return {
        id: String(row.id),
        originalName: String(row.originalName),
        extension: String(row.extension),
        type: String(row.type),
        size: Number(row.size ?? 0),
        width: Number(row.width ?? 0),
        height: Number(row.height ?? 0),
        duration: Number(row.duration ?? 0),
        checksum: String(row.checksum),
        takenDate: String(row.takenDate),
        isFavorite: Boolean(row.isFavorite),
        isScreenshot: Boolean(row.isScreenshot),
        isScreenRecording: Boolean(row.isScreenRecording),
        ...optional<Item>({ liveVideo: row.liveVideo ?? undefined }),
        ...optional<Item>({ liveVideoOriginalName: row.liveVideoOriginalName ?? undefined }),
        ...optional<Item>({ rawOriginalName: row.rawOriginalName ?? undefined }),
        ...optional<Item>({ rawSize: row.rawSize ?? undefined }),
        ...optional<Item>({ rawChecksum: row.rawChecksum ?? undefined }),
        ...optional<Item>({ rawLiveVideo: row.rawLiveVideo ?? undefined }),
        ...optional<Item>({ rawLiveVideoOriginalName: row.rawLiveVideoOriginalName ?? undefined }),
        hasAdjustments: Boolean(row.hasAdjustments),
        createdAt: String(row.createdAt),
    };
}

export function getTags(db: ChromaDB): Tag[] {
    return (db.prepare("SELECT * FROM tag ORDER BY name ASC").all() as DbRow[]).map(rowToTag);
}

export function createTag(db: ChromaDB, tag: Tag): void {
    db.prepare(`INSERT INTO tag (id, name, color, createdAt) VALUES (?, ?, ?, ?)`).run(tag.id, tag.name, tag.color, tag.createdAt);
}

export function updateTag(db: ChromaDB, tagId: string, name?: string, color?: string): Tag | undefined {
    if (name === undefined && color === undefined) {
        const row = db.prepare("SELECT * FROM tag WHERE id = ?").get(tagId) as DbRow | undefined;
        return row ? rowToTag(row) : undefined;
    }

    db.prepare("UPDATE tag SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?").run(name ?? null, color ?? null, tagId);
    const row = db.prepare("SELECT * FROM tag WHERE id = ?").get(tagId) as DbRow | undefined;
    return row ? rowToTag(row) : undefined;
}

export function deleteTags(db: ChromaDB, tagIds: readonly string[]): void {
    if (tagIds.length === 0) return;
    const placeholders = tagIds.map(() => "?").join(",");
    db.prepare(`DELETE FROM tag WHERE id IN (${placeholders})`).run(...tagIds);
}

export function getItemsTags(db: ChromaDB, itemIds: readonly string[]): TagItemsRef[] {
    if (itemIds.length === 0) return [];

    const placeholders = itemIds.map(() => "?").join(",");

    const rows = db
        .prepare(`
            SELECT t.*, COUNT(DISTINCT it.itemId) AS itemCount
            FROM tag t
            INNER JOIN item_tag it ON t.id = it.tagId
            WHERE it.itemId IN (${placeholders})
            GROUP BY t.id
            ORDER BY t.name ASC
        `)
        .all(...itemIds) as DbRow[];

    return rows.map(row => ({ ...rowToTag(row), itemCount: Number(row.itemCount) }));
}

export function setTagsOnItems(db: ChromaDB, itemIds: readonly string[], tagIds: readonly string[], assigned: boolean): void {
    if (itemIds.length === 0 || tagIds.length === 0) return;
    const statement = assigned
        ? db.prepare(`INSERT OR IGNORE INTO item_tag (itemId, tagId, createdAt) VALUES (?, ?, ?)`)
        : db.prepare(`DELETE FROM item_tag WHERE itemId = ? AND tagId = ?`);
    const run = db.transaction((items: readonly string[], tags: readonly string[]) => {
        const createdAt = new Date().toISOString();
        for (const itemId of items) {
            for (const tagId of tags) {
                if (assigned) statement.run(itemId, tagId, createdAt);
                else statement.run(itemId, tagId);
            }
        }
    });
    run(itemIds, tagIds);
}

export function getItemSearchStatus(db: ChromaDB, modelId: string, indexing: boolean) {
    const indexed = db.prepare("SELECT COUNT(*) AS count FROM item_search_index WHERE state = 1 AND model_id = ?").get(modelId) as { count: number };
    const failed = db.prepare("SELECT COUNT(*) AS count FROM item_search_index WHERE state = 2 AND model_id = ?").get(modelId) as { count: number };
    const total = db.prepare("SELECT COUNT(*) AS count FROM item").get() as { count: number };

    return {
        totalItems: total.count,
        indexedItems: indexed.count,
        failedItems: failed.count,
        pendingItems: Math.max(total.count - indexed.count - failed.count, 0),
        indexing,
    };
}

export function getPendingSearchItemIds(db: ChromaDB, modelId: string, limit: number): string[] {
    const safeLimit = Math.max(0, Math.floor(limit));
    if (safeLimit === 0) return [];
    const rows = db
        .prepare(`
            SELECT i.id
            FROM item i
            LEFT JOIN item_search_index s ON s.item_id = i.id
            WHERE s.item_id IS NULL OR s.model_id IS NULL OR s.model_id != ?
            ORDER BY i.createdAt ASC
            LIMIT ?
        `)
        .all(modelId, safeLimit) as { id: string }[];
    return rows.map(row => row.id);
}

export function upsertSearchEmbedding(db: ChromaDB, itemId: string, modelId: string, embedding: Buffer | Uint8Array, embeddingDim: number): void {
    db.prepare(`
        INSERT INTO item_search_index (item_id, state, embedding, embedding_dim, model_id, error, indexed_at)
        VALUES (?, 1, ?, ?, ?, NULL, ?)
        ON CONFLICT(item_id) DO UPDATE SET
            state = 1,
            embedding = excluded.embedding,
            embedding_dim = excluded.embedding_dim,
            model_id = excluded.model_id,
            error = NULL,
            indexed_at = excluded.indexed_at
    `).run(itemId, Buffer.from(embedding), embeddingDim, modelId, new Date().toISOString());
}

export function upsertSearchFailure(db: ChromaDB, itemId: string, modelId: string, error: string): void {
    db.prepare(`
        INSERT INTO item_search_index (item_id, state, embedding, embedding_dim, model_id, error, indexed_at)
        VALUES (?, 2, NULL, NULL, ?, ?, NULL)
        ON CONFLICT(item_id) DO UPDATE SET
            state = 2,
            embedding = NULL,
            embedding_dim = NULL,
            model_id = excluded.model_id,
            error = excluded.error,
            indexed_at = NULL
    `).run(itemId, modelId, error);
}

export function getSearchEmbeddings(db: ChromaDB, modelId: string): ItemSearchEmbedding[] {
    const rows = db
        .prepare(`
            SELECT item_id AS itemId, embedding, embedding_dim AS embeddingDim
            FROM item_search_index
            WHERE state = 1 AND model_id = ? AND embedding IS NOT NULL AND embedding_dim IS NOT NULL
        `)
        .all(modelId) as DbRow[];
    return rows.map(row => ({
        itemId: String(row.itemId),
        embedding: Buffer.from(row.embedding as Uint8Array),
        embeddingDim: Number(row.embeddingDim),
    }));
}

function rowToTag(row: DbRow): Tag {
    return {
        id: String(row.id),
        name: String(row.name),
        color: String(row.color),
        createdAt: String(row.createdAt),
    };
}
