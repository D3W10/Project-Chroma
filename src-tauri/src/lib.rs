use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use tauri_plugin_store::StoreExt;
use uuid::Uuid;

mod modules;
use modules::config::{get_store, get_libraries, check_library_path, create_library, update_library_path, remove_library, get_selected_library, set_selected_library};
use modules::library::{get_photos, add_photo};
use modules::utils::Photo;

#[derive(Debug, Serialize, Deserialize)]
pub struct Album {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub cover_photo_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AlbumPhoto {
    pub album_id: String,
    pub photo_id: String,
    pub added_at: DateTime<Utc>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_libraries,
            check_library_path,
            create_library,
            update_library_path,
            remove_library,
            get_selected_library,
            set_selected_library,
            get_photos,
            add_photo,
            delete_photo,
            get_albums,
            create_album,
            add_photo_to_album,
            remove_photo_from_album,
            get_album_photos,
            get_thumbnail_path,
            get_original_path
        ])
        .setup(|app| {
            let _ = app.handle().store("config.json");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn get_library_root_path(app: &tauri::AppHandle, library_id: &str) -> Result<PathBuf, String> {
    let store = get_store(app)?;
    let libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr,
        _ => return Err("No libraries found".to_string()),
    };
    for lib in libraries {
        if let Some(id) = lib.get("id").and_then(|v| v.as_str()) {
            if id == library_id {
                if let Some(path) = lib.get("path").and_then(|v| v.as_str()) {
                    return Ok(Path::new(path).to_path_buf());
                }
            }
        }
    }
    Err("Library not found".to_string())
}

fn get_db_connection(app: &tauri::AppHandle, library_id: &str) -> Result<Connection, String> {
    let meta_path = get_library_root_path(app, library_id)?;
    let db_path = meta_path.join("photos.db");
    Connection::open(db_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_photo(
    app: tauri::AppHandle,
    library_id: String,
    photo_id: String,
) -> Result<(), String> {
    let library_root = get_library_root_path(&app, &library_id)?;
    let conn = get_db_connection(&app, &library_id)?;

    // Get photo info before deletion
    let mut stmt = conn
        .prepare("SELECT file_name FROM photo WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let file_name: String = stmt
        .query_row(params![photo_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    // Delete from database
    conn.execute("DELETE FROM photo WHERE id = ?1", params![photo_id])
        .map_err(|e| e.to_string())?;

    // Delete file
    let file_path = library_root.join("originals").join(&file_name);
    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| e.to_string())?;
    }
    let id_part = file_name.split('.').next().unwrap_or("");
    let thumb_path = library_root.join("thumbnails").join(format!("{}.webp", id_part));
    if thumb_path.exists() {
        let _ = fs::remove_file(thumb_path);
    }

    Ok(())
}

#[tauri::command]
fn get_thumbnail_path(
    app: tauri::AppHandle,
    library_id: String,
    photo_id: String,
) -> Result<Option<String>, String> {
    let library_root = get_library_root_path(&app, &library_id)?;
    let path = library_root.join("thumbnails").join(format!("{}.webp", photo_id));
    if path.exists() {
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn get_original_path(
    app: tauri::AppHandle,
    library_id: String,
    file_name: String,
) -> Result<String, String> {
    let root = get_library_root_path(&app, &library_id)?;
    let path = root.join("originals").join(file_name);
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_albums(app: tauri::AppHandle, library_id: String) -> Result<Vec<Album>, String> {
    let conn = get_db_connection(&app, &library_id)?;
    let mut stmt = conn
        .prepare("SELECT * FROM album ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let album_iter = stmt
        .query_map([], |row| {
            Ok(Album {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                cover_photo_id: row.get(3)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .map_err(|_e| {
                        rusqlite::Error::InvalidColumnType(
                            4,
                            "created_at".to_string(),
                            rusqlite::types::Type::Text,
                        )
                    })?
                    .with_timezone(&Utc),
                modified_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .map_err(|_e| {
                        rusqlite::Error::InvalidColumnType(
                            5,
                            "modified_at".to_string(),
                            rusqlite::types::Type::Text,
                        )
                    })?
                    .with_timezone(&Utc),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut albums = Vec::new();
    for album in album_iter {
        albums.push(album.map_err(|e| e.to_string())?);
    }
    Ok(albums)
}

#[tauri::command]
fn create_album(
    app: tauri::AppHandle,
    library_id: String,
    name: String,
    description: Option<String>,
) -> Result<Album, String> {
    let conn = get_db_connection(&app, &library_id)?;
    let album_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    let album = Album {
        id: album_id.clone(),
        name: name.clone(),
        description,
        cover_photo_id: None,
        created_at: now,
        modified_at: now,
    };

    conn.execute(
        "INSERT INTO album (id, name, description, cover_photo_id, created_at, modified_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            album.id,
            album.name,
            album.description,
            album.cover_photo_id,
            album.created_at.to_rfc3339(),
            album.modified_at.to_rfc3339()
        ],
    ).map_err(|e| e.to_string())?;

    Ok(album)
}

#[tauri::command]
fn add_photo_to_album(
    app: tauri::AppHandle,
    library_id: String,
    album_id: String,
    photo_id: String,
) -> Result<(), String> {
    let conn = get_db_connection(&app, &library_id)?;
    let now = Utc::now();

    conn.execute(
        "INSERT OR IGNORE INTO album_photo (album_id, photo_id, added_at) VALUES (?1, ?2, ?3)",
        params![album_id, photo_id, now.to_rfc3339()],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn remove_photo_from_album(
    app: tauri::AppHandle,
    library_id: String,
    album_id: String,
    photo_id: String,
) -> Result<(), String> {
    let conn = get_db_connection(&app, &library_id)?;

    conn.execute(
        "DELETE FROM album_photo WHERE album_id = ?1 AND photo_id = ?2",
        params![album_id, photo_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_album_photos(
    app: tauri::AppHandle,
    library_id: String,
    album_id: String,
) -> Result<Vec<Photo>, String> {
    let conn = get_db_connection(&app, &library_id)?;
    let mut stmt = conn
        .prepare(
            "SELECT p.* FROM photo p 
         INNER JOIN album_photo ap ON p.id = ap.photo_id 
         WHERE ap.album_id = ?1 
         ORDER BY ap.added_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let photo_iter = stmt
        .query_map(params![album_id], |row| {
            Ok(Photo {
                id: row.get(0)?,
                original_name: row.get(1)?,
                file_type: row.get(2)?,
                file_size: row.get(3)?,
                width: row.get(4)?,
                height: row.get(5)?,
                checksum: row.get(6)?,
                is_favorite: row.get::<_, i32>(7)? != 0,
                is_screenshot: row.get::<_, i32>(8)? != 0,
                is_screen_recording: row.get::<_, i32>(9)? != 0,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                    .map_err(|_e| {
                        rusqlite::Error::InvalidColumnType(
                            10,
                            "created_at".to_string(),
                            rusqlite::types::Type::Text,
                        )
                    })?
                    .with_timezone(&Utc),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut photos = Vec::new();
    for photo in photo_iter {
        photos.push(photo.map_err(|e| e.to_string())?);
    }
    Ok(photos)
}
