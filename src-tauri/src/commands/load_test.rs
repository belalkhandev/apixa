use crate::database::Database;
use crate::models::*;
use tauri::State;

#[tauri::command]
pub async fn start_load_test(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    tester: State<'_, std::sync::Arc<tokio::sync::Mutex<crate::load_tester::LoadTester>>>,
    config: LoadTestConfig,
) -> Result<(), String> {
    let (requests, variables) = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare("SELECT id FROM requests WHERE collection_id = ?1")
            .map_err(|e| e.to_string())?;

        let ids: Vec<String> = stmt
            .query_map([&config.collection_id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        let mut requests = Vec::new();

        for id in ids {
            let req = get_request_internal(&conn, id)?;
            requests.push(req);
        }

        let mut variables = std::collections::HashMap::new();
        if let Some(ref env_id) = config.environment_id {
            let mut stmt = conn
                .prepare("SELECT key, value FROM environment_variables WHERE environment_id = ?1 AND enabled = 1")
                .map_err(|e| e.to_string())?;

            let env_vars = stmt
                .query_map([env_id], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                })
                .map_err(|e| e.to_string())?;

            for var in env_vars {
                let (k, v) = var.map_err(|e| e.to_string())?;
                variables.insert(k, v);
            }
        }

        (requests, variables)
    };

    if requests.is_empty() {
        return Err("No requests found in this collection".to_string());
    }

    let tester = tester.inner().clone();
    let app_clone = app.clone();

    tokio::spawn(async move {
        let mut tester = tester.lock().await;
        let _ = tester.run(app_clone, config, requests, variables).await;
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_load_test(
    tester: State<'_, std::sync::Arc<tokio::sync::Mutex<crate::load_tester::LoadTester>>>,
) -> Result<(), String> {
    let tester = tester.inner();
    let mut tester = tester.lock().await;
    tester.stop();
    Ok(())
}

fn get_request_internal(conn: &rusqlite::Connection, id: String) -> Result<Request, String> {
    let request: Request = conn
        .query_row(
            "SELECT id, collection_id, folder_id, name, method, url, body, body_type, auth_type, auth_data, extract_rules, sort_order, created_at, updated_at FROM requests WHERE id = ?1",
            [&id],
            |row| {
                Ok(Request {
                    id: row.get(0)?,
                    collection_id: row.get(1)?,
                    folder_id: row.get(2)?,
                    name: row.get(3)?,
                    method: row.get(4)?,
                    url: row.get(5)?,
                    body: row.get(6)?,
                    body_type: row.get(7)?,
                    auth_type: row.get(8)?,
                    auth_data: row.get(9)?,
                    extract_rules: row.get(10)?,
                    headers: Vec::new(),
                    params: Vec::new(),
                    sort_order: row.get(11)?,
                    created_at: row.get(12)?,
                    updated_at: row.get(13)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let mut header_stmt = conn
        .prepare(
            "SELECT id, request_id, key, value, enabled, carry_forward FROM request_headers WHERE request_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let headers: Vec<RequestHeader> = header_stmt
        .query_map([&id], |row| {
            Ok(RequestHeader {
                id: row.get(0)?,
                request_id: row.get(1)?,
                key: row.get(2)?,
                value: row.get(3)?,
                enabled: row.get::<_, i32>(4)? == 1,
                carry_forward: row.get::<_, i32>(5).unwrap_or(0) == 1,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut param_stmt = conn
        .prepare("SELECT id, request_id, key, value, param_type, description, enabled, carry_forward FROM request_params WHERE request_id = ?1")
        .map_err(|e| e.to_string())?;

    let params: Vec<RequestParam> = param_stmt
        .query_map([&id], |row| {
            Ok(RequestParam {
                id: row.get(0)?,
                request_id: row.get(1)?,
                key: row.get(2)?,
                value: row.get(3)?,
                param_type: row.get(4)?,
                description: row.get(5)?,
                enabled: row.get::<_, i32>(6)? == 1,
                carry_forward: row.get::<_, i32>(7).unwrap_or(0) == 1,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(Request {
        headers,
        params,
        ..request
    })
}
