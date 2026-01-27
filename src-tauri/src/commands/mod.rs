pub mod collections;
pub mod db_schemas;
pub mod environment;
pub mod http_request;
pub mod import_export;
pub mod load_test;
pub mod notes;
pub mod projects;
pub mod todos;

pub use collections::*;
pub use db_schemas::*;
pub use environment::*;
pub use http_request::*;
pub use import_export::*;
pub use load_test::*;
pub use notes::*;
pub use projects::*;
pub use todos::*;

use chrono::Utc;
use uuid::Uuid;

pub fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

pub fn now() -> String {
    Utc::now().to_rfc3339()
}
