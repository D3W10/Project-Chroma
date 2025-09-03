use std::fs;
use std::path::Path;
use std::sync::Arc;
use tauri::Wry;
use tauri_plugin_store::{Store, StoreExt};
use rusqlite::Connection;
use serde_json::Value;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_libraries, create_library])
        .setup(|app| {
            let _ = app.handle().store("config.json");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn get_store(app: tauri::AppHandle) -> Result<Arc<Store<Wry>>, String> {
    app.store("config.json").map_err(|e| e.to_string())
}

#[tauri::command]
fn get_libraries(app: tauri::AppHandle) -> Result<Value, String> {
    let store = get_store(app)?;
    if let Some(v) = store.get("libraries") {
        Ok(v.clone())
    } else {
        Ok(Value::Array(vec![]))
    }
}

#[tauri::command]
fn create_library(app: tauri::AppHandle, name: &str, icon: char, path: &str) -> Result<(), String> {
    let base = Path::new(path);
    let full_path = base.join(".projectchroma");
    let store = get_store(app)?;

    match fs::create_dir_all(&full_path) {
        Ok(_) => println!("Photostore created successfully"),
        Err(e) => println!("Error creating photostore: {}", e),
    }

    let conn = Connection::open(full_path.join("photos.db").to_str().unwrap());

    match conn {
        Ok(conn) => {
            conn.execute(
                "CREATE TABLE IF NOT EXISTS photo (
                    id TEXT PRIMARY KEY,
                    original_name TEXT,
                    type TEXT,
                    checksum TEXT,
                    is_favorite INTEGER,
                    is_screenshot INTEGER,
                    is_screen_recording INTEGER
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
        "path": path
    }));
    store.set("libraries", Value::Array(libraries));

    store.save().map_err(|e| e.to_string())?;
    Ok(())
}