use super::{generate_id, now};
use crate::database::Database;
use crate::models::*;
use tauri::State;

#[tauri::command]
pub fn get_projects(db: State<Database>) -> Result<Vec<Project>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, color, created_at, updated_at FROM projects ORDER BY name")
        .map_err(|e| e.to_string())?;

    let projects = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(projects)
}

#[tauri::command]
pub fn create_project(db: State<Database>, input: CreateProjectInput) -> Result<Project, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = generate_id();
    let timestamp = now();
    let color = input.color.unwrap_or_else(|| "#3b82f6".to_string());

    conn.execute(
        "INSERT INTO projects (id, name, color, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&id, &input.name, &color, &timestamp, &timestamp),
    )
    .map_err(|e| e.to_string())?;

    Ok(Project {
        id,
        name: input.name,
        color,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    })
}

#[tauri::command]
pub fn update_project(db: State<Database>, input: UpdateProjectInput) -> Result<Project, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = now();

    conn.execute(
        "UPDATE projects SET name = ?1, color = ?2, updated_at = ?3 WHERE id = ?4",
        (&input.name, &input.color, &timestamp, &input.id),
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, color, created_at, updated_at FROM projects WHERE id = ?1",
        [&input.id],
        |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_project(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
