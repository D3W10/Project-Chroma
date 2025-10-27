use chrono::{DateTime, Utc};
use image::{DynamicImage, GenericImageView, ImageFormat};
use rusqlite::{params, Connection};
use serde_json::Value;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::modules::config::get_store;
use crate::modules::utils;

fn get_db_connection(app: &tauri::AppHandle, library_id: &str) -> Result<Connection, String> {
    let meta_path = get_library_root_path(app, library_id)?;
    let db_path = meta_path.join("photos.db");
    Connection::open(db_path).map_err(|e| utils::treat(e, "Unable to open database"))
}

fn get_library_root_path(app: &tauri::AppHandle, library_id: &str) -> Result<PathBuf, String> {
    let store = get_store(&app)?;
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
pub fn get_photos(app: tauri::AppHandle, library_id: String) -> Result<Vec<utils::Photo>, String> {
    let conn = get_db_connection(&app, &library_id)?;
    let mut stmt = conn.prepare("SELECT * FROM photo ORDER BY created_at DESC").map_err(|e| utils::treat(e, "Unable to obtain photos"))?;

    let photo_iter = stmt.query_map([], |row| {
        Ok(utils::Photo {
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
                .map_err(|_| {
                    rusqlite::Error::InvalidColumnType(
                        10,
                        "created_at".to_string(),
                        rusqlite::types::Type::Text,
                    )
                })?
                .with_timezone(&Utc),
        })
    })
    .map_err(|e| utils::treat(e, "Unable to obtain photos"))?;

    let mut photos = Vec::new();
    for photo in photo_iter {
        photos.push(photo.map_err(|e| utils::treat(e, "Unable to obtain photos"))?);
    }

    Ok(photos)
}

#[tauri::command]
pub async fn add_photo(app: tauri::AppHandle, library_id: String, source_path: String) -> Result<utils::Photo, String> {
    let library_root = get_library_root_path(&app, &library_id)?;

    let source_path = Path::new(&source_path);
    if !source_path.exists() {
        return Err("Source file does not exist".to_string());
    }

    let original_name = source_path.file_name().and_then(|n| n.to_str()).ok_or("Invalid file name")?;
    let file_extension = source_path.extension().and_then(|ext| ext.to_str()).unwrap_or("");
    let file_type = utils::map_extension_to_mime(file_extension);

    let file_data = fs::read(source_path).map_err(|e| utils::treat(e, "Unable to read phot data"))?;
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
    let photo_id = Uuid::new_v4().to_string();
    let file_name = format!("{}.{}", photo_id, file_extension);

    let originals_dir = library_root.join("originals");
    fs::create_dir_all(&originals_dir).map_err(|e| utils::treat(e, "Unable to create required directory"))?;
    let dest_path = originals_dir.join(&file_name);

    fs::copy(source_path, &dest_path).map_err(|e| utils::treat(e, "Unable to copy photo"))?;

    let thumbs_dir = library_root.join("thumbnails");
    fs::create_dir_all(&thumbs_dir).map_err(|e| utils::treat(e, "Unable to create required directory"))?;
    let thumb_path = thumbs_dir.join(format!("{}.webp", photo_id));
    generate_thumbnail(&image, &thumb_path)?;

    let now = Utc::now();
    let photo = utils::Photo {
        id: photo_id.clone(),
        original_name: original_name.to_string(),
        file_type: file_type.to_string(),
        file_size,
        width,
        height,
        checksum,
        is_favorite: false,
        is_screenshot: false,
        is_screen_recording: false,
        created_at: now,
    };

    let conn = get_db_connection(&app, &library_id)?;
    conn.execute(
        "INSERT INTO photo (id, original_name, file_type, file_size, width, height, checksum, is_favorite, is_screenshot, is_screen_recording, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            photo.id,
            photo.original_name,
            photo.file_type,
            photo.file_size,
            photo.width,
            photo.height,
            photo.checksum,
            photo.is_favorite as i32,
            photo.is_screenshot as i32,
            photo.is_screen_recording as i32,
            photo.created_at.to_rfc3339()
        ],
    ).map_err(|e| utils::treat(e, "Unable to add photo to the library"))?;

    Ok(photo)
}

fn generate_thumbnail(img: &DynamicImage, output_path: &Path) -> Result<(), String> {
    let thumb = img.thumbnail(512, 512);

    let mut out_file = fs::File::create(output_path).map_err(|e| utils::treat(e, "Unable to generate thumbnail"))?;
    thumb.write_to(&mut out_file, ImageFormat::WebP).map_err(|e| utils::treat(e, "Unable to write thumbnail"))?;

    Ok(())
}