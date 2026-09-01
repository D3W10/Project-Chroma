import { ensureAlbumProps } from "@project-chroma/utils";
import { optional, sqlify } from "../schema.ts";
import { rowToItem } from "./items.ts";
import type { Album, AlbumComp, ItemAlbumRef } from "@project-chroma/contracts/gallery";
import type { ChromaDB } from "../connection.ts";
import type { DbRow } from "../types.ts";

export function getFromParent(db: ChromaDB, parent?: string | null): AlbumComp[] {
    const rows = db
        .prepare(`
            SELECT a.*, (
                SELECT COUNT(*)
                FROM album_item ai
                WHERE ai.albumId = a.id
            ) AS size,
            COALESCE(
                (SELECT json_group_array(sub.id) FROM (
                    SELECT i.id
                    FROM album_item ai
                    JOIN item i ON i.id = ai.itemId
                    WHERE ai.albumId = a.id
                    ORDER BY i.takenDate DESC
                    LIMIT 10
                ) AS sub),
                json('[]')
            ) AS peek_thumbs
            FROM album a
            WHERE a.parent IS ?
            ORDER BY a.name ASC
        `)
        .all(parent ?? null) as DbRow[];
    return rows.map(rowToAlbum);
}

export function add(db: ChromaDB, album: Album) {
    db.prepare(`INSERT INTO album (
        id,
        name,
        description,
        parent,
        selectedCover,
        selectedBanner,
        icon,
        color,
        coverPhoto,
        bannerPhoto,
        createdAt
    ) VALUES (
        @id,
        @name,
        @description,
        @parent,
        @selectedCover,
        @selectedBanner,
        @icon,
        @color,
        @coverPhoto,
        @bannerPhoto,
        @createdAt
    )`).run(sqlify(ensureAlbumProps(album)));
}

export function getItems(db: ChromaDB, albumId: string): ItemAlbumRef[] {
    const rows = db
        .prepare(`
            SELECT i.*, ai.addedAt AS addedAt
            FROM item i
            INNER JOIN album_item ai ON i.id = ai.itemId
            WHERE ai.albumId = ?
            ORDER BY i.takenDate DESC
        `)
        .all(albumId) as DbRow[];
    return rows.map(rowToAlbumItem);
}

export function rowToAlbum(row: DbRow): AlbumComp {
    let peekThumbs: string[] = [];
    if (typeof row.peek_thumbs === "string") {
        try {
            peekThumbs = JSON.parse(row.peek_thumbs);
        } catch {
            peekThumbs = [];
        }
    } else if (Array.isArray(row.peek_thumbs)) {
        peekThumbs = row.peek_thumbs as string[];
    }

    return {
        id: String(row.id),
        name: String(row.name),
        description: String(row.description ?? ""),
        ...optional<Album>({ parent: row.parent ?? undefined }),
        selectedCover: Number(row.selectedCover ?? 0),
        selectedBanner: Number(row.selectedBanner ?? 0),
        ...optional<Album>({ icon: row.icon ?? undefined }),
        ...optional<Album>({ color: row.color ?? undefined }),
        ...optional<Album>({ coverPhoto: row.coverPhoto ?? undefined }),
        ...optional<Album>({ bannerPhoto: row.bannerPhoto ?? undefined }),
        createdAt: String(row.createdAt),
        size: Number(row.size ?? 0),
        peekThumbs,
    };
}

export function rowToAlbumItem(row: DbRow): ItemAlbumRef {
    return {
        ...rowToItem(row),
        addedAt: String(row.addedAt),
    };
}
