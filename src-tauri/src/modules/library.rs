use chrono::Utc;
use image::GenericImageView;
use rayon::prelude::*;
use rusqlite::{params, Connection};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::io::Cursor;
use std::sync::{atomic, Arc};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, async_runtime::spawn_blocking};
use uuid::Uuid;

use crate::modules::config;
use crate::modules::utils;
use crate::modules::migrations;

fn get_db_connection(app: &AppHandle, library_id: &str) -> Result<Connection, String> {
    let meta_path = get_library_root_path(app, library_id)?;
    if !meta_path.exists() {
        log::error!("Library {} not found", library_id);
        return Err("notfound".to_string());
    }

    let db_path = meta_path.join("lib.db");
    if !db_path.exists() {
        log::error!("Database not found for library {}", library_id);
        return Err("notfound".to_string());
    }

    let conn = Connection::open(db_path).map_err(|e| utils::treat(e, "Unable to open database"))?;
    conn.execute("PRAGMA foreign_keys = ON", []).map_err(|e| utils::treat(e, "Unable to open database"))?;
    Ok(conn)
}

fn get_library_root_path(app: &AppHandle, library_id: &str) -> Result<PathBuf, String> {
    let store = config::get_store(&app)?;
    let libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr,
        _ => vec![],
    };
    for lib in libraries {
        if lib.get("id").and_then(|v| v.as_str()) == Some(library_id) {
            if let Some(path) = lib.get("path").and_then(|v| v.as_str()) {
                return Ok(Path::new(path).to_path_buf());
            }
        }
    }
    log::error!("Library {} not found", library_id);
    Err("notfound".to_string())
}

#[tauri::command]
pub fn check_library_health(app: AppHandle, library_id: String, upgrade: Option<bool>) -> Result<bool, String> {
    let mut library_conn = get_db_connection(&app, &library_id)?;

    let version = library_conn.query_one("PRAGMA user_version", [], |row| row.get::<usize, u32>(0)).map_err(|e| utils::treat(e, "Unable to check library version"))?;
    let latest = migrations::get_latest_version();

    if version < latest {
        log::error!("Library {}", upgrade.unwrap_or(false));
        if upgrade.unwrap_or(false) {
            migrations::migrate_to_latest(version, &mut library_conn).map(|_| true)
        } else {
            Err("outdated".to_string())
        }
    } else if version > latest {
        Err("recent".to_string())
    } else {
        Ok(true)
    }
}

#[tauri::command]
pub fn upgrade_library(app: AppHandle, library_id: String) -> Result<bool, String> {
    check_library_health(app, library_id, Some(true))
}

#[tauri::command]
pub fn create_library(app: AppHandle, name: &str, icon: &str, color: &str, path: &str) -> Result<Value, String> {
    let base = Path::new(path);
    let full_path = base.to_path_buf();
    let store = config::get_store(&app)?;

    fs::create_dir_all(&full_path).map_err(|e| utils::treat(e, "Unable to create library at the specified path"))?;

    let conn = Connection::open(full_path.join("lib.db").to_str().unwrap());

    match conn {
        Ok(conn) => {
            let _ = fs::create_dir_all(full_path.join("originals"));
            let _ = fs::create_dir_all(full_path.join("thumbnails"));

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
                    is_favorite INTEGER DEFAULT 0,
                    is_screenshot INTEGER DEFAULT 0,
                    is_screen_recording INTEGER DEFAULT 0,
                    live_video TEXT,
                    raw_original_name TEXT,
                    raw_file_size INTEGER,
                    raw_checksum TEXT,
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
                    icon TEXT,
                    color TEXT,
                    cover_photo TEXT,
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

            migrations::label_latest(conn)?;
        }
        Err(e) => return Err(e.to_string()),
    }

    let mut libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr.clone(),
        _ => vec![],
    };
    let value = serde_json::json!({
        "id": Uuid::new_v4().to_string(),
        "name": name,
        "icon": icon,
        "color": color,
        "path": path
    });

    libraries.push(value.clone());
    store.set("libraries", Value::Array(libraries));

    store.save().map_err(|e| e.to_string())?;
    Ok(value)
}

#[tauri::command]
pub fn get_items(app: AppHandle, library_id: String) -> Result<Vec<utils::Item>, String> {
    let conn = get_db_connection(&app, &library_id)?;
    let mut stmt = conn.prepare("SELECT * FROM item ORDER BY created_at DESC").map_err(|e| utils::treat(e, "Unable to obtain items"))?;

    let item_iter = stmt.query_map([], |row| utils::deserialize_item(row)).map_err(|e| utils::treat(e, "Unable to obtain items"))?;

    let mut items = Vec::new();
    for item in item_iter {
        items.push(item.map_err(|e| utils::treat(e, "Unable to obtain items"))?);
    }

    Ok(items)
}

#[tauri::command]
pub async fn verify_conflicts(source_paths: Vec<String>) -> Result<utils::ImportCandidate, String> {
    let mut photo_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut video_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut others: Vec<String> = Vec::new();

    for path_str in &source_paths {
        let path = Path::new(path_str);
        if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
            let mime = utils::map_extension_to_mime(&ext);

            if mime.starts_with("image/") {
                photo_map.entry(stem.to_string()).or_default().push(path_str.clone());
            } else if mime.starts_with("video/") {
                video_map.entry(stem.to_string()).or_default().push(path_str.clone());
            } else {
                others.push(path_str.clone());
            }
        }
    }

    let mut items_to_import = Vec::new();
    let mut conflicts = Vec::new();

    for (stem, photos) in photo_map {
        for photo_path in photos {
            if let Some(videos) = video_map.get(&stem) {
                if videos.len() == 1 {
                    items_to_import.push(utils::ImportItem {
                        source_path: photo_path,
                        live_video_path: Some(videos[0].clone()),
                    });
                } else {
                    conflicts.push(utils::Conflict {
                        photo_path: photo_path,
                        video_candidates: videos.clone(),
                    });
                }
            } else {
                items_to_import.push(utils::ImportItem {
                    source_path: photo_path,
                    live_video_path: None,
                });
            }
        }
    }

    let consumed_videos: Vec<String> = items_to_import.iter().filter_map(|i| i.live_video_path.clone()).collect();
    
    for (_, videos) in video_map {
        for video in videos {
            if !consumed_videos.contains(&video) {
                let is_conflict_candidate = conflicts.iter().any(|c| c.video_candidates.contains(&video));
                if !is_conflict_candidate {
                    items_to_import.push(utils::ImportItem {
                        source_path: video,
                        live_video_path: None,
                    });
                }
            }
        }
    }

    for other in others {
        items_to_import.push(utils::ImportItem { source_path: other, live_video_path: None });
    }

    Ok(utils::ImportCandidate { items_to_import, conflicts })
}


#[tauri::command]
pub async fn add_items(app: AppHandle, library_id: String, items: Vec<utils::ImportItem>, delete_source: bool) -> Result<Vec<utils::Item>, String> {
    let library_root = get_library_root_path(&app, &library_id)?;
    let originals_dir = library_root.join("originals");
    fs::create_dir_all(&originals_dir).map_err(|e| utils::treat(e, "Unable to create required directory"))?;
    let thumbs_dir = library_root.join("thumbnails");
    fs::create_dir_all(&thumbs_dir).map_err(|e| utils::treat(e, "Unable to create required directory"))?;
    let adjustments_dir = library_root.join("adjustments");
    fs::create_dir_all(&adjustments_dir).map_err(|e| utils::treat(e, "Unable to create required directory"))?;

    let processed_count = atomic::AtomicUsize::new(0);
    let app_handle = app.clone();

    let results: Result<Vec<utils::Item>, String> = items
        .par_iter()
        .map(|item| {
            let result = prepare_item(item, &originals_dir, &thumbs_dir, &adjustments_dir, delete_source);
            
            let current = processed_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed) + 1;
            let _ = app_handle.emit("import-progress", current);

            result
        })
        .collect();

    let processed_items = results.map_err(|e| utils::treat(e, "Unable to prepare items"))?;

    let mut conn = get_db_connection(&app, &library_id)?;
    let tx = conn.transaction().map_err(|e| utils::treat(e, "Unable to begin transaction"))?;

    {
        let mut stmt = tx.prepare(
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
                is_favorite,
                is_screenshot,
                is_screen_recording,
                live_video,
                raw_original_name,
                raw_file_size,
                raw_checksum,
                has_adjustments,
                created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)"
        ).map_err(|e| utils::treat(e, "Unable to prepare statement"))?;

        for item in &processed_items {
            stmt.execute(params![
                item.id,
                item.original_name,
                item.file_ext,
                item.file_type,
                item.file_size,
                item.width,
                item.height,
                item.duration,
                item.checksum,
                item.is_favorite as i32,
                item.is_screenshot as i32,
                item.is_screen_recording as i32,
                item.live_video,
                item.raw_original_name,
                item.raw_file_size,
                item.raw_checksum,
                item.has_adjustments as i32,
                item.created_at.to_rfc3339()
            ]).map_err(|e| utils::treat(e, "Unable to import item to the library"))?;
        }
    }

    tx.commit().map_err(|e| utils::treat(e, "Unable to commit transaction"))?;

    Ok(processed_items)
}

fn prepare_item(import_item: &utils::ImportItem, originals_dir: &Path, thumbs_dir: &Path, adjustments_dir: &Path, delete_source: bool) -> Result<utils::Item, String> {
    let source_path = Path::new(&import_item.source_path);
    if !source_path.exists() {
        return Err(format!("Source file does not exist: {}", import_item.source_path));
    }

    let original_name = source_path.file_name().and_then(|n| n.to_str()).ok_or("Invalid file name")?;
    let file_extension = source_path.extension().and_then(|ext| ext.to_str()).unwrap_or("");
    let file_type = utils::map_extension_to_mime(file_extension);

    let file_data = fs::read(source_path).map_err(|e| utils::treat(e, "Unable to read photo data"))?;
    let checksum = format!("{:x}", md5::compute(&file_data));
    let file_size = file_data.len() as u64;

    let mut image = utils::load_image(&file_data, file_extension)?;

    if ["jpg", "jpeg"].contains(&file_extension.to_lowercase().as_str()) {
        if let Ok(reader) = exif::Reader::new().read_from_container(&mut Cursor::new(&file_data)) {
            if let Some(orientation_field) = reader.get_field(exif::Tag::Orientation, exif::In::PRIMARY) {
                let orientation = orientation_field.value.get_uint(0).unwrap_or(1);

                image = match orientation {
                    2 => image.fliph(),
                    3 => image.rotate180(),
                    4 => image.flipv(),
                    5 => image.rotate90().fliph(),
                    6 => image.rotate90(),
                    7 => image.rotate270().fliph(),
                    8 => image.rotate270(),
                    _ => image,
                };
            }
        }
    }

    let (width, height) = image.dimensions();
    let item_id = Uuid::new_v4().to_string();
    let file_name = format!("{}.{}", item_id, file_extension);

    let dest_path = originals_dir.join(&file_name);
    fs::copy(source_path, &dest_path).map_err(|e| utils::treat(e, "Unable to copy item"))?;

    let thumb_path = thumbs_dir.join(format!("{}.webp", item_id));
    generate_thumbnail(&image, &thumb_path)?;

    let mut live_video_name: Option<String> = None;
    if let Some(live_video_src) = &import_item.live_video_path {
        let lv_src_path = Path::new(live_video_src);
        if lv_src_path.exists() {
            let lv_ext = lv_src_path.extension().and_then(|e| e.to_str()).unwrap_or("mov");
            let lv_name = format!("{}.{}", item_id, lv_ext);
            let lv_dest = originals_dir.join(&lv_name);
            fs::copy(lv_src_path, &lv_dest).map_err(|e| utils::treat(e, "Unable to copy live video"))?;
            live_video_name = Some(lv_name);
            
            if delete_source {
                let _ = fs::remove_file(lv_src_path);
            }
        }
    }

    if delete_source {
        let _ = fs::remove_file(source_path);
    }

    Ok(utils::Item {
        id: item_id,
        original_name: original_name.to_string(),
        file_ext: file_extension.to_string(),
        file_type: file_type.to_string(),
        file_size,
        width,
        height,
        duration,
        checksum,
        is_favorite: false,
        is_screenshot: false,
        is_screen_recording: false,
        live_video: live_video_name,
        raw_original_name,
        raw_file_size,
        raw_checksum,
        has_adjustments: import_item.aae_record_path.is_some(),
        created_at: Utc::now()
    })
}

#[tauri::command]
pub fn set_items_favorite(app: AppHandle, library_id: String, item_ids: Vec<String>, value: bool) -> Result<(), String> {
    if item_ids.is_empty() {
        return Ok(());
    }

    let mut conn = get_db_connection(&app, &library_id)?;
    let tx = conn.transaction().map_err(|e| utils::treat(e, "Unable to begin transaction"))?;
    for item_id in &item_ids {
        tx.execute(
            "UPDATE item SET is_favorite = ?1 WHERE id = ?2",
            params![
                if value { 1 } else { 0 },
                item_id
            ],
        ).map_err(|e| utils::treat(e, "Unable to update the item favorite state"))?;
    }
    tx.commit().map_err(|e| utils::treat(e, "Unable to save favorite items"))?;
    Ok(())
}

fn generate_thumbnail(img: &DynamicImage, output_path: &Path) -> Result<(), String> {
    let thumb = img.thumbnail(512, 512);

    let mut out_file = fs::File::create(output_path).map_err(|e| utils::treat(e, "Unable to generate thumbnail"))?;
    thumb.write_to(&mut out_file, ImageFormat::WebP).map_err(|e| utils::treat(e, "Unable to write thumbnail"))?;

    Ok(())
}

#[tauri::command]
pub fn get_albums(app: AppHandle, library_id: String, parent: Option<String>) -> Result<Vec<utils::Album>, String> {
    let conn = get_db_connection(&app, &library_id)?;
    let mut stmt = conn.prepare("SELECT * FROM album WHERE parent IS ?1 ORDER BY created_at DESC").map_err(|e| utils::treat(e, "Unable to obtain albums"))?;

    let album_iter = stmt.query_map(params![parent], |row| utils::deserialize_album(row)).map_err(|e| utils::treat(e, "Unable to obtain albums"))?;

    let mut albums = Vec::new();
    for album in album_iter {
        albums.push(album.map_err(|e| utils::treat(e, "Unable to obtain albums"))?);
    }

    Ok(albums)
}

#[tauri::command]
pub fn create_album(app: AppHandle, library_id: String, name: String, description: String, parent: Option<String>, icon: Option<String>, color: Option<String>) -> Result<utils::Album, String> {
    let conn = get_db_connection(&app, &library_id)?;
    let album_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    let album = utils::Album {
        id: album_id.clone(),
        name: name.clone(),
        description: description.clone(),
        parent: parent.clone(),
        selected_cover: 0,
        icon: icon.clone(),
        color: color.clone(),
        cover_photo: None,
        created_at: now,
    };

    conn.execute(
        "INSERT INTO album (id, name, description, parent, selected_cover, icon, color, cover_photo, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            album.id,
            album.name,
            album.description,
            album.parent,
            album.selected_cover,
            album.icon,
            album.color,
            album.cover_photo,
            album.created_at.to_rfc3339()
        ],
    ).map_err(|e| utils::treat(e, "Insert Error"))?;

    Ok(album)
}

#[tauri::command]
pub fn add_items_to_album(app: AppHandle, library_id: String, album_id: String, item_ids: Vec<String>) -> Result<(), String> {
    let conn = get_db_connection(&app, &library_id)?;
    let now = Utc::now();

    for item_id in item_ids {
        conn.execute(
            "INSERT INTO album_item (album_id, item_id, created_at) VALUES (?1, ?2, ?3)",
            params![album_id, item_id, now.to_rfc3339()],
        ).map_err(|e| utils::treat(e, "Unable to insert item into album"))?;
    }

    Ok(())
}

#[tauri::command]
pub fn remove_items_from_album(app: AppHandle, library_id: String, album_id: String, item_ids: Vec<String>) -> Result<(), String> {
    let conn = get_db_connection(&app, &library_id)?;

    for item_id in item_ids {
        conn.execute(
            "DELETE FROM album_item WHERE album_id = ?1 AND item_id = ?2",
            params![album_id, item_id],
        ).map_err(|e| utils::treat(e, "Unable to remove item from album"))?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_album_items(app: AppHandle, library_id: String, album_id: String) -> Result<Vec<utils::ItemAlbumRef>, String> {
    let conn = get_db_connection(&app, &library_id)?;

    let mut stmt = conn.prepare(
        "SELECT p.*, ai.created_at as added_at FROM item p 
        INNER JOIN album_item ai ON p.id = ai.item_id 
        WHERE ai.album_id = ?1 
        ORDER BY ai.created_at DESC"
    ).map_err(|e| utils::treat(e, "Unable to obtain album items"))?;

    let item_iter = stmt.query_map(params![album_id], |row| utils::deserialize_item_album_ref(row)).map_err(|e| utils::treat(e, "Unable to obtain album items"))?;

    let mut items = Vec::new();
    for item in item_iter {
        items.push(item.map_err(|e| utils::treat(e, "Unable to obtain album items"))?);
    }

    Ok(items)
}