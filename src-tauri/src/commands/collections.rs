use super::{generate_id, now};
use crate::database::Database;
use crate::models::*;
use tauri::State;

// Helper for converting requests (used in other modules if needed, but primarily here and import_export)
// Since this was a helper in commands.rs, we'll keep it here if it's only used here, or move to mod.rs if shared.
// It seems used by export which is in import_export.rs.
// Actually, `convert_request_to_postman` and `build_postman_item_recursive` are heavily tied to DB queries.
// Let's keep them in import_export.rs if they are only used for export.
// Wait, `process_postman_items` is for import.
// For now, let's put the Standard CRUD commands here.

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
        body_type: Some("none".to_string()),
        auth_type: Some("none".to_string()),
        auth_data: None,
        extract_rules: None,
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

#[tauri::command]
pub fn update_request(db: State<Database>, input: UpdateRequestInput) -> Result<Request, String> {
    let request_id = input.id.clone();

    {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        let timestamp = now();

        conn.execute(
            "UPDATE requests SET name = ?1, method = ?2, url = ?3, body = ?4, body_type = ?5, auth_type = ?6, auth_data = ?7, extract_rules = ?8, updated_at = ?9 WHERE id = ?10",
            (
                &input.name,
                &input.method,
                &input.url,
                &input.body,
                &input.body_type,
                &input.auth_type,
                &input.auth_data,
                &input.extract_rules,
                &timestamp,
                &input.id,
            ),
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
                "INSERT INTO request_headers (id, request_id, key, value, enabled, carry_forward) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                (&header_id, &input.id, &h.key, &h.value, h.enabled as i32, h.carry_forward as i32),
            )
            .map_err(|e| e.to_string())?;
        }

        for p in input.params {
            let param_id = generate_id();
            conn.execute(
                "INSERT INTO request_params (id, request_id, key, value, param_type, description, enabled, carry_forward) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                (&param_id, &input.id, &p.key, &p.value, &p.param_type, &p.description, p.enabled as i32, p.carry_forward as i32),
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
                Some(pid) => {
                    if pid == folder_id {
                        true
                    } else {
                        is_descendant(conn, folder_id, &pid)
                    }
                }
                None => false,
            }
        }

        if is_descendant(&conn, &folder_id, target_id) {
            return Err("Cannot move a folder into its own descendant".to_string());
        }
    }

    // Calculate new sort_order (similarly to move_request)
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
