use log;
use rusqlite::Connection;
use serde_json::Value;
use std::fs;
use std::path::{Path};
use std::sync::Arc;
use tauri::Wry;
use tauri_plugin_store::{Store, StoreExt};
use uuid::Uuid;

use crate::modules::utils;

pub fn get_store(app: &tauri::AppHandle) -> Result<Arc<Store<Wry>>, String> {
    app.store("config.json").map_err(|e| utils::treat(e, "Unable to access the configuration file"))
}

fn save_store(store: Arc<Store<Wry>>) -> Result<(), std::string::String> {
    store.save().map_err(|e| utils::treat(e, "Unable to save the configuration file"))
}

#[tauri::command]
pub fn get_libraries(app: tauri::AppHandle) -> Result<Value, String> {
    let store = get_store(&app)?;
    if let Some(v) = store.get("libraries") {
        Ok(v.clone())
    } else {
        Ok(Value::Array(vec![]))
    }
}

#[tauri::command]
pub fn check_library_path(app: tauri::AppHandle, library_id: String) -> Result<bool, String> {
    let store = get_store(&app)?;
    let libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr,
        _ => vec![],
    };
    for lib in libraries {
        if lib.get("id").and_then(|v| v.as_str()) == Some(library_id.as_str()) {
            if let Some(path) = lib.get("path").and_then(|v| v.as_str()) {
                let base_path = Path::new(path);
                let db_path = base_path.join("photos.db");

                return Ok(base_path.exists() && db_path.exists());
            }
        }
    }
    log::error!("Library {} not found", library_id);
    Err("Library not found".to_string())
}

#[tauri::command]
pub fn create_library(app: tauri::AppHandle, name: &str, icon: char, color: &str, path: &str) -> Result<(), String> {
    let base = Path::new(path);
    let full_path = base.to_path_buf();
    let store = get_store(&app)?;

    match fs::create_dir_all(&full_path) {
        Ok(_) => println!("Library created successfully"),
        Err(e) => println!("Error creating library: {}", e),
    }

    let conn = Connection::open(full_path.join("photos.db").to_str().unwrap());

    match conn {
        Ok(conn) => {
            let _ = fs::create_dir_all(full_path.join("originals"));
            let _ = fs::create_dir_all(full_path.join("thumbnails"));

            conn.execute(
                "CREATE TABLE IF NOT EXISTS photo (
                    id TEXT PRIMARY KEY,
                    original_name TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    file_size INTEGER NOT NULL,
                    width INTEGER NOT NULL,
                    height INTEGER NOT NULL,
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
        "id": Uuid::new_v4().to_string(),
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
pub fn update_library_path(app: tauri::AppHandle, library_id: String, new_path: String) -> Result<(), String> {
    let store = get_store(&app)?;
    let mut libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr.clone(),
        _ => vec![],
    };
    for lib in libraries.iter_mut() {
        if lib.get("id").and_then(|v| v.as_str()) == Some(library_id.as_str()) {
            if let Some(obj) = lib.as_object_mut() {
                obj.insert("path".to_string(), Value::String(new_path.clone()));
            }
        }
    }
    store.set("libraries", Value::Array(libraries));
    save_store(store)?;
    Ok(())
}

#[tauri::command]
pub fn remove_library(app: tauri::AppHandle, library_id: String) -> Result<(), String> {
    let store = get_store(&app)?;
    let libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr,
        _ => vec![],
    };
    let filtered: Vec<Value> = libraries
        .into_iter()
        .filter(|lib| lib.get("id").and_then(|v| v.as_str()) != Some(library_id.as_str()))
        .collect();
    store.set("libraries", Value::Array(filtered));
    save_store(store)?;
    Ok(())
}

#[tauri::command]
pub fn get_selected_library(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let store = get_store(&app)?;
    if let Some(v) = store.get("selected_library") {
        Ok(v.clone().as_str().map(|s| s.to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn set_selected_library(app: tauri::AppHandle, library_id: Option<String>) -> Result<(), String> {
    let store = get_store(&app)?;
    if let Some(id) = library_id {
        store.set("selected_library", Value::String(id));
    } else {
        store.set("selected_library", Value::Null);
    }
    save_store(store)?;
    Ok(())
}