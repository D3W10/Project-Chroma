use tauri_plugin_store::StoreExt;

mod modules;
use modules::config;
use modules::library;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .filter(|m| !m.target().starts_with("tao::platform_impl"))
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            config::get_libraries,
            config::update_library_path,
            config::remove_library,
            config::get_selected_library,
            config::set_selected_library,
            config::get_settings,
            config::set_settings,
            library::check_library_health,
            library::upgrade_library,
            library::create_library,
            library::get_library_info_from_path,
            library::add_library,
            library::get_items,
            library::verify_conflicts,
            library::add_items,
            library::set_items_favorite,
            library::transfer_items,
            library::delete_items,
            library::get_albums,
            library::create_album,
            library::get_album_items,
            library::add_items_to_album,
            library::remove_items_from_album,
            library::get_tags,
            library::create_tag,
            library::update_tag,
            library::delete_tags,
            library::get_item_tags,
            library::add_tags_to_items,
            library::remove_tags_from_items,
        ])
        .setup(|app| {
            let _ = app.handle().store("config.json");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}