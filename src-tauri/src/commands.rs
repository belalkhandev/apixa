use crate::database::Database;
use crate::models::*;
use crate::postman_model::*;
use chrono::Utc;
use std::collections::HashMap;
use std::time::Instant;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn import_postman_collection(
    db: State<Database>,
    json_content: String,
) -> Result<Collection, String> {
    let postman_collection: PostmanCollection =
        serde_json::from_str(&json_content).map_err(|e| format!("Invalid JSON: {}", e))?;

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let collection_id = generate_id();
    let timestamp = now();

    let name = postman_collection.info.name;
    let description = postman_collection.info.description;

    conn.execute(
        "INSERT INTO collections (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&collection_id, &name, &description, &timestamp, &timestamp),
    )
    .map_err(|e| e.to_string())?;

    process_postman_items(&conn, &collection_id, None, &postman_collection.item)?;

    Ok(Collection {
        id: collection_id,
        name,
        description,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    })
}

fn process_postman_items(
    conn: &rusqlite::Connection,
    collection_id: &str,
    parent_id: Option<&str>,
    items: &[PostmanItem],
) -> Result<(), String> {
    for (index, item) in items.iter().enumerate() {
        let name = item.name.clone().unwrap_or_else(|| "Untitled".to_string());
        let sort_order = index as i32;

        if let Some(requests) = &item.item {
            // It's a folder
            let folder_id = generate_id();
            let timestamp = now();

            conn.execute(
                "INSERT INTO folders (id, collection_id, parent_id, name, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                (
                    &folder_id,
                    collection_id,
                    parent_id,
                    &name,
                    sort_order,
                    &timestamp,
                    &timestamp,
                ),
            )
            .map_err(|e| e.to_string())?;

            process_postman_items(conn, collection_id, Some(&folder_id), requests)?;
        } else if let Some(request) = &item.request {
            // It's a request
            let request_id = generate_id();
            let timestamp = now();
            let method = request.method.clone();

            let url = match &request.url {
                PostmanUrl::String(s) => s.clone(),
                PostmanUrl::Object(o) => o.raw.clone(),
            };

            let body = if let Some(body) = &request.body {
                body.raw.clone()
            } else {
                None
            };

            conn.execute(
                "INSERT INTO requests (id, collection_id, folder_id, name, method, url, body, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                (
                    &request_id,
                    collection_id,
                    parent_id,
                    &name,
                    &method,
                    &url,
                    &body,
                    sort_order,
                    &timestamp,
                    &timestamp,
                ),
            )
            .map_err(|e| e.to_string())?;

            // Headers
            for h in &request.header {
                if h.disabled != Some(true) {
                    let header_id = generate_id();
                    conn.execute(
                        "INSERT INTO request_headers (id, request_id, key, value, enabled) VALUES (?1, ?2, ?3, ?4, ?5)",
                        (&header_id, &request_id, &h.key, &h.value, 1),
                    )
                    .map_err(|e| e.to_string())?;
                }
            }

            // Params (Query)
            if let PostmanUrl::Object(url_obj) = &request.url {
                if let Some(query) = &url_obj.query {
                    for q in query {
                        if q.disabled != Some(true) && q.key.is_some() {
                            let param_id = generate_id();
                            conn.execute(
                                "INSERT INTO request_params (id, request_id, key, value, param_type, description, enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                                (&param_id, &request_id, q.key.as_ref().unwrap(), q.value.as_deref().unwrap_or(""), "query", q.description.as_deref(), 1),
                            )
                            .map_err(|e| e.to_string())?;
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

#[derive(serde::Serialize)]
pub struct HttpResponse {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body: String,
    time: u128,
    size: usize,
}

#[derive(serde::Deserialize)]
pub struct HttpRequest {
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
}

fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

fn now() -> String {
    Utc::now().to_rfc3339()
}

#[tauri::command]
pub fn get_collections(db: State<Database>) -> Result<Vec<Collection>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, description, created_at, updated_at FROM collections ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let collections = stmt
        .query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(collections)
}

#[tauri::command]
pub fn create_collection(
    db: State<Database>,
    input: CreateCollectionInput,
) -> Result<Collection, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = generate_id();
    let timestamp = now();

    conn.execute(
        "INSERT INTO collections (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&id, &input.name, &input.description, &timestamp, &timestamp),
    )
    .map_err(|e| e.to_string())?;

    Ok(Collection {
        id,
        name: input.name,
        description: input.description,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    })
}

#[tauri::command]
pub fn update_collection(
    db: State<Database>,
    input: UpdateCollectionInput,
) -> Result<Collection, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = now();

    conn.execute(
        "UPDATE collections SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
        (&input.name, &input.description, &timestamp, &input.id),
    )
    .map_err(|e| e.to_string())?;

    let collection: Collection = conn
        .query_row(
            "SELECT id, name, description, created_at, updated_at FROM collections WHERE id = ?1",
            [&input.id],
            |row| {
                Ok(Collection {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(collection)
}

#[tauri::command]
pub fn delete_collection(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM collections WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_environments(db: State<Database>) -> Result<Vec<Environment>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, created_at, updated_at FROM environments ORDER BY name")
        .map_err(|e| e.to_string())?;

    let envs: Vec<(String, String, String, String)> = stmt
        .query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut environments = Vec::new();

    for (id, name, created_at, updated_at) in envs {
        let mut var_stmt = conn
            .prepare("SELECT id, environment_id, key, value, enabled FROM environment_variables WHERE environment_id = ?1")
            .map_err(|e| e.to_string())?;

        let variables = var_stmt
            .query_map([&id], |row| {
                Ok(EnvironmentVariable {
                    id: row.get(0)?,
                    environment_id: row.get(1)?,
                    key: row.get(2)?,
                    value: row.get(3)?,
                    enabled: row.get::<_, i32>(4)? == 1,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        environments.push(Environment {
            id,
            name,
            variables,
            created_at,
            updated_at,
        });
    }

    Ok(environments)
}

#[tauri::command]
pub fn create_environment(
    db: State<Database>,
    input: CreateEnvironmentInput,
) -> Result<Environment, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = generate_id();
    let timestamp = now();

    conn.execute(
        "INSERT INTO environments (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        (&id, &input.name, &timestamp, &timestamp),
    )
    .map_err(|e| e.to_string())?;

    let mut variables = Vec::new();
    for var in input.variables {
        let var_id = generate_id();
        conn.execute(
            "INSERT INTO environment_variables (id, environment_id, key, value, enabled) VALUES (?1, ?2, ?3, ?4, ?5)",
            (&var_id, &id, &var.key, &var.value, var.enabled as i32),
        )
        .map_err(|e| e.to_string())?;

        variables.push(EnvironmentVariable {
            id: var_id,
            environment_id: id.clone(),
            key: var.key,
            value: var.value,
            enabled: var.enabled,
        });
    }

    Ok(Environment {
        id,
        name: input.name,
        variables,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    })
}

#[tauri::command]
pub fn update_environment(
    db: State<Database>,
    input: UpdateEnvironmentInput,
) -> Result<Environment, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = now();

    conn.execute(
        "UPDATE environments SET name = ?1, updated_at = ?2 WHERE id = ?3",
        (&input.name, &timestamp, &input.id),
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM environment_variables WHERE environment_id = ?1",
        [&input.id],
    )
    .map_err(|e| e.to_string())?;

    let mut variables = Vec::new();
    for var in input.variables {
        let var_id = generate_id();
        conn.execute(
            "INSERT INTO environment_variables (id, environment_id, key, value, enabled) VALUES (?1, ?2, ?3, ?4, ?5)",
            (&var_id, &input.id, &var.key, &var.value, var.enabled as i32),
        )
        .map_err(|e| e.to_string())?;

        variables.push(EnvironmentVariable {
            id: var_id,
            environment_id: input.id.clone(),
            key: var.key,
            value: var.value,
            enabled: var.enabled,
        });
    }

    Ok(Environment {
        id: input.id,
        name: input.name,
        variables,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    })
}

#[tauri::command]
pub fn delete_environment(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM environments WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_collection_tree(
    db: State<Database>,
    collection_id: String,
) -> Result<Vec<TreeItem>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    fn build_tree(
        conn: &rusqlite::Connection,
        collection_id: &str,
        parent_id: Option<&str>,
    ) -> Result<Vec<TreeItem>, String> {
        let mut items: Vec<TreeItem> = Vec::new();

        let mut folder_stmt = conn
            .prepare(
                "SELECT id, name, sort_order FROM folders WHERE collection_id = ?1 AND parent_id IS ?2 ORDER BY sort_order, name"
            )
            .map_err(|e| e.to_string())?;

        let folders: Vec<(String, String, i32)> = folder_stmt
            .query_map(rusqlite::params![collection_id, parent_id], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        for (folder_id, folder_name, sort_order) in folders {
            let children = build_tree(conn, collection_id, Some(&folder_id))?;
            items.push(TreeItem::Folder(FolderWithItems {
                id: folder_id,
                name: folder_name,
                sort_order,
                items: children,
            }));
        }

        let mut request_stmt = conn
            .prepare(
                "SELECT id, name, method, url, sort_order FROM requests WHERE collection_id = ?1 AND folder_id IS ?2 ORDER BY sort_order, name"
            )
            .map_err(|e| e.to_string())?;

        let requests: Vec<RequestSummary> = request_stmt
            .query_map(rusqlite::params![collection_id, parent_id], |row| {
                Ok(RequestSummary {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    method: row.get(2)?,
                    url: row.get(3)?,
                    sort_order: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        for req in requests {
            items.push(TreeItem::Request(req));
        }

        Ok(items)
    }

    build_tree(&conn, &collection_id, None)
}

#[tauri::command]
pub fn create_folder(db: State<Database>, input: CreateFolderInput) -> Result<Folder, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = generate_id();
    let timestamp = now();

    conn.execute(
        "INSERT INTO folders (id, collection_id, parent_id, name, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        (&id, &input.collection_id, &input.parent_id, &input.name, 0, &timestamp, &timestamp),
    )
    .map_err(|e| e.to_string())?;

    Ok(Folder {
        id,
        collection_id: input.collection_id,
        parent_id: input.parent_id,
        name: input.name,
        sort_order: 0,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    })
}

#[tauri::command]
pub fn delete_folder(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM folders WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_request(db: State<Database>, input: CreateRequestInput) -> Result<Request, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = generate_id();
    let timestamp = now();

    conn.execute(
        "INSERT INTO requests (id, collection_id, folder_id, name, method, url, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        (&id, &input.collection_id, &input.folder_id, &input.name, &input.method, &input.url, 0, &timestamp, &timestamp),
    )
    .map_err(|e| e.to_string())?;

    Ok(Request {
        id,
        collection_id: input.collection_id,
        folder_id: input.folder_id,
        name: input.name,
        method: input.method,
        url: input.url,
        body: None,
        headers: Vec::new(),
        params: Vec::new(),
        sort_order: 0,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    })
}

#[tauri::command]
pub fn get_request(db: State<Database>, id: String) -> Result<Request, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let request: Request = conn
        .query_row(
            "SELECT id, collection_id, folder_id, name, method, url, body, sort_order, created_at, updated_at FROM requests WHERE id = ?1",
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
                    headers: Vec::new(),
                    params: Vec::new(),
                    sort_order: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let mut header_stmt = conn
        .prepare(
            "SELECT id, request_id, key, value, enabled FROM request_headers WHERE request_id = ?1",
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
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut param_stmt = conn
        .prepare("SELECT id, request_id, key, value, param_type, description, enabled FROM request_params WHERE request_id = ?1")
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

#[tauri::command]
pub fn update_request(db: State<Database>, input: UpdateRequestInput) -> Result<Request, String> {
    let request_id = input.id.clone();

    {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let timestamp = now();

        conn.execute(
            "UPDATE requests SET name = ?1, method = ?2, url = ?3, body = ?4, updated_at = ?5 WHERE id = ?6",
            (&input.name, &input.method, &input.url, &input.body, &timestamp, &input.id),
        )
        .map_err(|e| e.to_string())?;

        conn.execute(
            "DELETE FROM request_headers WHERE request_id = ?1",
            [&input.id],
        )
        .map_err(|e| e.to_string())?;

        conn.execute(
            "DELETE FROM request_params WHERE request_id = ?1",
            [&input.id],
        )
        .map_err(|e| e.to_string())?;

        for h in input.headers {
            let header_id = generate_id();
            conn.execute(
                "INSERT INTO request_headers (id, request_id, key, value, enabled) VALUES (?1, ?2, ?3, ?4, ?5)",
                (&header_id, &input.id, &h.key, &h.value, h.enabled as i32),
            )
            .map_err(|e| e.to_string())?;
        }

        for p in input.params {
            let param_id = generate_id();
            conn.execute(
                "INSERT INTO request_params (id, request_id, key, value, param_type, description, enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                (&param_id, &input.id, &p.key, &p.value, &p.param_type, &p.description, p.enabled as i32),
            )
            .map_err(|e| e.to_string())?;
        }
    }

    get_request(db, request_id)
}

#[tauri::command]
pub fn delete_request(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM requests WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn move_request(
    db: State<Database>,
    request_id: String,
    target_folder_id: Option<String>,
    target_collection_id: Option<String>,
    before_id: Option<String>,
    after_id: Option<String>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = now();

    // Calculate new sort_order based on position
    let new_sort_order: i32 = if let Some(ref before) = before_id {
        // Get sort_order of the item we want to be before
        let target_order: i32 = conn
            .query_row(
                "SELECT sort_order FROM requests WHERE id = ?1 UNION SELECT sort_order FROM folders WHERE id = ?1",
                [before],
                |row| row.get(0),
            )
            .unwrap_or(0);
        target_order
    } else if let Some(ref after) = after_id {
        // Get sort_order of the item we want to be after
        let target_order: i32 = conn
            .query_row(
                "SELECT sort_order FROM requests WHERE id = ?1 UNION SELECT sort_order FROM folders WHERE id = ?1",
                [after],
                |row| row.get(0),
            )
            .unwrap_or(0);
        target_order + 1
    } else {
        // No position specified, add to end
        let max_order: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), 0) FROM (
                    SELECT sort_order FROM requests WHERE folder_id IS ?1
                    UNION ALL
                    SELECT sort_order FROM folders WHERE parent_id IS ?1
                )",
                [&target_folder_id],
                |row| row.get(0),
            )
            .unwrap_or(0);
        max_order + 1
    };

    // Shift items at or after the new position
    if before_id.is_some() || after_id.is_some() {
        conn.execute(
            "UPDATE requests SET sort_order = sort_order + 1 WHERE folder_id IS ?1 AND sort_order >= ?2 AND id != ?3",
            (&target_folder_id, new_sort_order, &request_id),
        )
        .map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE folders SET sort_order = sort_order + 1 WHERE parent_id IS ?1 AND sort_order >= ?2",
            (&target_folder_id, new_sort_order),
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(collection_id) = target_collection_id {
        conn.execute(
            "UPDATE requests SET collection_id = ?1, folder_id = ?2, sort_order = ?3, updated_at = ?4 WHERE id = ?5",
            (&collection_id, &target_folder_id, new_sort_order, &timestamp, &request_id),
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE requests SET folder_id = ?1, sort_order = ?2, updated_at = ?3 WHERE id = ?4",
            (&target_folder_id, new_sort_order, &timestamp, &request_id),
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn move_folder(
    db: State<Database>,
    folder_id: String,
    target_parent_id: Option<String>,
    before_id: Option<String>,
    after_id: Option<String>,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = now();

    // Prevent moving a folder into itself or its descendants
    if let Some(ref target_id) = target_parent_id {
        if *target_id == folder_id {
            return Err("Cannot move a folder into itself".to_string());
        }

        // Check if target is a descendant of the folder being moved
        fn is_descendant(
            conn: &rusqlite::Connection,
            folder_id: &str,
            potential_descendant: &str,
        ) -> bool {
            let mut stmt = conn
                .prepare("SELECT parent_id FROM folders WHERE id = ?1")
                .unwrap();

            let parent: Option<String> = stmt
                .query_row([potential_descendant], |row| row.get(0))
                .ok();

            match parent {
                Some(parent_id) => {
                    if parent_id == folder_id {
                        true
                    } else {
                        is_descendant(conn, folder_id, &parent_id)
                    }
                }
                None => false,
            }
        }

        if is_descendant(&conn, &folder_id, target_id) {
            return Err("Cannot move a folder into its own descendant".to_string());
        }
    }

    // Calculate new sort_order based on position
    let new_sort_order: i32 = if let Some(ref before) = before_id {
        let target_order: i32 = conn
            .query_row(
                "SELECT sort_order FROM requests WHERE id = ?1 UNION SELECT sort_order FROM folders WHERE id = ?1",
                [before],
                |row| row.get(0),
            )
            .unwrap_or(0);
        target_order
    } else if let Some(ref after) = after_id {
        let target_order: i32 = conn
            .query_row(
                "SELECT sort_order FROM requests WHERE id = ?1 UNION SELECT sort_order FROM folders WHERE id = ?1",
                [after],
                |row| row.get(0),
            )
            .unwrap_or(0);
        target_order + 1
    } else {
        let max_order: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), 0) FROM (
                    SELECT sort_order FROM requests WHERE folder_id IS ?1
                    UNION ALL
                    SELECT sort_order FROM folders WHERE parent_id IS ?1
                )",
                [&target_parent_id],
                |row| row.get(0),
            )
            .unwrap_or(0);
        max_order + 1
    };

    // Shift items at or after the new position
    if before_id.is_some() || after_id.is_some() {
        conn.execute(
            "UPDATE requests SET sort_order = sort_order + 1 WHERE folder_id IS ?1 AND sort_order >= ?2",
            (&target_parent_id, new_sort_order),
        )
        .map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE folders SET sort_order = sort_order + 1 WHERE parent_id IS ?1 AND sort_order >= ?2 AND id != ?3",
            (&target_parent_id, new_sort_order, &folder_id),
        )
        .map_err(|e| e.to_string())?;
    }

    conn.execute(
        "UPDATE folders SET parent_id = ?1, sort_order = ?2, updated_at = ?3 WHERE id = ?4",
        (&target_parent_id, new_sort_order, &timestamp, &folder_id),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn send_http_request(request: HttpRequest) -> Result<HttpResponse, String> {
    let client = reqwest::Client::new();
    let method = match request.method.as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "PATCH" => reqwest::Method::PATCH,
        "HEAD" => reqwest::Method::HEAD,
        "OPTIONS" => reqwest::Method::OPTIONS,
        _ => return Err(format!("Unsupported method: {}", request.method)),
    };

    let mut req_builder = client.request(method, &request.url);

    for (key, value) in request.headers {
        req_builder = req_builder.header(key, value);
    }

    if let Some(body) = request.body {
        req_builder = req_builder.body(body);
    }

    let start_time = Instant::now();
    let response = req_builder.send().await.map_err(|e| e.to_string())?;
    let time = start_time.elapsed().as_millis();

    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("")
        .to_string();

    let mut headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(val) = value.to_str() {
            headers.insert(key.to_string(), val.to_string());
        }
    }

    let body_bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let size = body_bytes.len();
    let body = String::from_utf8_lossy(&body_bytes).to_string();

    Ok(HttpResponse {
        status,
        status_text,
        headers,
        body,
        time,
        size,
    })
}

fn get_all_requests_in_collection(
    conn: &rusqlite::Connection,
    collection_id: &str,
) -> Result<Vec<Request>, String> {
    let mut stmt = conn
        .prepare("SELECT id FROM requests WHERE collection_id = ?1")
        .map_err(|e| e.to_string())?;

    let ids: Vec<String> = stmt
        .query_map([collection_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut requests = Vec::new();
    for id in ids {
        // Reusing get_request logic but we need it here without State
        let req = get_request_internal(conn, id)?;
        requests.push(req);
    }
    Ok(requests)
}

fn get_request_internal(conn: &rusqlite::Connection, id: String) -> Result<Request, String> {
    let request: Request = conn
        .query_row(
            "SELECT id, collection_id, folder_id, name, method, url, body, sort_order, created_at, updated_at FROM requests WHERE id = ?1",
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
                    headers: Vec::new(),
                    params: Vec::new(),
                    sort_order: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let mut header_stmt = conn
        .prepare(
            "SELECT id, request_id, key, value, enabled FROM request_headers WHERE request_id = ?1",
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
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut param_stmt = conn
        .prepare("SELECT id, request_id, key, value, param_type, description, enabled FROM request_params WHERE request_id = ?1")
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

#[tauri::command]
pub async fn start_load_test(
    app: tauri::AppHandle,
    db: State<'_, Database>,
    tester: State<'_, std::sync::Arc<tokio::sync::Mutex<crate::load_tester::LoadTester>>>,
    config: LoadTestConfig,
) -> Result<(), String> {
    let (requests, variables) = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let requests = get_all_requests_in_collection(&conn, &config.collection_id)?;

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

    // Run in a separate task so it doesn't block the command
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
