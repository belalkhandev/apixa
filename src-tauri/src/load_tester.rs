use crate::models::{LoadTestConfig, LoadTestProgress, RecordedRequest, Request};
use futures::stream::{self, StreamExt};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::sync::broadcast;

pub struct LoadTester {
    stop_tx: Option<broadcast::Sender<()>>,
}

impl LoadTester {
    pub fn new() -> Self {
        Self { stop_tx: None }
    }

    pub async fn run(
        &mut self,
        app: AppHandle,
        config: LoadTestConfig,
        requests: Vec<Request>,
        variables: HashMap<String, String>,
    ) -> Result<(), String> {
        let (stop_tx, _) = broadcast::channel::<()>(1);
        self.stop_tx = Some(stop_tx.clone());

        let concurrent_users = config.concurrent_users as usize;
        let delay = Duration::from_millis(config.delay_ms as u64);
        let start_time = Instant::now();

        let successful_requests = Arc::new(Mutex::new(0u32));
        let failed_requests = Arc::new(Mutex::new(0u32));
        let total_latency = Arc::new(Mutex::new(0u128));
        let completed_requests = Arc::new(Mutex::new(0u32));
        let min_latency = Arc::new(Mutex::new(u64::MAX));
        let max_latency = Arc::new(Mutex::new(0u64));
        let recent_results = Arc::new(Mutex::new(Vec::<RecordedRequest>::with_capacity(20)));

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .map_err(|e| e.to_string())?;

        let requests = Arc::new(requests);
        let variables = Arc::new(variables);
        let mut stop_rx = stop_tx.subscribe();

        let app_clone = app.clone();
        let successful_clone = successful_requests.clone();
        let failed_clone = failed_requests.clone();
        let total_latency_clone = total_latency.clone();
        let completed_clone = completed_requests.clone();
        let min_latency_clone = min_latency.clone();
        let max_latency_clone = max_latency.clone();
        let recent_results_clone = recent_results.clone();
        let collection_id = config.collection_id.clone();

        // Progress reporting task
        let progress_handle = tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(1));
            loop {
                interval.tick().await;
                let elapsed = start_time.elapsed().as_secs() as u32;
                let completed = *completed_clone.lock().unwrap();
                let successful = *successful_clone.lock().unwrap();
                let failed = *failed_clone.lock().unwrap();
                let lat = *total_latency_clone.lock().unwrap();
                let min_lat = *min_latency_clone.lock().unwrap();
                let max_lat = *max_latency_clone.lock().unwrap();

                let mut recent = recent_results_clone.lock().unwrap();
                let results_to_send = recent.clone();
                recent.clear();
                drop(recent);

                let avg_lat = if completed > 0 {
                    (lat / completed as u128) as u64
                } else {
                    0
                };
                let rps = if elapsed > 0 {
                    completed as f64 / elapsed as f64
                } else {
                    0.0
                };

                let progress = LoadTestProgress {
                    elapsed_seconds: elapsed,
                    completed_requests: completed,
                    successful_requests: successful,
                    failed_requests: failed,
                    current_rps: rps,
                    avg_latency_ms: avg_lat,
                    min_latency_ms: if min_lat == u64::MAX { 0 } else { min_lat },
                    max_latency_ms: max_lat,
                    is_finished: false,
                    recent_results: results_to_send,
                };

                let event_name = format!("load_test_progress_{}", collection_id);
                let _ = app_clone.emit(&event_name, progress);

                if let Some(duration) = config.duration_seconds {
                    if elapsed >= duration {
                        break;
                    }
                }
            }
        });

        // Worker tasks
        let workers = stream::iter(0..concurrent_users)
            .map(|_| {
                let client = client.clone();
                let requests = requests.clone();
                let variables = variables.clone();
                let successful = successful_requests.clone();
                let failed = failed_requests.clone();
                let total_latency = total_latency.clone();
                let completed = completed_requests.clone();
                let min_latency = min_latency.clone();
                let max_latency = max_latency.clone();
                let recent_results = recent_results.clone();
                let mut stop_rx = stop_tx.subscribe();
                let loop_count = config.loop_count;
                let duration = config.duration_seconds;
                let start_time = start_time;

                async move {
                    let mut current_loop = 0;
                    loop {
                        if let Some(lc) = loop_count {
                            if current_loop >= lc {
                                break;
                            }
                        }
                        if let Some(d) = duration {
                            if start_time.elapsed().as_secs() >= d as u64 {
                                break;
                            }
                        }
                        if stop_rx.try_recv().is_ok() {
                            break;
                        }

                        for req in requests.iter() {
                            if stop_rx.try_recv().is_ok() {
                                break;
                            }

                            let req_start = Instant::now();
                            let res = execute_request(&client, req, &variables).await;
                            let latency = req_start.elapsed().as_millis() as u64;

                            *completed.lock().unwrap() += 1;
                            *total_latency.lock().unwrap() += latency as u128;

                            {
                                let mut min = min_latency.lock().unwrap();
                                if latency < *min {
                                    *min = latency;
                                }
                                let mut max = max_latency.lock().unwrap();
                                if latency > *max {
                                    *max = latency;
                                }
                            }

                            let status = match res {
                                Ok(status) => {
                                    if status >= 200 && status < 300 {
                                        *successful.lock().unwrap() += 1;
                                    } else {
                                        *failed.lock().unwrap() += 1;
                                    }
                                    status
                                }
                                Err(_) => {
                                    *failed.lock().unwrap() += 1;
                                    0
                                }
                            };

                            {
                                let mut recent = recent_results.lock().unwrap();
                                if recent.len() < 20 {
                                    recent.push(RecordedRequest {
                                        name: req.name.clone(),
                                        method: req.method.clone(),
                                        url: req.url.clone(), // This is the raw URL, we could send expanded if needed
                                        status,
                                        latency_ms: latency,
                                        error: res.as_ref().err().cloned(),
                                    });
                                }
                            }

                            if delay.as_millis() > 0 {
                                tokio::time::sleep(delay).await;
                            }
                        }
                        current_loop += 1;
                    }
                }
            })
            .buffer_unordered(concurrent_users)
            .collect::<Vec<()>>();

        tokio::select! {
            _ = workers => {},
            _ = stop_rx.recv() => {},
        }

        progress_handle.abort();

        // Final progress report
        let elapsed = start_time.elapsed().as_secs() as u32;
        let completed = *completed_requests.lock().unwrap();
        let successful = *successful_requests.lock().unwrap();
        let failed = *failed_requests.lock().unwrap();
        let lat = *total_latency.lock().unwrap();
        let min_lat = *min_latency.lock().unwrap();
        let max_lat = *max_latency.lock().unwrap();

        let avg_lat = if completed > 0 {
            (lat / completed as u128) as u64
        } else {
            0
        };
        let rps = if elapsed > 0 {
            completed as f64 / elapsed as f64
        } else {
            0.0
        };

        let final_progress = LoadTestProgress {
            elapsed_seconds: elapsed,
            completed_requests: completed,
            successful_requests: successful,
            failed_requests: failed,
            current_rps: rps,
            avg_latency_ms: avg_lat,
            min_latency_ms: if min_lat == u64::MAX { 0 } else { min_lat },
            max_latency_ms: max_lat,
            is_finished: true,
            recent_results: Vec::new(),
        };
        let event_name = format!("load_test_progress_{}", config.collection_id);
        let _ = app.emit(&event_name, final_progress);

        Ok(())
    }

    pub fn stop(&mut self) {
        if let Some(stop_tx) = self.stop_tx.take() {
            let _ = stop_tx.send(());
        }
    }
}

fn resolve_variables(text: &str, variables: &HashMap<String, String>) -> String {
    let mut result = text.to_string();
    for (key, value) in variables {
        let placeholder = format!("{{{{{}}}}}", key);
        result = result.replace(&placeholder, value);
    }
    result
}

async fn execute_request(
    client: &reqwest::Client,
    req: &Request,
    variables: &HashMap<String, String>,
) -> Result<u16, String> {
    let method = match req.method.as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "PATCH" => reqwest::Method::PATCH,
        "HEAD" => reqwest::Method::HEAD,
        "OPTIONS" => reqwest::Method::OPTIONS,
        _ => return Err(format!("Unsupported method: {}", req.method)),
    };

    let url = resolve_variables(&req.url, variables);
    let mut req_builder = client.request(method, &url);

    for h in &req.headers {
        if h.enabled {
            let key = resolve_variables(&h.key, variables);
            let value = resolve_variables(&h.value, variables);
            req_builder = req_builder.header(key, value);
        }
    }

    if let Some(ref body) = req.body {
        let expanded_body = resolve_variables(body, variables);
        req_builder = req_builder.body(expanded_body);
    }

    let response = req_builder.send().await.map_err(|e| e.to_string())?;
    Ok(response.status().as_u16())
}
