use serde_json::Value;
use std::path::{Path, PathBuf};
use tauri_plugin_store::StoreExt;

mod modules;
use modules::config;
use modules::library;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            config::get_libraries,
            config::check_library_path,
            config::create_library,
            config::update_library_path,
            config::remove_library,
            config::get_selected_library,
            config::set_selected_library,
            library::get_items,
            library::verify_conflicts,
            library::add_items,
            library::set_items_favorite,
            library::delete_items,
            library::get_albums,
            library::create_album,
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
    let store = config::get_store(app)?;
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