use chrono::Utc;
use rusqlite::{Connection, params};
use serde_json::Value;
use std::path::Path;

use crate::modules;
use crate::modules::utils;

pub fn create_connection(db_path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(db_path).map_err(|e| utils::treat(e, "Unable to open database"))?;
    conn.execute("PRAGMA foreign_keys = ON", []).map_err(|e| utils::treat(e, "Unable to open database"))?;
    Ok(conn)
}

pub fn open_connection(db_path: &Path) -> Result<Connection, String> {
    if !db_path.exists() {
        log::error!("Database not found at {:?}", db_path);
        return Err("notfound".to_string());
    }

    create_connection(db_path)
}

pub fn fetch_library_version(conn: &Connection) -> Result<u32, String> {
    conn.query_one("PRAGMA user_version", [], |row| row.get::<usize, u32>(0)).map_err(|e| utils::treat(e, "Unable to check library version"))
}

pub fn create_library_schema(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS library (
            name TEXT NOT NULL,
            icon TEXT NOT NULL,
            color TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    ).map_err(|e| utils::treat(e, "Error creating library"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS item (
            id TEXT PRIMARY KEY,
            original_name TEXT NOT NULL,
            file_ext TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            width INTEGER NOT NULL,
            height INTEGER NOT NULL,
            duration INTEGER NOT NULL,
            checksum TEXT NOT NULL,
            taken_date TEXT NOT NULL,
            is_favorite INTEGER DEFAULT 0,
            is_screenshot INTEGER DEFAULT 0,
            is_screen_recording INTEGER DEFAULT 0,
            live_video TEXT,
            raw_original_name TEXT,
            raw_file_size INTEGER,
            raw_checksum TEXT,
            raw_live_video TEXT,
            has_adjustments INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )",
        [],
    ).map_err(|e| utils::treat(e, "Error creating library"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS album (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            parent TEXT,
            selected_cover INTEGER NOT NULL,
            selected_banner INTEGER NOT NULL,
            icon TEXT,
            color TEXT,
            cover_photo TEXT,
            banner_photo TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (parent) REFERENCES album (id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| utils::treat(e, "Error creating library"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS album_item (
            album_id TEXT NOT NULL,
            item_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (album_id, item_id),
            FOREIGN KEY (album_id) REFERENCES album (id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES item (id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| utils::treat(e, "Error creating library"))?;

    Ok(())
}

pub fn insert_library_metadata(conn: &Connection, name: &str, icon: &str, color: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO library (name, icon, color, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![name, icon, color, Utc::now().to_rfc3339()],
    ).map_err(|e| utils::treat(e, "Error creating library"))?;

    Ok(())
}

pub fn fetch_library_info(conn: &Connection) -> Result<Value, String> {
    let mut stmt = conn.prepare("SELECT name, icon, color FROM library LIMIT 1").map_err(|e| utils::treat(e, "Unable to fetch library metadata"))?;
    let mut library_info = stmt.query_row([], |row| {
        Ok(serde_json::json!({
            "name": row.get::<_, String>(0)?,
            "icon": row.get::<_, String>(1)?,
            "color": row.get::<_, String>(2)?,
        }))
    }).map_err(|e| utils::treat(e, "Unable to fetch library metadata"))?;

    let count: i64 = conn.query_row("SELECT COUNT(*) FROM item", [], |row| row.get(0)).map_err(|e| utils::treat(e, "Unable to fetch item count"))?;

    if let Some(obj) = library_info.as_object_mut() {
        obj.insert("count".to_string(), Value::Number(count.into()));
    }

    Ok(library_info)
}

pub fn insert_item(conn: &Connection, item: &modules::Item) -> Result<(), String> {
    conn.execute(
        "INSERT INTO item (
            id,
            original_name,
            file_ext,
            file_type,
            file_size,
            width,
            height,
            duration,
            checksum,
            taken_date,
            is_favorite,
            is_screenshot,
            is_screen_recording,
            live_video,
            raw_original_name,
            raw_file_size,
            raw_checksum,
            raw_live_video,
            has_adjustments,
            created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
        params![
            item.id,
            item.original_name,
            item.file_ext,
            item.file_type,
            item.file_size,
            item.width,
            item.height,
            item.duration,
            item.checksum,
            item.taken_date.to_rfc3339(),
            item.is_favorite as i32,
            item.is_screenshot as i32,
            item.is_screen_recording as i32,
            item.live_video,
            item.raw_original_name,
            item.raw_file_size,
            item.raw_checksum,
            item.raw_live_video,
            item.has_adjustments as i32,
            item.created_at.to_rfc3339()
        ]
    ).map_err(|e| utils::treat(e, "Unable to import item to the library"))?;
    Ok(())
}

pub fn fetch_items(conn: &Connection) -> Result<Vec<modules::Item>, String> {
    let mut stmt = conn.prepare("SELECT * FROM item ORDER BY taken_date DESC").map_err(|e| utils::treat(e, "Unable to obtain items"))?;
    let item_iter = stmt.query_map([], utils::deserialize_item).map_err(|e| utils::treat(e, "Unable to obtain items"))?;

    let mut items = Vec::new();
    for item in item_iter {
        items.push(item.map_err(|e| utils::treat(e, "Unable to obtain items"))?);
    }

    Ok(items)
}

pub fn fetch_item(conn: &Connection, item_id: &str) -> Result<modules::Item, String> {
    conn.prepare("SELECT * FROM item WHERE id = ?1")
        .map_err(|e| utils::treat(e, "Unable to obtain item"))?
        .query_row(params![item_id], utils::deserialize_item)
        .map_err(|e| utils::treat(e, "Unable to obtain item"))
}

pub fn set_items_favorite(conn: &Connection, item_ids: &[String], value: bool) -> Result<(), String> {
    for item_id in item_ids {
        conn.execute(
            "UPDATE item SET is_favorite = ?1 WHERE id = ?2",
            params![
                if value { 1 } else { 0 },
                item_id
            ],
        ).map_err(|e| utils::treat(e, "Unable to update the item favorite state"))?;
    }
    Ok(())
}

pub fn delete_item(conn: &Connection, item_id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM item WHERE id = ?1",
        params![item_id]
    ).map_err(|e| utils::treat(e, "Error deleting item from database"))?;

    Ok(())
}

pub fn insert_album(conn: &Connection, album: &modules::Album) -> Result<(), String> {
    conn.execute(
        "INSERT INTO album (id, name, description, parent, selected_cover, selected_banner, icon, color, cover_photo, banner_photo, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            album.id,
            album.name,
            album.description,
            album.parent,
            album.selected_cover,
            album.selected_banner,
            album.icon,
            album.color,
            album.cover_photo,
            album.banner_photo,
            album.created_at.to_rfc3339()
        ],
    ).map_err(|e| utils::treat(e, "Insert Error"))?;

    Ok(())
}

pub fn fetch_albums(conn: &Connection, parent: Option<String>) -> Result<Vec<modules::AlbumComp>, String> {
    let mut stmt = conn.prepare(
        "SELECT a.*, (
            SELECT COUNT(*)
            FROM album_item ai
            WHERE ai.album_id = a.id
        ) AS size,
        COALESCE(
            (SELECT json_group_array(sub.id) FROM (
                SELECT i.id
                FROM album_item ai
                JOIN item i ON i.id = ai.item_id
                WHERE ai.album_id = a.id
                ORDER BY i.taken_date DESC
                LIMIT 10
            ) AS sub)
        , json('[]')) AS peek_thumbs
        FROM album a
        WHERE a.parent IS ?1
        ORDER BY a.name ASC",
    ).map_err(|e| utils::treat(e, "Unable to obtain albums"))?;
    
    let album_iter = stmt.query_map(params![parent], utils::deserialize_album_computed).map_err(|e| utils::treat(e, "Unable to obtain albums"))?;

    let mut albums = Vec::new();
    for album in album_iter {
        albums.push(album.map_err(|e| utils::treat(e, "Unable to obtain albums"))?);
    }

    Ok(albums)
}

pub fn fetch_album_items(conn: &Connection, album_id: &str) -> Result<Vec<modules::ItemAlbumRef>, String> {
    let mut stmt = conn.prepare(
        "SELECT i.*, ai.created_at as added_at FROM item i
        INNER JOIN album_item ai ON i.id = ai.item_id
        WHERE ai.album_id = ?1
        ORDER BY i.taken_date DESC"
    ).map_err(|e| utils::treat(e, "Unable to obtain album items"))?;

    let item_iter = stmt.query_map(
        params![album_id],
        utils::deserialize_item_album_ref
    ).map_err(|e| utils::treat(e, "Unable to obtain album items"))?;

    let mut items = Vec::new();
    for item in item_iter {
        items.push(item.map_err(|e| utils::treat(e, "Unable to obtain album items"))?);
    }

    Ok(items)
}

pub fn add_items_to_album(conn: &Connection, album_id: &str, item_ids: &[String],) -> Result<(), String> {
    let now = Utc::now();

    for item_id in item_ids {
        conn.execute(
            "INSERT INTO album_item (album_id, item_id, created_at) VALUES (?1, ?2, ?3)",
            params![album_id, item_id, now.to_rfc3339()],
        ).map_err(|e| utils::treat(e, "Unable to insert item into album"))?;
    }

    Ok(())
}

pub fn remove_items_from_album(conn: &Connection, album_id: &str, item_ids: &[String]) -> Result<(), String> {
    for item_id in item_ids {
        conn.execute(
            "DELETE FROM album_item WHERE album_id = ?1 AND item_id = ?2",
            params![album_id, item_id]
        ).map_err(|e| utils::treat(e, "Unable to remove item from album"))?;
    }

    Ok(())
}