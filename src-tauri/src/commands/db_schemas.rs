use super::{generate_id, now};
use crate::database::Database;
use crate::models::*;
use tauri::State;

#[tauri::command]
pub fn get_db_schemas(db: State<Database>) -> Result<Vec<DbSchema>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, description, data, created_at, updated_at FROM db_schemas ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let schemas = stmt
        .query_map([], |row| {
            Ok(DbSchema {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                data: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(schemas)
}

#[tauri::command]
pub fn create_db_schema(
    db: State<Database>,
    input: CreateDbSchemaInput,
) -> Result<DbSchema, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = generate_id();
    let timestamp = now();

    conn.execute(
        "INSERT INTO db_schemas (id, name, description, data, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&id, &input.name, &input.description, &input.data, &timestamp, &timestamp),
    )
    .map_err(|e| e.to_string())?;

    Ok(DbSchema {
        id,
        name: input.name,
        description: input.description,
        data: input.data,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    })
}

#[tauri::command]
pub fn update_db_schema(
    db: State<Database>,
    input: UpdateDbSchemaInput,
) -> Result<DbSchema, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = now();

    conn.execute(
        "UPDATE db_schemas SET name = ?1, description = ?2, data = ?3, updated_at = ?4 WHERE id = ?5",
        (&input.name, &input.description, &input.data, &timestamp, &input.id),
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, description, data, created_at, updated_at FROM db_schemas WHERE id = ?1",
        [&input.id],
        |row| {
            Ok(DbSchema {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                data: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_db_schema(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM db_schemas WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
