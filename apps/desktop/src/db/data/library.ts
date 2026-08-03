import { Errors, Result } from "@project-chroma/utils";
import { getLibraryVersion, SCHEMA_VERSION } from "../schema.ts";
import type { LibraryHealth, LibraryMetadata } from "@project-chroma/contracts/gallery";
import type { ChromaDB } from "../connection.ts";

export function checkVersionState(db: ChromaDB): LibraryHealth {
    const version = getLibraryVersion(db);
    if (version < SCHEMA_VERSION) return "outdated";
    if (version > SCHEMA_VERSION) return "recent";

    return "healthy";
}

export function fetchInfo(db: ChromaDB): Result<LibraryMetadata> {
    const info = db.prepare("SELECT name, icon, color, createdAt FROM library LIMIT 1").get() as Omit<LibraryMetadata, "count"> | undefined;
    if (!info) return Result.reject(Errors.libraryNotFound());

    const count = db.prepare("SELECT COUNT(*) AS count FROM item").get() as { count: number };
    return Result.accept({
        name: info.name,
        icon: info.icon,
        color: info.color,
        count: count.count,
        createdAt: info.createdAt,
    });
}

export function fillMetadata(db: ChromaDB, name: string, icon: string, color: string): void {
    db.prepare("INSERT INTO library (name, icon, color, createdAt) VALUES (?, ?, ?, ?)").run(name, icon, color, new Date().toISOString());
}
