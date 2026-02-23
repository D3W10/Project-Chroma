use chrono::{DateTime, NaiveDateTime, Utc};
use image::GenericImageView;
use rayon::prelude::*;
use rusqlite::Connection;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::{Arc, atomic};
use tauri::{AppHandle, Emitter, async_runtime::spawn_blocking};
use uuid::Uuid;

use crate::modules;
use crate::modules::config;
use crate::modules::db;
use crate::modules::migrations;
use crate::modules::utils;

fn get_db_connection(app: &AppHandle, library_id: &str) -> Result<Connection, String> {
    let meta_path = get_library_root_path(app, library_id)?;
    if !meta_path.exists() {
        log::error!("Library {} not found", library_id);
        return Err("notfound".to_string());
    }

    let db_path = meta_path.join("lib.db");
    db::open_connection(&db_path)
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
    let mut conn = get_db_connection(&app, &library_id)?;

    let version = db::fetch_library_version(&conn)?;
    let latest = migrations::get_latest_version();

    if version < latest {
        log::error!("Library {}", upgrade.unwrap_or(false));
        if upgrade.unwrap_or(false) {
            migrations::migrate_to_latest(version, &mut conn).map(|_| true)
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

    let conn = db::create_connection(&full_path.join("lib.db"))?;
    db::create_library_schema(&conn)?;
    db::insert_library_metadata(&conn, name, icon, color)?;
    migrations::label_latest(conn)?;

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
pub fn get_library_info_from_path(path: &str) -> Result<Value, String> {
    let conn = db::open_connection(&Path::new(path).join("lib.db"))?;
    db::fetch_library_info(&conn)
}

#[tauri::command]
pub fn add_library(app: AppHandle, path: String) -> Result<Value, String> {
    let info = get_library_info_from_path(&path)?;

    let library_id = Uuid::new_v4().to_string();
    let name = info.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown");
    let icon = info.get("icon").and_then(|v| v.as_str()).unwrap_or("");
    let color = info.get("color").and_then(|v| v.as_str()).unwrap_or("");

    let store = config::get_store(&app)?;
    let mut libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr.clone(),
        _ => vec![],
    };

    let value = serde_json::json!({
        "id": library_id,
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
pub fn get_items(app: AppHandle, library_id: String) -> Result<Vec<modules::Item>, String> {
    db::fetch_items(&get_db_connection(&app, &library_id)?)
}

#[tauri::command]
pub async fn verify_conflicts(source_paths: Vec<String>, check_live_photos: bool, parse_edits: bool) -> Result<modules::ImportCandidate, String> {
    let mut groups: HashMap<String, modules::Group> = HashMap::new();
    let empty_group = || -> modules::Group {
        modules::Group {
            original_items: vec![],
            edited_items: vec![],
            original_videos: vec![],
            edited_videos: vec![],
            adjustments: None,
        }
    };
    let unedited_name = |name: &str| -> String { format!("IMG_{}", &name[5..]) };

    for path_str in &source_paths {
        let path = Path::new(path_str);
        if path.file_name().and_then(|s| s.to_str()).is_some() {
            let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
            let mime = utils::map_extension_to_mime(path.extension().and_then(|s| s.to_str()).unwrap_or(""));

            if path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase() == "aae" {
                groups.entry(stem.to_string()).or_insert(empty_group()).adjustments = Some(path_str.clone());
                continue;
            }

            if mime.starts_with("image/") {
                if parse_edits && stem.starts_with("IMG_E") {
                    groups.entry(unedited_name(stem)).or_insert(empty_group()).edited_items.push(path_str.clone());
                } else {
                    groups.entry(stem.to_string()).or_insert(empty_group()).original_items.push(path_str.clone());
                }
            } else if mime.starts_with("video/") {
                if parse_edits && stem.starts_with("IMG_E") {
                    if check_live_photos {
                        groups.entry(unedited_name(stem)).or_insert(empty_group()).edited_videos.push(path_str.clone());
                    } else {
                        groups.entry(unedited_name(stem)).or_insert(empty_group()).edited_items.push(path_str.clone());
                    }
                } else {
                    if check_live_photos {
                        groups.entry(stem.to_string()).or_insert(empty_group()).original_videos.push(path_str.clone());
                    } else if parse_edits {
                        groups.entry(stem.to_string()).or_insert(empty_group()).original_items.push(path_str.clone());
                    } else {
                        groups.entry(stem.to_string() + "_V").or_insert(empty_group()).original_items.push(path_str.clone());
                    }
                }
            }
        }
    }

    let mut items_to_import = Vec::new();
    let mut conflicts = Vec::new();

    for (_, group) in groups {
        if group.original_items.len() > 1 || group.edited_items.len() > 1 || group.original_videos.len() > 1 || group.edited_videos.len() > 1 {
            conflicts.push(group);
        } else {
            let orig_item = group.original_items.first();
            let edit_item = group.edited_items.first();
            let orig_live_video = group.original_videos.first();
            let edit_live_video = group.edited_videos.first();
            let adjustments = group.adjustments;

            if parse_edits && let Some(edit_item) = edit_item {
                items_to_import.push(modules::ImportItem {
                    source_path: edit_item.clone(),
                    live_path: edit_live_video.cloned(),
                    original_source_path: orig_item.cloned(),
                    original_live_path: orig_live_video.cloned(),
                    adjustments_path: adjustments,
                });
            } else if let Some(orig_item) = orig_item {
                items_to_import.push(modules::ImportItem {
                    source_path: orig_item.clone(),
                    live_path: orig_live_video.cloned(),
                    original_source_path: None,
                    original_live_path: None,
                    adjustments_path: adjustments,
                });
            } else if let Some(edit_live_video) = edit_live_video {
                items_to_import.push(modules::ImportItem {
                    source_path: edit_live_video.clone(),
                    live_path: None,
                    original_source_path: orig_live_video.cloned(),
                    original_live_path: None,
                    adjustments_path: adjustments,
                });
            } else if let Some(orig_live_video) = orig_live_video {
                items_to_import.push(modules::ImportItem {
                    source_path: orig_live_video.clone(),
                    live_path: None,
                    original_source_path: None,
                    original_live_path: None,
                    adjustments_path: adjustments,
                });
            }
        }
    }

    Ok(modules::ImportCandidate { items_to_import, conflicts })
}

#[tauri::command]
pub async fn add_items(app: AppHandle, library_id: String, items: Vec<modules::ImportItem>, delete_source: bool) -> Result<Vec<modules::Item>, String> {
    let library_root = get_library_root_path(&app, &library_id)?;
    let originals_dir = library_root.join("originals");
    fs::create_dir_all(&originals_dir).map_err(|e| utils::treat(e, "Unable to create required directory"))?;
    let thumbs_dir = library_root.join("thumbnails");
    fs::create_dir_all(&thumbs_dir).map_err(|e| utils::treat(e, "Unable to create required directory"))?;
    let adjustments_dir = library_root.join("adjustments");
    fs::create_dir_all(&adjustments_dir).map_err(|e| utils::treat(e, "Unable to create required directory"))?;

    let processed_count = atomic::AtomicUsize::new(0);
    let app_handle = app.clone();

    let app_handle_clone = app_handle.clone();
    let original_dir_clone = originals_dir.clone();
    let thumbs_dir_clone = thumbs_dir.clone();
    let adjustments_dir_clone = adjustments_dir.clone();
    let processed_count = Arc::new(processed_count);

    let results: Result<Vec<modules::Item>, String> = spawn_blocking(move || {
        items
            .par_iter()
            .map(|item| {
                let result = prepare_item(&app_handle_clone, item, &original_dir_clone, &thumbs_dir_clone, &adjustments_dir_clone, delete_source);
                
                let current = processed_count.fetch_add(1, atomic::Ordering::Relaxed) + 1;
                let _ = app_handle_clone.emit("import-progress", current);

                result
            })
            .collect()
    }).await.map_err(|e| utils::treat(e, "Task join error"))?;

    let processed_items = results.map_err(|e| utils::treat(e, "Unable to prepare items"))?;
    let conn = get_db_connection(&app, &library_id)?;

    for item in &processed_items {
        db::insert_item(&conn, item)?;
    }

    Ok(processed_items)
}

fn prepare_item(app: &AppHandle, import_item: &modules::ImportItem, originals_dir: &Path, thumbs_dir: &Path, adjustments_dir: &Path, delete_source: bool) -> Result<modules::Item, String> {
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

    let item_id = Uuid::new_v4().to_string();
    let file_name = format!("{}.{}", item_id, file_extension);
    let dest_path = originals_dir.join(&file_name);

    fs::copy(source_path, &dest_path).map_err(|e| utils::treat(e, "Unable to copy item"))?;

    let width;
    let height;
    let mut duration = 0;
    let mut taken_date = fs::metadata(source_path)
        .ok()
        .and_then(|metadata| metadata.created().or_else(|_| metadata.modified()).ok())
        .map(DateTime::<Utc>::from)
        .unwrap_or_else(Utc::now);

    if !utils::map_extension_to_mime(file_extension).starts_with("video/") {
        let mut image = utils::load_image(&file_data, file_extension)?;

        if ["jpg", "jpeg", "heic", "heif"].contains(&file_extension.to_lowercase().as_str()) {
            if let Ok(reader) = exif::Reader::new().read_from_container(&mut Cursor::new(&file_data)) {
                if let Some(date_field) = reader.get_field(exif::Tag::DateTimeOriginal, exif::In::PRIMARY) {
                    let date_str = date_field.display_value().to_string();
                    if let Ok(parsed_date) = NaiveDateTime::parse_from_str(&date_str, "%Y-%m-%d %H:%M:%S") {
                        taken_date = DateTime::from_naive_utc_and_offset(parsed_date, Utc);
                    }
                }

                if ["jpg", "jpeg"].contains(&file_extension.to_lowercase().as_str()) && let Some(orientation_field) = reader.get_field(exif::Tag::Orientation, exif::In::PRIMARY) {
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

        let (w, h) = image.dimensions();
        width = w;
        height = h;

        let thumb_path = thumbs_dir.join(format!("{}.webp", item_id));
        utils::generate_image_thumbnail(&image, &thumb_path)?;
    } else {
        let (w, h, d) = utils::get_video_metadata(app, source_path)?;
        width = w;
        height = h;
        duration = d;

        let thumb_path = thumbs_dir.join(format!("{}.webp", item_id));
        utils::generate_video_thumbnail(app, source_path, &thumb_path)?;
    }

    let mut raw_original_name: Option<String> = None;
    let mut raw_file_size: Option<u64> = None;
    let mut raw_checksum: Option<String> = None;

    if let Some(original_source_path) = &import_item.original_source_path {
        let original_source_path = Path::new(original_source_path);
        if original_source_path.exists() {
            if let Ok(orig_data) = fs::read(original_source_path) {
                raw_file_size = Some(orig_data.len() as u64);
                raw_checksum = Some(format!("{:x}", md5::compute(&orig_data)));
            }

            if let Some(orig_name) = original_source_path.file_name().and_then(|n| n.to_str()) {
                raw_original_name = Some(orig_name.to_string());
            }

            let orig_ext = original_source_path.extension().and_then(|e| e.to_str()).unwrap_or("");
            let orig_dest_name = format!("{}-orig.{}", item_id, orig_ext);
            fs::copy(original_source_path, originals_dir.join(&orig_dest_name)).map_err(|e| utils::treat(e, "Unable to copy original item"))?;

            if delete_source {
                let _ = fs::remove_file(original_source_path);
            }
        }
    }

    if let Some(adjustments_path) = &import_item.adjustments_path {
        let adjustments_path = Path::new(adjustments_path);
        if adjustments_path.exists() {
            fs::copy(adjustments_path, adjustments_dir.join(format!("{}.AAE", item_id))).map_err(|e| utils::treat(e, "Unable to copy adjustments"))?;

            if delete_source {
                let _ = fs::remove_file(adjustments_path);
            }
        }
    }

    let mut live_video_name: Option<String> = None;
    if let Some(live_path) = &import_item.live_path {
        let live_path = Path::new(live_path);
        if live_path.exists() {
            let lv_ext = live_path.extension().and_then(|e| e.to_str()).unwrap_or("mov");
            let lv_name = format!("{}.{}", item_id, lv_ext);
            fs::copy(live_path, originals_dir.join(&lv_name)).map_err(|e| utils::treat(e, "Unable to copy live video"))?;
            live_video_name = Some(lv_name);

            if delete_source {
                let _ = fs::remove_file(live_path);
            }
        }
    }

    let mut original_live_video_name: Option<String> = None;
    if let Some(original_live_path) = &import_item.original_live_path {
        let original_live_path = Path::new(original_live_path);
        if original_live_path.exists() {
            let olv_ext = original_live_path.extension().and_then(|e| e.to_str()).unwrap_or("mov");
            let olv_name = format!("{}-orig.{}", item_id, olv_ext);
            fs::copy(original_live_path, originals_dir.join(&olv_name)).map_err(|e| utils::treat(e, "Unable to copy original live video"))?;
            original_live_video_name = Some(olv_name);

            if delete_source {
                let _ = fs::remove_file(original_live_path);
            }
        }
    }

    if delete_source {
        let _ = fs::remove_file(source_path);
    }

    Ok(modules::Item {
        id: item_id,
        original_name: original_name.to_string(),
        file_ext: file_extension.to_string(),
        file_type: file_type.to_string(),
        file_size,
        width,
        height,
        duration,
        checksum,
        taken_date,
        is_favorite: false,
        is_screenshot: false,
        is_screen_recording: false,
        live_video: live_video_name,
        raw_original_name,
        raw_file_size,
        raw_checksum,
        raw_live_video: original_live_video_name,
        has_adjustments: import_item.adjustments_path.is_some(),
        created_at: Utc::now(),
    })
}

#[tauri::command]
pub fn set_items_favorite(app: AppHandle, library_id: String, item_ids: Vec<String>, value: bool) -> Result<(), String> {
    if item_ids.is_empty() {
        return Ok(());
    }

    db::set_items_favorite(&get_db_connection(&app, &library_id)?, &item_ids, value)
}

#[tauri::command]
pub fn transfer_items(app: AppHandle, source_id: String, target_id: String, item_ids: Vec<String>, do_move: Option<bool>) -> Result<(), String> {
    if item_ids.is_empty() {
        return Ok(());
    }

    if source_id == target_id {
        return Err("same_library".to_string());
    }

    let do_move = do_move.unwrap_or(false);

    let source_root = get_library_root_path(&app, &source_id)?;
    let target_root = get_library_root_path(&app, &target_id)?;

    let conn_src = get_db_connection(&app, &source_id)?;
    let conn_tgt = get_db_connection(&app, &target_id)?;

    for id in &item_ids {
        let item = db::fetch_item(&conn_src, id)?;

        transfer_items_over(&source_root, &target_root, &item, do_move)?;
        db::insert_item(&conn_tgt, &item)?;

        if do_move {
            db::delete_item(&conn_src, id)?;
        }
    }

    Ok(())
}

fn transfer_items_over(source_root: &Path, target_root: &Path, item: &modules::Item, remove_source: bool) -> Result<(), String> {
    let source_originals = source_root.join("originals");
    let target_originals = target_root.join("originals");
    let source_thumbnails = source_root.join("thumbnails");
    let target_thumbnails = target_root.join("thumbnails");
    let source_adjustments = source_root.join("adjustments");
    let target_adjustments = target_root.join("adjustments");

    transfer_file(
        &source_originals.join(format!("{}.{}", item.id, item.file_ext)),
        &target_originals.join(format!("{}.{}", item.id, item.file_ext)),
        remove_source,
    )?;

    if let Some(raw_original_name) = &item.raw_original_name {
        let raw_ext = Path::new(raw_original_name).extension().and_then(|ext| ext.to_str()).unwrap_or("");
        let raw_file_name = format!("{}-orig.{}", item.id, raw_ext);

        transfer_file(
            &source_originals.join(&raw_file_name),
            &target_originals.join(&raw_file_name),
            remove_source,
        )?;
    }

    if let Some(live_video) = &item.live_video {
        transfer_file(
            &source_originals.join(live_video),
            &target_originals.join(live_video),
            remove_source,
        )?;
    }

    if let Some(raw_live_video) = &item.raw_live_video {
        transfer_file(
            &source_originals.join(raw_live_video),
            &target_originals.join(raw_live_video),
            remove_source,
        )?;
    }

    transfer_file(
        &source_thumbnails.join(format!("{}.webp", item.id)),
        &target_thumbnails.join(format!("{}.webp", item.id)),
        remove_source,
    )?;

    if item.has_adjustments {
        transfer_file(
            &source_adjustments.join(format!("{}.AAE", item.id)),
            &target_adjustments.join(format!("{}.AAE", item.id)),
            remove_source,
        )?;
    }

    Ok(())
}

fn transfer_file(source: &Path, target: &Path, remove_source: bool) -> Result<(), String> {
    if !source.exists() {
        return Ok(());
    }

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| utils::treat(e, "Unable to prepare target directory"))?;
    }

    if remove_source {
        match fs::rename(source, target) {
            Ok(_) => Ok(()),
            Err(_) => {
                fs::copy(source, target).map_err(|e| utils::treat(e, "Unable to copy file"))?;
                fs::remove_file(source).map_err(|e| utils::treat(e, "Unable to remove source file"))?;
                Ok(())
            }
        }
    } else {
        fs::copy(source, target).map_err(|e| utils::treat(e, "Unable to copy file"))?;
        Ok(())
    }
}

#[tauri::command]
pub fn delete_items(app: AppHandle, library_id: String, item_ids: Vec<String>) -> Result<(), String> {
    let library_root = get_library_root_path(&app, &library_id)?;
    let conn = get_db_connection(&app, &library_id)?;

    for id in &item_ids {
        if let Ok(item) = db::fetch_item(&conn, id) {
            db::delete_item(&conn, id)?;

            let originals_root = library_root.join("originals");
            let main_original_path = originals_root.join(format!("{}.{}", id, item.file_ext));
            if main_original_path.exists() {
                let _ = fs::remove_file(main_original_path);
            }

            if let Some(lv) = item.live_video {
                let lv_ext = Path::new(&lv).extension().and_then(|e| e.to_str()).unwrap_or("");
                let lv_path = originals_root.join(format!("{}.{}", id, lv_ext));
                if lv_path.exists() {
                    let _ = fs::remove_file(lv_path);
                }
            }

            if let Some(raw_original_name) = item.raw_original_name {
                let raw_ext = Path::new(&raw_original_name).extension().and_then(|e| e.to_str()).unwrap_or("");
                let raw_path = originals_root.join(format!("{}-orig.{}", id, raw_ext));
                if raw_path.exists() {
                    let _ = fs::remove_file(raw_path);
                }
            }

            if let Some(raw_lv) = item.raw_live_video {
                let raw_ext = Path::new(&raw_lv).extension().and_then(|e| e.to_str()).unwrap_or("");
                let raw_lv_path = originals_root.join(format!("{}-orig.{}", id, raw_ext));
                if raw_lv_path.exists() {
                    let _ = fs::remove_file(raw_lv_path);
                }
            }

            if item.has_adjustments {
                let adjustments_path = library_root.join("adjustments").join(format!("{}.AAE", id));
                if adjustments_path.exists() {
                    let _ = fs::remove_file(adjustments_path);
                }
            }

            let thumb_path = library_root.join("thumbnails").join(format!("{}.webp", id));
            if thumb_path.exists() {
                let _ = fs::remove_file(thumb_path);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_albums(app: AppHandle, library_id: String, parent: Option<String>) -> Result<Vec<modules::AlbumComp>, String> {
    db::fetch_albums(&get_db_connection(&app, &library_id)?, parent)
}

#[tauri::command]
pub fn create_album(app: AppHandle, library_id: String, name: String, description: String, parent: Option<String>, icon: Option<String>, color: Option<String>) -> Result<modules::Album, String> {
    let conn = get_db_connection(&app, &library_id)?;
    let album_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    let album = modules::Album {
        id: album_id.clone(),
        name: name.clone(),
        description: description.clone(),
        parent: parent.clone(),
        selected_cover: 0,
        selected_banner: 0,
        icon: icon.clone(),
        color: color.clone(),
        cover_photo: None,
        banner_photo: None,
        created_at: now,
    };

    db::insert_album(&conn, &album)?;
    Ok(album)
}

#[tauri::command]
pub fn add_items_to_album(app: AppHandle, library_id: String, album_id: String, item_ids: Vec<String>) -> Result<(), String> {
    db::add_items_to_album(&get_db_connection(&app, &library_id)?, &album_id, &item_ids)
}

#[tauri::command]
pub fn remove_items_from_album(app: AppHandle, library_id: String, album_id: String, item_ids: Vec<String>) -> Result<(), String> {
    db::remove_items_from_album(&get_db_connection(&app, &library_id)?, &album_id, &item_ids)
}

#[tauri::command]
pub fn get_album_items(app: AppHandle, library_id: String, album_id: String) -> Result<Vec<modules::ItemAlbumRef>, String> {
    db::fetch_album_items(&get_db_connection(&app, &library_id)?, &album_id)
}