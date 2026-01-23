use serde_json::Value;
use std::sync::Arc;
use tauri::{AppHandle, Wry};
use tauri_plugin_store::{Store, StoreExt};

use crate::modules::utils;

pub fn get_store(app: &AppHandle) -> Result<Arc<Store<Wry>>, String> {
    app.store("config.json").map_err(|e| utils::treat(e, "Unable to access the configuration file"))
}

fn save_store(store: Arc<Store<Wry>>) -> Result<(), std::string::String> {
    store.save().map_err(|e| utils::treat(e, "Unable to save the configuration file"))
}

#[tauri::command]
pub fn get_libraries(app: AppHandle) -> Result<Value, String> {
    let store = get_store(&app)?;
    if let Some(v) = store.get("libraries") {
        Ok(v.clone())
    } else {
        Ok(Value::Array(vec![]))
    }
}

#[tauri::command]
pub fn update_library_path(app: AppHandle, library_id: String, new_path: String) -> Result<(), String> {
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
pub fn remove_library(app: AppHandle, library_id: String) -> Result<(), String> {
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
pub fn get_selected_library(app: AppHandle) -> Result<Option<String>, String> {
    let store = get_store(&app)?;
    if let Some(v) = store.get("selected_library") {
        Ok(v.clone().as_str().map(|s| s.to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn set_selected_library(app: AppHandle, library_id: Option<String>) -> Result<(), String> {
    let store = get_store(&app)?;
    if let Some(id) = library_id {
        store.set("selected_library", Value::String(id));
    } else {
        store.set("selected_library", Value::Null);
    }
    save_store(store)?;
    Ok(())
}