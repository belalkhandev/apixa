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

        Ok(())
    }
}
