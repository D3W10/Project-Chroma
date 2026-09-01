import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Errors, isResult, Result } from "@project-chroma/utils";

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

type WithDatabaseResult<T> = T extends Result<any> ? T : Result<T>;

export function withDatabase<TResult>(root: string, callback: (db: ChromaDB) => TResult): WithDatabaseResult<TResult> {
    const db = openConnection(root);

    if (db.success) {
        try {
            const call = callback(db.data);

            if (isResult(call)) return call as WithDatabaseResult<TResult>;
            else return Result.accept(call) as WithDatabaseResult<TResult>;
        } finally {
            db.data.close();
        }
    } else return db as WithDatabaseResult<TResult>;
}

export async function withDatabaseAsync<TResult>(root: string, callback: (db: ChromaDB) => Promise<TResult>): Promise<WithDatabaseResult<TResult>> {
    const db = openConnection(root);

    if (!db.success) return db as WithDatabaseResult<TResult>;

    try {
        const call = await callback(db.data);
        return isResult(call) ? (call as WithDatabaseResult<TResult>) : (Result.accept(call) as WithDatabaseResult<TResult>);
    } finally {
        db.data.close();
    }
}
