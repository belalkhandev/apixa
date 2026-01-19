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
    pub headers: Vec<HeaderInput>,
    pub params: Vec<ParamInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeaderInput {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParamInput {
    pub key: String,
    pub value: String,
    pub param_type: String,
    pub description: Option<String>,
    pub enabled: bool,
}
