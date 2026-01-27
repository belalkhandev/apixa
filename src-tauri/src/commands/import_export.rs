use super::{generate_id, now};
use crate::database::Database;
use crate::models::*;
use crate::postman_model::*;
use tauri::State;

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

fn build_postman_collection(
    conn: &rusqlite::Connection,
    collection_id: &str,
    name: &str,
    description: Option<String>,
) -> Result<PostmanCollection, String> {
    let items = build_postman_item_recursive(conn, collection_id, None)?;

    Ok(PostmanCollection {
        info: Info {
            name: name.to_string(),
            description,
            schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
                .to_string(),
        },
        item: items,
    })
}

fn build_postman_item_recursive(
    conn: &rusqlite::Connection,
    collection_id: &str,
    parent_id: Option<&str>,
) -> Result<Vec<PostmanItem>, String> {
    let mut items = Vec::new();

    // Fetch folders
    let mut folder_stmt = conn
        .prepare("SELECT id, name, description FROM folders WHERE collection_id = ?1 AND parent_id IS ?2 ORDER BY sort_order")
        .map_err(|e| e.to_string())?;

    let folders = folder_stmt
        .query_map(rusqlite::params![collection_id, parent_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for (id, name, _desc) in folders {
        let children = build_postman_item_recursive(conn, collection_id, Some(&id))?;
        items.push(PostmanItem {
            name: Some(name),
            item: Some(children),
            request: None,
        });
    }

    // Fetch requests
    let mut req_stmt = conn
        .prepare("SELECT id, name, method, url, body, description FROM requests WHERE collection_id = ?1 AND folder_id IS ?2 ORDER BY sort_order")
        .map_err(|e| e.to_string())?;

    let requests = req_stmt
        .query_map(rusqlite::params![collection_id, parent_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5).unwrap_or(None),
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for (id, name, method, url, body, description) in requests {
        let postman_request =
            convert_request_to_postman(conn, &id, method, url, body, description)?;
        items.push(PostmanItem {
            name: Some(name),
            item: None,
            request: Some(postman_request),
        });
    }

    Ok(items)
}

fn convert_request_to_postman(
    conn: &rusqlite::Connection,
    request_id: &str,
    method: String,
    url: String,
    body: Option<String>,
    description: Option<String>,
) -> Result<PostmanRequest, String> {
    // Headers
    let mut header_stmt = conn
        .prepare("SELECT key, value, enabled FROM request_headers WHERE request_id = ?1")
        .map_err(|e| e.to_string())?;

    let headers = header_stmt
        .query_map([request_id], |row| {
            Ok(PostmanHeader {
                key: row.get(0)?,
                value: row.get(1)?,
                description: None,
                disabled: if row.get::<_, i32>(2)? == 1 {
                    None
                } else {
                    Some(true)
                },
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Params (Query)
    let mut param_stmt = conn
        .prepare("SELECT key, value, description, enabled FROM request_params WHERE request_id = ?1 AND param_type = 'query'")
        .map_err(|e| e.to_string())?;

    let query_params = param_stmt
        .query_map([request_id], |row| {
            Ok(PostmanQueryParam {
                key: Some(row.get(0)?),
                value: Some(row.get(1)?),
                description: row.get(2)?,
                disabled: if row.get::<_, i32>(3)? == 1 {
                    None
                } else {
                    Some(true)
                },
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let postman_url = PostmanUrl::Object(PostmanUrlObject {
        raw: url.clone(),
        protocol: None,
        host: None,
        path: None,
        query: if query_params.is_empty() {
            None
        } else {
            Some(query_params)
        },
        variable: None,
    });

    let postman_body = if let Some(b) = body {
        if !b.is_empty() {
            Some(PostmanBody {
                mode: Some("raw".to_string()),
                raw: Some(b),
            })
        } else {
            None
        }
    } else {
        None
    };

    Ok(PostmanRequest {
        method,
        header: headers,
        url: postman_url,
        body: postman_body,
        description,
    })
}

#[tauri::command]
pub fn export_collection(db: State<Database>, collection_id: String) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let (name, description): (String, Option<String>) = conn
        .query_row(
            "SELECT name, description FROM collections WHERE id = ?1",
            [&collection_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "Collection not found".to_string())?;

    let collection = build_postman_collection(&conn, &collection_id, &name, description)?;

    serde_json::to_string_pretty(&collection).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_all_collections(db: State<Database>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, description FROM collections ORDER BY name")
        .map_err(|e| e.to_string())?;

    let collections_iter = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut master_items = Vec::new();

    for collection_res in collections_iter {
        let (id, name, _description) = collection_res.map_err(|e| e.to_string())?;
        let items = build_postman_item_recursive(&conn, &id, None)?;
        master_items.push(PostmanItem {
            name: Some(name),
            item: Some(items),
            request: None,
        });
    }

    let master_collection = PostmanCollection {
        info: Info {
            name: "Apixa Export - All Collections".to_string(),
            description: Some("Export of all collections from Apixa".to_string()),
            schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
                .to_string(),
        },
        item: master_items,
    };

    serde_json::to_string_pretty(&master_collection).map_err(|e| e.to_string())
}
