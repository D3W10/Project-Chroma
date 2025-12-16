use chrono::Utc;
use image::{DynamicImage, GenericImageView, ImageFormat};
use rusqlite::{params, Connection};
use serde_json::Value;
use rayon::prelude::*;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::modules::config;
use crate::modules::utils;

fn get_db_connection(app: &tauri::AppHandle, library_id: &str) -> Result<Connection, String> {
    let meta_path = get_library_root_path(app, library_id)?;
    let db_path = meta_path.join("lib.db");
    Connection::open(db_path).map_err(|e| utils::treat(e, "Unable to open database"))
}

fn get_library_root_path(app: &tauri::AppHandle, library_id: &str) -> Result<PathBuf, String> {
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
    Err("Library not found".to_string())
}

#[tauri::command]
pub fn get_items(app: tauri::AppHandle, library_id: String) -> Result<Vec<utils::Item>, String> {
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
pub async fn add_items(app: tauri::AppHandle, library_id: String, source_paths: Vec<String>, delete_source: bool) -> Result<Vec<utils::Item>, String> {
    let library_root = get_library_root_path(&app, &library_id)?;
    let originals_dir = library_root.join("originals");
    fs::create_dir_all(&originals_dir).map_err(|e| utils::treat(e, "Unable to create required directory"))?;
    let thumbs_dir = library_root.join("thumbnails");
    fs::create_dir_all(&thumbs_dir).map_err(|e| utils::treat(e, "Unable to create required directory"))?;

    let items: Result<Vec<utils::Item>, String> = source_paths
        .par_iter()
        .map(|path| prepare_item(path, &originals_dir, &thumbs_dir, delete_source))
        .collect();

    let items = items?;

    let mut conn = get_db_connection(&app, &library_id)?;
    let tx = conn.transaction().map_err(|e| utils::treat(e, "Unable to begin transaction"))?;

    {
        let mut stmt = tx.prepare(
            "INSERT INTO item (
                id,
                original_name,
                file_type,
                file_size,
                width,
                height,
                checksum,
                is_favorite,
                is_screenshot,
                is_screen_recording,
                live_video,
                created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)"
        ).map_err(|e| utils::treat(e, "Unable to prepare statement"))?;

        for item in &items {
            stmt.execute(params![
                item.id,
                item.original_name,
                item.file_type,
                item.file_size,
                item.width,
                item.height,
                item.checksum,
                item.is_favorite as i32,
                item.is_screenshot as i32,
                item.is_screen_recording as i32,
                item.live_video,
                item.created_at.to_rfc3339()
            ]).map_err(|e| utils::treat(e, "Unable to import item to the library"))?;
        }
    }

    tx.commit().map_err(|e| utils::treat(e, "Unable to commit transaction"))?;

    Ok(items)
}

fn prepare_item(source_path_str: &str, originals_dir: &Path, thumbs_dir: &Path, delete_source: bool) -> Result<utils::Item, String> {
    let source_path = Path::new(source_path_str);
    if !source_path.exists() {
        return Err(format!("Source file does not exist: {}", source_path_str));
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

    if delete_source {
        let _ = fs::remove_file(source_path);
    }

    Ok(utils::Item {
        id: item_id,
        original_name: original_name.to_string(),
        file_type: file_type.to_string(),
        file_size,
        width,
        height,
        checksum,
        is_favorite: false,
        is_screenshot: false,
        is_screen_recording: false,
        live_video: None,
        created_at: Utc::now(),
    })
}

#[tauri::command]
pub fn set_items_favorite(app: tauri::AppHandle, library_id: String, item_ids: Vec<String>, value: bool) -> Result<(), String> {
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