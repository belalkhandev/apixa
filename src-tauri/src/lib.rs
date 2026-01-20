use tauri::Manager;

mod commands;
mod database;
mod models;
mod postman_model;

use commands::*;
use database::Database;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn close_splash(window: tauri::Window) {
    if let Some(splash) = window.get_webview_window("splash") {
        let _ = splash.close();
    }
    if let Some(main) = window.get_webview_window("main") {
        let _ = main.show();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            let db = Database::new(app_data_dir).expect("Failed to initialize database");
            app.manage(db);

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(1800));
                if let Some(splash) = handle.get_webview_window("splash") {
                    let _ = splash.close();
                }
                if let Some(main) = handle.get_webview_window("main") {
                    let _ = main.show();
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            close_splash,
            get_collections,
            create_collection,
            update_collection,
            delete_collection,
            get_environments,
            create_environment,
            update_environment,
            delete_environment,
            get_collection_tree,
            create_folder,
            delete_folder,
            create_request,
            get_request,
            update_request,
            delete_request,
            move_request,
            move_folder,
            send_http_request,
            import_postman_collection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
