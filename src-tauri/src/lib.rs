use chrono::{DateTime, Utc};
use image::imageops::FilterType;
use image::{GenericImageView, ImageFormat};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::Wry;
use tauri_plugin_store::{Store, StoreExt};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Photo {
    pub id: String,
    pub original_name: String,
    pub file_name: String,
    pub file_type: String,
    pub file_size: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub checksum: String,
    pub is_favorite: bool,
    pub is_screenshot: bool,
    pub is_screen_recording: bool,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

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
            create_library,
            update_library_path,
            remove_library,
            check_library_path,
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

fn get_store(app: &tauri::AppHandle) -> Result<Arc<Store<Wry>>, String> {
    app.store("config.json").map_err(|e| e.to_string())
}

#[tauri::command]
fn get_libraries(app: tauri::AppHandle) -> Result<Value, String> {
    let store = get_store(&app)?;
    if let Some(v) = store.get("libraries") {
        Ok(v.clone())
    } else {
        Ok(Value::Array(vec![]))
    }
}

#[tauri::command]
fn create_library(app: tauri::AppHandle, name: &str, icon: char, color: &str, path: &str) -> Result<(), String> {
    let base = Path::new(path);
    let full_path = base.join(".projectchroma");
    let store = get_store(&app)?;

    match fs::create_dir_all(&full_path) {
        Ok(_) => println!("Library created successfully"),
        Err(e) => println!("Error creating library: {}", e),
    }

    let conn = Connection::open(full_path.join("photos.db").to_str().unwrap());

    match conn {
        Ok(conn) => {
            conn.execute(
                "CREATE TABLE IF NOT EXISTS photo (
                    id TEXT PRIMARY KEY,
                    original_name TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    checksum TEXT NOT NULL,
                    is_favorite INTEGER DEFAULT 0,
                    is_screenshot INTEGER DEFAULT 0,
                    is_screen_recording INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL
                )",
                [],
            ).map_err(|e| e.to_string())?;

            conn.execute(
                "CREATE TABLE IF NOT EXISTS album (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    cover_photo_type TEXT,
                    cover_photo_id TEXT,
                    cover_photo_icon TEXT,
                    cover_photo_color TEXT,
                    created_at TEXT NOT NULL
                )",
                [],
            ).map_err(|e| e.to_string())?;

            conn.execute(
                "CREATE TABLE IF NOT EXISTS album_photo (
                    album_id TEXT NOT NULL,
                    photo_id TEXT NOT NULL,
                    added_at TEXT NOT NULL,
                    PRIMARY KEY (album_id, photo_id),
                    FOREIGN KEY (album_id) REFERENCES album (id) ON DELETE CASCADE,
                    FOREIGN KEY (photo_id) REFERENCES photo (id) ON DELETE CASCADE
                )",
                [],
            ).map_err(|e| e.to_string())?;
        }
        Err(e) => return Err(e.to_string()),
    }

    let mut libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr.clone(),
        _ => vec![],
    };
    libraries.push(serde_json::json!({
        "name": name,
        "icon": icon,
        "color": color,
        "path": path
    }));
    store.set("libraries", Value::Array(libraries));

    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_library_path(
    app: tauri::AppHandle,
    library_name: String,
    new_path: String,
) -> Result<(), String> {
    let store = get_store(&app)?;
    let mut libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr.clone(),
        _ => vec![],
    };
    for lib in libraries.iter_mut() {
        if lib.get("name").and_then(|v| v.as_str()) == Some(library_name.as_str()) {
            if let Some(obj) = lib.as_object_mut() {
                obj.insert("path".to_string(), Value::String(new_path.clone()));
            }
        }
    }
    store.set("libraries", Value::Array(libraries));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn remove_library(app: tauri::AppHandle, library_name: String) -> Result<(), String> {
    let store = get_store(&app)?;
    let libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr.clone(),
        _ => vec![],
    };
    let filtered: Vec<Value> = libraries
        .into_iter()
        .filter(|lib| lib.get("name").and_then(|v| v.as_str()) != Some(library_name.as_str()))
        .collect();
    store.set("libraries", Value::Array(filtered));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn check_library_path(
    app: tauri::AppHandle,
    library_name: String,
) -> Result<(bool, String), String> {
    let store = get_store(&app)?;
    let libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr,
        _ => return Err("No libraries found".to_string()),
    };
    for lib in libraries {
        if lib.get("name").and_then(|v| v.as_str()) == Some(library_name.as_str()) {
            if let Some(path) = lib.get("path").and_then(|v| v.as_str()) {
                let exists = Path::new(path).exists();
                return Ok((exists, path.to_string()));
            }
        }
    }
    Err("Library not found".to_string())
}

fn get_library_meta_path(app: &tauri::AppHandle, library_name: &str) -> Result<PathBuf, String> {
    let store = get_store(app)?;
    let libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr,
        _ => return Err("No libraries found".to_string()),
    };

    for lib in libraries {
        if let Some(name) = lib.get("name").and_then(|v| v.as_str()) {
            if name == library_name {
                if let Some(path) = lib.get("path").and_then(|v| v.as_str()) {
                    return Ok(Path::new(path).join(".projectchroma"));
                }
            }
        }
    }
    Err("Library not found".to_string())
}

fn get_library_root_path(app: &tauri::AppHandle, library_name: &str) -> Result<PathBuf, String> {
    let store = get_store(app)?;
    let libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr,
        _ => return Err("No libraries found".to_string()),
    };
    for lib in libraries {
        if let Some(name) = lib.get("name").and_then(|v| v.as_str()) {
            if name == library_name {
                if let Some(path) = lib.get("path").and_then(|v| v.as_str()) {
                    return Ok(Path::new(path).to_path_buf());
                }
            }
        }
    }
    Err("Library not found".to_string())
}

fn get_db_connection(app: &tauri::AppHandle, library_name: &str) -> Result<Connection, String> {
    let meta_path = get_library_meta_path(app, library_name)?;
    let db_path = meta_path.join("photos.db");
    Connection::open(db_path).map_err(|e| e.to_string())
}

fn map_extension_to_mime(ext: &str) -> &'static str {
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "webp" => "image/webp",
        "heic" | "heif" => "image/heic",
        "mp4" => "video/mp4",
        "mov" => "video/quicktime",
        "avi" => "video/x-msvideo",
        _ => "application/octet-stream",
    }
}

fn try_generate_thumbnail(original: &Path, out_path: &Path, max_size: u32) -> Result<(), String> {
    // Only attempt for common still image formats we can decode
    let ext = original
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let supported = ["jpg", "jpeg", "png", "bmp", "webp", "gif"]; // image crate supports static gif first frame
    if !supported.contains(&ext.as_str()) {
        return Ok(()); // skip silently for unsupported formats like HEIC/VIDEO
    }

    let data = fs::read(original).map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&data).map_err(|e| e.to_string())?;
    let (w, h) = img.dimensions();
    let ratio = (w as f32) / (h as f32);
    let (tw, th) = if w >= h {
        (max_size, (max_size as f32 / ratio).round() as u32)
    } else {
        ((max_size as f32 * ratio).round() as u32, max_size)
    };
    let resized = img.resize_exact(tw, th, FilterType::CatmullRom);

    if let Some(parent) = out_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    // Save as webp for efficiency
    let mut buf = Vec::new();
    resized
        .write_to(&mut std::io::Cursor::new(&mut buf), ImageFormat::WebP)
        .map_err(|e| e.to_string())?;
    fs::write(out_path, &buf).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_photos(app: tauri::AppHandle, library_name: String) -> Result<Vec<Photo>, String> {
    let conn = get_db_connection(&app, &library_name)?;
    let mut stmt = conn
        .prepare("SELECT * FROM photo ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let photo_iter = stmt
        .query_map([], |row| {
            Ok(Photo {
                id: row.get(0)?,
                original_name: row.get(1)?,
                file_name: row.get(2)?,
                file_type: row.get(3)?,
                file_size: row.get(4)?,
                width: row.get(5)?,
                height: row.get(6)?,
                checksum: row.get(7)?,
                is_favorite: row.get::<_, i32>(8)? != 0,
                is_screenshot: row.get::<_, i32>(9)? != 0,
                is_screen_recording: row.get::<_, i32>(10)? != 0,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                    .map_err(|_e| {
                        rusqlite::Error::InvalidColumnType(
                            11,
                            "created_at".to_string(),
                            rusqlite::types::Type::Text,
                        )
                    })?
                    .with_timezone(&Utc),
                modified_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?)
                    .map_err(|_e| {
                        rusqlite::Error::InvalidColumnType(
                            12,
                            "modified_at".to_string(),
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

#[tauri::command]
fn add_photo(
    app: tauri::AppHandle,
    library_name: String,
    source_path: String,
) -> Result<Photo, String> {
    let library_root = get_library_root_path(&app, &library_name)?;
    fs::create_dir_all(&library_root).map_err(|e| e.to_string())?;

    let source_path = Path::new(&source_path);
    if !source_path.exists() {
        return Err("Source file does not exist".to_string());
    }

    let original_name = source_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid file name")?;

    let file_extension = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");

    let file_type = map_extension_to_mime(file_extension);

    let file_size = fs::metadata(source_path).map_err(|e| e.to_string())?.len();
    let checksum = format!(
        "{:x}",
        md5::compute(fs::read(source_path).map_err(|e| e.to_string())?)
    );

    let photo_id = Uuid::new_v4().to_string();
    let file_name = format!("{}.{}", photo_id, file_extension);
    let dest_path = library_root.join(&file_name);

    fs::copy(source_path, &dest_path).map_err(|e| e.to_string())?;

    // Generate thumbnail into meta cache
    let meta_path = get_library_meta_path(&app, &library_name)?;
    let cache_dir = meta_path.join("cache");
    let thumb_path = cache_dir.join(format!("{}.webp", photo_id));
    let _ = try_generate_thumbnail(&dest_path, &thumb_path, 512);

    let now = Utc::now();
    let photo = Photo {
        id: photo_id.clone(),
        original_name: original_name.to_string(),
        file_name: file_name.clone(),
        file_type: file_type.to_string(),
        file_size,
        width: None, // TODO: Extract image dimensions
        height: None,
        checksum,
        is_favorite: false,
        is_screenshot: false,
        is_screen_recording: false,
        created_at: now,
        modified_at: now,
    };

    let conn = get_db_connection(&app, &library_name)?;
    conn.execute(
        "INSERT INTO photo (id, original_name, file_name, file_type, file_size, width, height, checksum, is_favorite, is_screenshot, is_screen_recording, created_at, modified_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            photo.id,
            photo.original_name,
            photo.file_name,
            photo.file_type,
            photo.file_size,
            photo.width,
            photo.height,
            photo.checksum,
            photo.is_favorite as i32,
            photo.is_screenshot as i32,
            photo.is_screen_recording as i32,
            photo.created_at.to_rfc3339(),
            photo.modified_at.to_rfc3339()
        ],
    ).map_err(|e| e.to_string())?;

    Ok(photo)
}

#[tauri::command]
fn delete_photo(
    app: tauri::AppHandle,
    library_name: String,
    photo_id: String,
) -> Result<(), String> {
    let library_root = get_library_root_path(&app, &library_name)?;
    let meta_path = get_library_meta_path(&app, &library_name)?;
    let conn = get_db_connection(&app, &library_name)?;

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
    let file_path = library_root.join(&file_name);
    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| e.to_string())?;
    }
    let id_part = file_name.split('.').next().unwrap_or("");
    let thumb_path = meta_path.join("cache").join(format!("{}.webp", id_part));
    if thumb_path.exists() {
        let _ = fs::remove_file(thumb_path);
    }

    Ok(())
}

#[tauri::command]
fn get_thumbnail_path(
    app: tauri::AppHandle,
    library_name: String,
    photo_id: String,
) -> Result<Option<String>, String> {
    let meta_path = get_library_meta_path(&app, &library_name)?;
    let path = meta_path.join("cache").join(format!("{}.webp", photo_id));
    if path.exists() {
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn get_original_path(
    app: tauri::AppHandle,
    library_name: String,
    file_name: String,
) -> Result<String, String> {
    let root = get_library_root_path(&app, &library_name)?;
    let path = root.join(file_name);
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_albums(app: tauri::AppHandle, library_name: String) -> Result<Vec<Album>, String> {
    let conn = get_db_connection(&app, &library_name)?;
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
    library_name: String,
    name: String,
    description: Option<String>,
) -> Result<Album, String> {
    let conn = get_db_connection(&app, &library_name)?;
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
    library_name: String,
    album_id: String,
    photo_id: String,
) -> Result<(), String> {
    let conn = get_db_connection(&app, &library_name)?;
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
    library_name: String,
    album_id: String,
    photo_id: String,
) -> Result<(), String> {
    let conn = get_db_connection(&app, &library_name)?;

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
    library_name: String,
    album_id: String,
) -> Result<Vec<Photo>, String> {
    let conn = get_db_connection(&app, &library_name)?;
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
                file_name: row.get(2)?,
                file_type: row.get(3)?,
                file_size: row.get(4)?,
                width: row.get(5)?,
                height: row.get(6)?,
                checksum: row.get(7)?,
                is_favorite: row.get::<_, i32>(8)? != 0,
                is_screenshot: row.get::<_, i32>(9)? != 0,
                is_screen_recording: row.get::<_, i32>(10)? != 0,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                    .map_err(|_e| {
                        rusqlite::Error::InvalidColumnType(
                            11,
                            "created_at".to_string(),
                            rusqlite::types::Type::Text,
                        )
                    })?
                    .with_timezone(&Utc),
                modified_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?)
                    .map_err(|_e| {
                        rusqlite::Error::InvalidColumnType(
                            12,
                            "modified_at".to_string(),
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
