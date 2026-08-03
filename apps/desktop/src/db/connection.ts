import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Errors, Result } from "@project-chroma/utils";

export type ChromaDB = Database.Database;

export function createConnection(dbPath: string): ChromaDB {
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 2000");
    db.pragma("journal_mode = WAL");
    return db;
}

export function openConnection(root: string): Result<ChromaDB> {
    const dbPath = path.join(root, "lib.db");
    if (!fs.existsSync(dbPath)) {
        return Result.reject(Errors.libraryNotFound());
    }

    return Result.accept(createConnection(dbPath));
}

export function withDatabase<TResult>(root: string, callback: (db: ChromaDB) => TResult): Result<TResult> {
    const db = openConnection(root);

    if (db.success) {
        try {
            return Result.accept(callback(db.data));
        } finally {
            db.data.close();
        }
    } else return db;
}
