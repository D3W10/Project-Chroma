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
