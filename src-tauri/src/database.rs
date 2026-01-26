use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        std::fs::create_dir_all(&app_data_dir).ok();
        let db_path = app_data_dir.join("apixa.db");
        let conn = Connection::open(db_path)?;

        let db = Database {
            conn: Mutex::new(conn),
        };

        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS environments (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS environment_variables (
                id TEXT PRIMARY KEY,
                environment_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                collection_id TEXT NOT NULL,
                parent_id TEXT,
                name TEXT NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS requests (
                id TEXT PRIMARY KEY,
                collection_id TEXT NOT NULL,
                folder_id TEXT,
                name TEXT NOT NULL,
                method TEXT NOT NULL DEFAULT 'GET',
                url TEXT NOT NULL DEFAULT '',
                body TEXT,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS request_headers (
                id TEXT PRIMARY KEY,
                request_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS request_params (
                id TEXT PRIMARY KEY,
                request_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                param_type TEXT NOT NULL DEFAULT 'string',
                description TEXT,
                enabled INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_folders_collection ON folders(collection_id);
            CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
            CREATE INDEX IF NOT EXISTS idx_requests_collection ON requests(collection_id);
            CREATE INDEX IF NOT EXISTS idx_requests_folder ON requests(folder_id);
            CREATE INDEX IF NOT EXISTS idx_env_vars_environment ON environment_variables(environment_id);
            CREATE INDEX IF NOT EXISTS idx_request_headers_request ON request_headers(request_id);
            CREATE INDEX IF NOT EXISTS idx_request_params_request ON request_params(request_id);

            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT,
                is_pinned INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned DESC, updated_at DESC);

            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#3b82f6',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

            CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                priority TEXT NOT NULL DEFAULT 'medium',
                due_date TEXT,
                project_id TEXT,
                start_date TEXT,
                end_date TEXT,
                is_challenge INTEGER NOT NULL DEFAULT 0,
                challenge_duration_minutes INTEGER,
                challenge_elapsed_seconds INTEGER NOT NULL DEFAULT 0,
                challenge_started_at TEXT,
                challenge_is_paused INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
            CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
            CREATE INDEX IF NOT EXISTS idx_todos_created ON todos(created_at DESC);

            CREATE TABLE IF NOT EXISTS db_schemas (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                data TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_db_schemas_created ON db_schemas(created_at DESC);
            "
        )?;

        // Add new columns for request persistence and features
        let _ = conn.execute("ALTER TABLE requests ADD COLUMN auth_type TEXT", []);
        let _ = conn.execute("ALTER TABLE requests ADD COLUMN auth_data TEXT", []);
        let _ = conn.execute("ALTER TABLE requests ADD COLUMN extract_rules TEXT", []);
        let _ = conn.execute(
            "ALTER TABLE requests ADD COLUMN body_type TEXT DEFAULT 'none'",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE request_headers ADD COLUMN carry_forward INTEGER NOT NULL DEFAULT 0",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE request_params ADD COLUMN carry_forward INTEGER NOT NULL DEFAULT 0",
            [],
        );

        // Add new columns for todos (for existing databases)
        let _ = conn.execute("ALTER TABLE todos ADD COLUMN project_id TEXT", []);
        let _ = conn.execute("ALTER TABLE todos ADD COLUMN start_date TEXT", []);
        let _ = conn.execute("ALTER TABLE todos ADD COLUMN end_date TEXT", []);
        let _ = conn.execute(
            "ALTER TABLE todos ADD COLUMN is_challenge INTEGER NOT NULL DEFAULT 0",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE todos ADD COLUMN challenge_duration_minutes INTEGER",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE todos ADD COLUMN challenge_elapsed_seconds INTEGER NOT NULL DEFAULT 0",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE todos ADD COLUMN challenge_started_at TEXT",
            [],
        );
        let _ = conn.execute(
            "ALTER TABLE todos ADD COLUMN challenge_is_paused INTEGER NOT NULL DEFAULT 1",
            [],
        );

        // Create index for project_id after column is added (for existing databases)
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id)",
            [],
        );

        // Add sort_order column for drag-and-drop ordering
        let _ = conn.execute(
            "ALTER TABLE todos ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
            [],
        );
        let _ = conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_todos_sort ON todos(status, sort_order)",
            [],
        );

        Ok(())
    }
}
