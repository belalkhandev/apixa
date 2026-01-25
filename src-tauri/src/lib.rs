use tauri::Manager;

mod commands;
mod database;
mod histogram;
mod load_tester;
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            let db = Database::new(app_data_dir).expect("Failed to initialize database");
            app.manage(db);
            app.manage(std::sync::Arc::new(tokio::sync::Mutex::new(
                load_tester::LoadTester::new(),
            )));

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
            import_postman_collection,
            start_load_test,
            stop_load_test,
            export_collection,
            export_all_collections,
            // Notes commands
            get_notes,
            create_note,
            update_note,
            delete_note,
            toggle_note_pin,
            // Projects commands
            get_projects,
            create_project,
            update_project,
            delete_project,
            // Todos commands
            get_todos,
            create_todo,
            update_todo,
            delete_todo,
            update_todo_status,
            update_challenge_timer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
