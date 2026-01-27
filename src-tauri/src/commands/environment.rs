use super::{generate_id, now};
use crate::database::Database;
use crate::models::*;
use tauri::State;

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
