use serde_json::Value;
use std::path::{Path, PathBuf};

use crate::modules::config::get_store;
use crate::modules::utils::Photo;

fn get_library_root_path(app: &tauri::AppHandle, library_id: String) -> Result<PathBuf, String> {
    let store = get_store(&app)?;
    let libraries = match store.get("libraries") {
        Some(Value::Array(arr)) => arr,
        _ => vec![],
    };
    for lib in libraries {
        if lib.get("id").and_then(|v| v.as_str()) == Some(library_id.as_str()) {
            if let Some(path) = lib.get("path").and_then(|v| v.as_str()) {
                return Ok(Path::new(path).to_path_buf());
            }
        }
    }
    Err("Library not found".to_string())
}
