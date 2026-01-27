use super::{generate_id, now};
use crate::database::Database;
use crate::models::*;
use tauri::State;

#[tauri::command]
pub fn get_notes(db: State<Database>) -> Result<Vec<Note>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, content, is_pinned, created_at, updated_at FROM notes ORDER BY is_pinned DESC, updated_at DESC")
        .map_err(|e| e.to_string())?;

    let notes = stmt
        .query_map([], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                is_pinned: row.get::<_, i32>(3)? == 1,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(notes)
}

#[tauri::command]
pub fn create_note(db: State<Database>, input: CreateNoteInput) -> Result<Note, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = generate_id();
    let timestamp = now();

    conn.execute(
        "INSERT INTO notes (id, title, content, is_pinned, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&id, &input.title, &input.content, 0, &timestamp, &timestamp),
    )
    .map_err(|e| e.to_string())?;

    Ok(Note {
        id,
        title: input.title,
        content: input.content,
        is_pinned: false,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    })
}

#[tauri::command]
pub fn update_note(db: State<Database>, input: UpdateNoteInput) -> Result<Note, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = now();

    conn.execute(
        "UPDATE notes SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
        (&input.title, &input.content, &timestamp, &input.id),
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, title, content, is_pinned, created_at, updated_at FROM notes WHERE id = ?1",
        [&input.id],
        |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                is_pinned: row.get::<_, i32>(3)? == 1,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_note(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM notes WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn toggle_note_pin(db: State<Database>, id: String, is_pinned: bool) -> Result<Note, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = now();

    conn.execute(
        "UPDATE notes SET is_pinned = ?1, updated_at = ?2 WHERE id = ?3",
        (is_pinned as i32, &timestamp, &id),
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, title, content, is_pinned, created_at, updated_at FROM notes WHERE id = ?1",
        [&id],
        |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                is_pinned: row.get::<_, i32>(3)? == 1,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}
