use std::collections::HashMap;
use std::time::Instant;
use tauri::State;

#[derive(serde::Serialize)]
pub struct HttpResponse {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body: String,
    time: u128,
    size: usize,
}

#[derive(serde::Deserialize)]
pub struct HttpRequest {
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
    body_type: Option<String>,
    form_data: Option<Vec<FormDataPart>>,
}

#[derive(serde::Deserialize)]
pub struct FormDataPart {
    key: String,
    value: String,
    #[serde(rename = "type")]
    part_type: String, // "text" | "file"
    enabled: bool,
}

#[tauri::command]
pub async fn send_http_request(
    client: State<'_, reqwest::Client>,
    request: HttpRequest,
) -> Result<HttpResponse, String> {
    let method = match request.method.as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "PATCH" => reqwest::Method::PATCH,
        "HEAD" => reqwest::Method::HEAD,
        "OPTIONS" => reqwest::Method::OPTIONS,
        _ => return Err(format!("Unsupported method: {}", request.method)),
    };

    let mut req_builder = client.request(method, &request.url);

    for (key, value) in request.headers {
        req_builder = req_builder.header(key, value);
    }

    if let Some(body_type) = request.body_type {
        if body_type == "formdata" {
            if let Some(form_parts) = request.form_data {
                let mut form = reqwest::multipart::Form::new();
                for p in form_parts {
                    if p.enabled {
                        if p.part_type == "file" && !p.value.is_empty() {
                            let path = std::path::Path::new(&p.value);
                            if path.exists() {
                                let file_name = path
                                    .file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("file")
                                    .to_string();
                                if let Ok(file_bytes) = std::fs::read(path) {
                                    let part = reqwest::multipart::Part::bytes(file_bytes)
                                        .file_name(file_name);
                                    form = form.part(p.key, part);
                                }
                            }
                        } else {
                            form = form.text(p.key, p.value);
                        }
                    }
                }
                req_builder = req_builder.multipart(form);
            }
        } else if let Some(body) = request.body {
            req_builder = req_builder.body(body);
        }
    } else if let Some(body) = request.body {
        req_builder = req_builder.body(body);
    }

    let start_time = Instant::now();
    let response = req_builder.send().await.map_err(|e| e.to_string())?;
    let time = start_time.elapsed().as_millis();

    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("")
        .to_string();

    let mut headers_size = 0;
    let mut headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(val) = value.to_str() {
            headers.insert(key.to_string(), val.to_string());
            // Approximate header size: Key + ": " + Value + "\r\n"
            headers_size += key.as_str().len() + val.len() + 4;
        }
    }

    let body_bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let body_size = body_bytes.len();
    let body = String::from_utf8_lossy(&body_bytes).to_string();

    // Approximate status line size: "HTTP/1.1 " + status + " " + status_text + "\r\n"
    let status_line_size = 9 + 3 + 1 + status_text.len() + 2;
    // Total size = status line + headers + body + extra CRLF before body
    let size = status_line_size + headers_size + 2 + body_size;

    Ok(HttpResponse {
        status,
        status_text,
        headers,
        body,
        time,
        size,
    })
}
