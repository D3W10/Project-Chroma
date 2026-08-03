import type { ChromaDB } from "./connection.ts";

export const SCHEMA_VERSION = 0 as const;

export function createSchema(db: ChromaDB) {
    db.transaction(() => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS library (
                name TEXT NOT NULL,
                icon TEXT NOT NULL,
                color TEXT NOT NULL,
                createdAt TEXT NOT NULL
            );
    
            CREATE TABLE IF NOT EXISTS item (
                id TEXT PRIMARY KEY,
                originalName TEXT NOT NULL,
                extension TEXT NOT NULL,
                type TEXT NOT NULL,
                size INTEGER NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                duration INTEGER NOT NULL,
                checksum TEXT NOT NULL,
                takenDate TEXT NOT NULL,
                isFavorite INTEGER DEFAULT 0,
                isScreenshot INTEGER DEFAULT 0,
                isScreenRecording INTEGER DEFAULT 0,
                liveVideo TEXT,
                rawOriginalName TEXT,
                rawSize INTEGER,
                rawChecksum TEXT,
                rawLiveVideo TEXT,
                hasAdjustments INTEGER DEFAULT 0,
                createdAt TEXT NOT NULL
            );
    
            CREATE TABLE IF NOT EXISTS album (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                parent TEXT,
                selectedCover INTEGER NOT NULL,
                selectedBanner INTEGER NOT NULL,
                icon TEXT,
                color TEXT,
                coverPhoto TEXT,
                bannerPhoto TEXT,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (parent) REFERENCES album (id) ON DELETE CASCADE
            );
    
            CREATE TABLE IF NOT EXISTS album_item (
                albumId TEXT NOT NULL,
                itemId TEXT NOT NULL,
                addedAt TEXT NOT NULL,
                PRIMARY KEY (albumId, itemId),
                FOREIGN KEY (albumId) REFERENCES album (id) ON DELETE CASCADE,
                FOREIGN KEY (itemId) REFERENCES item (id) ON DELETE CASCADE
            );
    
            CREATE TABLE IF NOT EXISTS tag (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                createdAt TEXT NOT NULL
            );
    
            CREATE TABLE IF NOT EXISTS item_tag (
                itemId TEXT NOT NULL,
                tagId TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                PRIMARY KEY (itemId, tagId),
                FOREIGN KEY (itemId) REFERENCES item (id) ON DELETE CASCADE,
                FOREIGN KEY (tagId) REFERENCES tag (id) ON DELETE CASCADE
            );
        `);

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_item_taken_date ON item (takenDate DESC);
            CREATE INDEX IF NOT EXISTS idx_item_created_at ON item (createdAt ASC);
            CREATE INDEX IF NOT EXISTS idx_album_parent_name ON album (parent, name);
            CREATE INDEX IF NOT EXISTS idx_album_item_album_taken ON album_item (albumId, itemId);
            CREATE INDEX IF NOT EXISTS idx_album_item_item ON album_item (itemId);
            CREATE INDEX IF NOT EXISTS idx_tag_name ON tag (name);
            CREATE INDEX IF NOT EXISTS idx_item_tag_item ON item_tag (itemId, tagId);
            CREATE INDEX IF NOT EXISTS idx_item_tag_tag ON item_tag (tagId, itemId);
            CREATE INDEX IF NOT EXISTS idx_item_search_state ON item_search_index (state);
        `);

        db.pragma(`user_version = ${SCHEMA_VERSION}`);
    })();
}

const upgrades: FixedLengthArray<(db: ChromaDB) => void, typeof SCHEMA_VERSION> = [];

export function getLibraryVersion(db: ChromaDB): number {
    return db.pragma("user_version", { simple: true }) as number;
}

type ValuesToUnknown<T> = {
    [K in keyof T]: unknown;
};

export function optional<T extends object>(item: ValuesToUnknown<Partial<T>>): Partial<T> | void {
    return Object.values(item).some(v => v !== undefined) ? (item as T) : undefined;
}

export function sqlify(obj: Record<string, unknown>): Record<string, unknown> {
    const clean = { ...obj };

    for (const key of Object.keys(clean)) {
        if (typeof clean[key] === "boolean") clean[key] = clean[key] ? 1 : 0;
        else if (clean[key] instanceof Date) clean[key] = clean[key].toISOString();
    }

    return clean;
}
