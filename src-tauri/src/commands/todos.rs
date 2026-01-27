use super::{generate_id, now};
use crate::database::Database;
use crate::models::*;
use tauri::State;

#[tauri::command]
pub fn get_todos(db: State<Database>) -> Result<Vec<Todo>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, description, status, priority, due_date, project_id, start_date, end_date, is_challenge, challenge_duration_minutes, challenge_elapsed_seconds, challenge_started_at, challenge_is_paused, sort_order, created_at, updated_at FROM todos ORDER BY status, sort_order ASC, created_at DESC")
        .map_err(|e| e.to_string())?;

    let todos = stmt
        .query_map([], |row| {
            Ok(Todo {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                priority: row.get(4)?,
                due_date: row.get(5)?,
                project_id: row.get(6)?,
                start_date: row.get(7)?,
                end_date: row.get(8)?,
                is_challenge: row.get::<_, i32>(9).unwrap_or(0) == 1,
                challenge_duration_minutes: row.get(10)?,
                challenge_elapsed_seconds: row.get::<_, i32>(11).unwrap_or(0),
                challenge_started_at: row.get(12)?,
                challenge_is_paused: row.get::<_, i32>(13).unwrap_or(1) == 1,
                sort_order: row.get::<_, i32>(14).unwrap_or(0),
                created_at: row.get(15)?,
                updated_at: row.get(16)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(todos)
}

#[tauri::command]
pub fn create_todo(db: State<Database>, input: CreateTodoInput) -> Result<Todo, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = generate_id();
    let timestamp = now();
    let is_challenge = input.is_challenge.unwrap_or(false);

    // Get the minimum sort_order for pending status to insert at the top
    let min_sort_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MIN(sort_order), 0) - 1 FROM todos WHERE status = 'pending'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO todos (id, title, description, status, priority, due_date, project_id, start_date, end_date, is_challenge, challenge_duration_minutes, challenge_elapsed_seconds, challenge_is_paused, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        (&id, &input.title, &input.description, "pending", &input.priority, &input.due_date, &input.project_id, &input.start_date, &input.end_date, is_challenge as i32, &input.challenge_duration_minutes, 0, 1, min_sort_order, &timestamp, &timestamp),
    )
    .map_err(|e| e.to_string())?;

    Ok(Todo {
        id,
        title: input.title,
        description: input.description,
        status: "pending".to_string(),
        priority: input.priority,
        due_date: input.due_date,
        project_id: input.project_id,
        start_date: input.start_date,
        end_date: input.end_date,
        is_challenge,
        challenge_duration_minutes: input.challenge_duration_minutes,
        challenge_elapsed_seconds: 0,
        challenge_started_at: None,
        challenge_is_paused: true,
        sort_order: min_sort_order,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    })
}

#[tauri::command]
pub fn update_todo(db: State<Database>, input: UpdateTodoInput) -> Result<Todo, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = now();
    let is_challenge = input.is_challenge.unwrap_or(false);

    conn.execute(
        "UPDATE todos SET title = ?1, description = ?2, status = ?3, priority = ?4, due_date = ?5, project_id = ?6, start_date = ?7, end_date = ?8, is_challenge = ?9, challenge_duration_minutes = ?10, updated_at = ?11 WHERE id = ?12",
        (&input.title, &input.description, &input.status, &input.priority, &input.due_date, &input.project_id, &input.start_date, &input.end_date, is_challenge as i32, &input.challenge_duration_minutes, &timestamp, &input.id),
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, title, description, status, priority, due_date, project_id, start_date, end_date, is_challenge, challenge_duration_minutes, challenge_elapsed_seconds, challenge_started_at, challenge_is_paused, sort_order, created_at, updated_at FROM todos WHERE id = ?1",
        [&input.id],
        |row| {
            Ok(Todo {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                priority: row.get(4)?,
                due_date: row.get(5)?,
                project_id: row.get(6)?,
                start_date: row.get(7)?,
                end_date: row.get(8)?,
                is_challenge: row.get::<_, i32>(9).unwrap_or(0) == 1,
                challenge_duration_minutes: row.get(10)?,
                challenge_elapsed_seconds: row.get::<_, i32>(11).unwrap_or(0),
                challenge_started_at: row.get(12)?,
                challenge_is_paused: row.get::<_, i32>(13).unwrap_or(1) == 1,
                sort_order: row.get::<_, i32>(14).unwrap_or(0),
                created_at: row.get(15)?,
                updated_at: row.get(16)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_todo(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM todos WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_todo_status(db: State<Database>, id: String, status: String) -> Result<Todo, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = now();

    // Check if new status is pending to set sort_order
    if status == "pending" {
        // ... logic for re-sorting if needed, or just append/prepend
        // For simplicity, we just update status here and handle reordering in reorder_todos or let user reorder.
    }

    conn.execute(
        "UPDATE todos SET status = ?1, updated_at = ?2 WHERE id = ?3",
        (&status, &timestamp, &id),
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, title, description, status, priority, due_date, project_id, start_date, end_date, is_challenge, challenge_duration_minutes, challenge_elapsed_seconds, challenge_started_at, challenge_is_paused, sort_order, created_at, updated_at FROM todos WHERE id = ?1",
        [&id],
        |row| {
            Ok(Todo {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                priority: row.get(4)?,
                due_date: row.get(5)?,
                project_id: row.get(6)?,
                start_date: row.get(7)?,
                end_date: row.get(8)?,
                is_challenge: row.get::<_, i32>(9).unwrap_or(0) == 1,
                challenge_duration_minutes: row.get(10)?,
                challenge_elapsed_seconds: row.get::<_, i32>(11).unwrap_or(0),
                challenge_started_at: row.get(12)?,
                challenge_is_paused: row.get::<_, i32>(13).unwrap_or(1) == 1,
                sort_order: row.get::<_, i32>(14).unwrap_or(0),
                created_at: row.get(15)?,
                updated_at: row.get(16)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_challenge_timer(
    db: State<Database>,
    input: UpdateChallengeTimerInput,
) -> Result<Todo, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = now();

    conn.execute(
        "UPDATE todos SET challenge_elapsed_seconds = ?1, challenge_started_at = ?2, challenge_is_paused = ?3, updated_at = ?4 WHERE id = ?5",
        (&input.challenge_elapsed_seconds, &input.challenge_started_at, input.challenge_is_paused as i32, &timestamp, &input.id),
    )
    .map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, title, description, status, priority, due_date, project_id, start_date, end_date, is_challenge, challenge_duration_minutes, challenge_elapsed_seconds, challenge_started_at, challenge_is_paused, sort_order, created_at, updated_at FROM todos WHERE id = ?1",
        [&input.id],
        |row| {
            Ok(Todo {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                priority: row.get(4)?,
                due_date: row.get(5)?,
                project_id: row.get(6)?,
                start_date: row.get(7)?,
                end_date: row.get(8)?,
                is_challenge: row.get::<_, i32>(9).unwrap_or(0) == 1,
                challenge_duration_minutes: row.get(10)?,
                challenge_elapsed_seconds: row.get::<_, i32>(11).unwrap_or(0),
                challenge_started_at: row.get(12)?,
                challenge_is_paused: row.get::<_, i32>(13).unwrap_or(1) == 1,
                sort_order: row.get::<_, i32>(14).unwrap_or(0),
                created_at: row.get(15)?,
                updated_at: row.get(16)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reorder_todos(db: State<Database>, input: ReorderTodosInput) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let timestamp = now();

    // 1. If target_status is provided and different from current, update status
    if !input.target_status.is_empty() {
        conn.execute(
            "UPDATE todos SET status = ?1, updated_at = ?2 WHERE id = ?3",
            (&input.target_status, &timestamp, &input.todo_id),
        )
        .map_err(|e| e.to_string())?;
    }

    // 2. Update sort_order for all items in the list
    for (index, id) in input.new_order.iter().enumerate() {
        conn.execute(
            "UPDATE todos SET sort_order = ?1 WHERE id = ?2",
            (index as i32, id),
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
