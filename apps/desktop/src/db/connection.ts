import Database from "better-sqlite3";
export function createConnection(dbPath: string): LibraryDatabase {
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    return db;
}
