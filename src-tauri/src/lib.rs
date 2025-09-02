use std::fs;
use std::path::Path;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![create_photostore])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn create_photostore(path: &str) {
    let base = Path::new(path);
    let full_path = base.join(".projectchroma");

    match fs::create_dir_all(&full_path) {
        Ok(_) => println!("Photostore created successfully"),
        Err(e) => println!("Error creating photostore: {}", e),
    }
}