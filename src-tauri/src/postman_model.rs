use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PostmanCollection {
    pub info: Info,
    pub item: Vec<PostmanItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Info {
    pub name: String,
    pub description: Option<String>,
    pub schema: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PostmanItem {
    pub name: Option<String>,
    pub item: Option<Vec<PostmanItem>>, // If present, it's a folder
    pub request: Option<PostmanRequest>, // If present, it's a request
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PostmanRequest {
    pub method: String,
    pub header: Vec<PostmanHeader>,
    pub url: PostmanUrl,
    pub body: Option<PostmanBody>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PostmanHeader {
    pub key: String,
    pub value: String,
    pub description: Option<String>,
    pub disabled: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum PostmanUrl {
    String(String),
    Object(PostmanUrlObject),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PostmanUrlObject {
    pub raw: String,
    pub protocol: Option<String>,
    pub host: Option<Vec<String>>,
    pub path: Option<Vec<String>>,
    pub query: Option<Vec<PostmanQueryParam>>,
    pub variable: Option<Vec<PostmanVariable>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PostmanQueryParam {
    pub key: Option<String>,
    pub value: Option<String>,
    pub description: Option<String>,
    pub disabled: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PostmanVariable {
    pub key: Option<String>,
    pub value: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PostmanBody {
    pub mode: Option<String>,
    pub raw: Option<String>,
    // We can add other body types (urlencoded, formdata) if needed,
    // but for now simple raw support is good for a start.
    // options: { raw: { language: "json" } }
}
