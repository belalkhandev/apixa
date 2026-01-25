use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Environment {
    pub id: String,
    pub name: String,
    pub variables: Vec<EnvironmentVariable>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentVariable {
    pub id: String,
    pub environment_id: String,
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub collection_id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Request {
    pub id: String,
    pub collection_id: String,
    pub folder_id: Option<String>,
    pub name: String,
    pub method: String,
    pub url: String,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub auth_type: Option<String>,
    pub auth_data: Option<String>,
    pub extract_rules: Option<String>,
    pub headers: Vec<RequestHeader>,
    pub params: Vec<RequestParam>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestHeader {
    pub id: String,
    pub request_id: String,
    pub key: String,
    pub value: String,
    pub enabled: bool,
    pub carry_forward: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestParam {
    pub id: String,
    pub request_id: String,
    pub key: String,
    pub value: String,
    pub param_type: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub carry_forward: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderWithItems {
    pub id: String,
    pub name: String,
    pub sort_order: i32,
    pub items: Vec<TreeItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TreeItem {
    Folder(FolderWithItems),
    Request(RequestSummary),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestSummary {
    pub id: String,
    pub name: String,
    pub method: String,
    pub url: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCollectionInput {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCollectionInput {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEnvironmentInput {
    pub name: String,
    pub variables: Vec<CreateEnvVariableInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEnvVariableInput {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEnvironmentInput {
    pub id: String,
    pub name: String,
    pub variables: Vec<CreateEnvVariableInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFolderInput {
    pub collection_id: String,
    pub parent_id: Option<String>,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRequestInput {
    pub collection_id: String,
    pub folder_id: Option<String>,
    pub name: String,
    pub method: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateRequestInput {
    pub id: String,
    pub name: String,
    pub method: String,
    pub url: String,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub auth_type: Option<String>,
    pub auth_data: Option<String>,
    pub extract_rules: Option<String>,
    pub headers: Vec<HeaderInput>,
    pub params: Vec<ParamInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeaderInput {
    pub key: String,
    pub value: String,
    pub enabled: bool,
    pub carry_forward: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParamInput {
    pub key: String,
    pub value: String,
    pub param_type: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub carry_forward: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistogramBucket {
    pub range_start: u64,
    pub range_end: u64,
    pub count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadTestConfig {
    pub collection_id: String,
    pub environment_id: Option<String>,
    pub concurrent_users: u32,
    pub duration_seconds: Option<u32>,
    pub loop_count: Option<u32>,
    pub delay_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordedRequest {
    pub name: String,
    pub method: String,
    pub url: String,
    pub status: u16,
    pub latency_ms: u64,
    pub error: Option<String>,
    pub error_category: Option<String>,
    pub bytes_sent: u64,
    pub bytes_received: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadTestProgress {
    pub elapsed_seconds: u32,
    pub completed_requests: u32,
    pub successful_requests: u32,
    pub failed_requests: u32,
    pub current_rps: f64,
    pub avg_latency_ms: u64,
    pub min_latency_ms: u64,
    pub max_latency_ms: u64,
    pub p50_latency_ms: u64,
    pub p90_latency_ms: u64,
    pub p95_latency_ms: u64,
    pub p99_latency_ms: u64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub error_categories: std::collections::HashMap<String, u32>,
    pub latency_histogram: Vec<HistogramBucket>,
    pub is_finished: bool,
    pub recent_results: Vec<RecordedRequest>,
}

// ==================== Notes ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: Option<String>,
    pub is_pinned: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNoteInput {
    pub title: String,
    pub content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateNoteInput {
    pub id: String,
    pub title: String,
    pub content: Option<String>,
}

// ==================== Projects ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectInput {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProjectInput {
    pub id: String,
    pub name: String,
    pub color: String,
}

// ==================== Todos ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
    pub project_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub is_challenge: bool,
    pub challenge_duration_minutes: Option<i32>,
    pub challenge_elapsed_seconds: i32,
    pub challenge_started_at: Option<String>,
    pub challenge_is_paused: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTodoInput {
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub due_date: Option<String>,
    pub project_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub is_challenge: Option<bool>,
    pub challenge_duration_minutes: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTodoInput {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
    pub project_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub is_challenge: Option<bool>,
    pub challenge_duration_minutes: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateChallengeTimerInput {
    pub id: String,
    pub challenge_elapsed_seconds: i32,
    pub challenge_started_at: Option<String>,
    pub challenge_is_paused: bool,
}
