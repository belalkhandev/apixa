use crate::histogram::{
    calculate_percentiles, categorize_error, categorize_status, generate_histogram,
};
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
        let latencies = Arc::new(Mutex::new(Vec::<u64>::with_capacity(10000)));
        let bytes_sent = Arc::new(Mutex::new(0u64));
        let bytes_received = Arc::new(Mutex::new(0u64));
        let error_categories = Arc::new(Mutex::new(HashMap::<String, u32>::new()));

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
        let latencies_clone = latencies.clone();
        let bytes_sent_clone = bytes_sent.clone();
        let bytes_received_clone = bytes_received.clone();
        let error_categories_clone = error_categories.clone();
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

                // Calculate percentiles and histogram
                let latencies_snapshot = latencies_clone.lock().unwrap().clone();
                let (p50, p90, p95, p99) = calculate_percentiles(&latencies_snapshot);
                let histogram = generate_histogram(&latencies_snapshot);

                let bytes_sent_total = *bytes_sent_clone.lock().unwrap();
                let bytes_received_total = *bytes_received_clone.lock().unwrap();
                let error_cats = error_categories_clone.lock().unwrap().clone();

                let progress = LoadTestProgress {
                    elapsed_seconds: elapsed,
                    completed_requests: completed,
                    successful_requests: successful,
                    failed_requests: failed,
                    current_rps: rps,
                    avg_latency_ms: avg_lat,
                    min_latency_ms: if min_lat == u64::MAX { 0 } else { min_lat },
                    max_latency_ms: max_lat,
                    p50_latency_ms: p50,
                    p90_latency_ms: p90,
                    p95_latency_ms: p95,
                    p99_latency_ms: p99,
                    bytes_sent: bytes_sent_total,
                    bytes_received: bytes_received_total,
                    error_categories: error_cats,
                    latency_histogram: histogram,
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
                let latencies = latencies.clone();
                let bytes_sent = bytes_sent.clone();
                let bytes_received = bytes_received.clone();
                let error_categories = error_categories.clone();
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

                            // Track latency (bounded to 10000 samples)
                            {
                                let mut lats = latencies.lock().unwrap();
                                if lats.len() < 10000 {
                                    lats.push(latency);
                                } else {
                                    // Replace oldest sample (simple circular buffer)
                                    lats[*completed.lock().unwrap() as usize % 10000] = latency;
                                }
                            }

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

                            let (status, error_msg, req_bytes_sent, req_bytes_received) = match res
                            {
                                Ok((status, sent, received)) => {
                                    *bytes_sent.lock().unwrap() += sent;
                                    *bytes_received.lock().unwrap() += received;

                                    if status >= 200 && status < 300 {
                                        *successful.lock().unwrap() += 1;
                                    } else {
                                        *failed.lock().unwrap() += 1;
                                        // Categorize HTTP error
                                        if let Some(category) = categorize_status(status) {
                                            let mut cats = error_categories.lock().unwrap();
                                            *cats.entry(category).or_insert(0) += 1;
                                        }
                                    }
                                    (status, None, sent, received)
                                }
                                Err(err_msg) => {
                                    *failed.lock().unwrap() += 1;
                                    // Categorize error
                                    let category = categorize_error(&err_msg);
                                    let mut cats = error_categories.lock().unwrap();
                                    *cats.entry(category).or_insert(0) += 1;
                                    (0, Some(err_msg), 0, 0)
                                }
                            };

                            {
                                let mut recent = recent_results.lock().unwrap();
                                if recent.len() < 20 {
                                    recent.push(RecordedRequest {
                                        name: req.name.clone(),
                                        method: req.method.clone(),
                                        url: req.url.clone(),
                                        status,
                                        latency_ms: latency,
                                        error: error_msg.clone(),
                                        error_category: error_msg
                                            .as_ref()
                                            .map(|e| categorize_error(e)),
                                        bytes_sent: req_bytes_sent,
                                        bytes_received: req_bytes_received,
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

        let latencies_final = latencies.lock().unwrap().clone();
        let (p50, p90, p95, p99) = calculate_percentiles(&latencies_final);
        let histogram = generate_histogram(&latencies_final);
        let bytes_sent_final = *bytes_sent.lock().unwrap();
        let bytes_received_final = *bytes_received.lock().unwrap();
        let error_cats_final = error_categories.lock().unwrap().clone();

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
            p50_latency_ms: p50,
            p90_latency_ms: p90,
            p95_latency_ms: p95,
            p99_latency_ms: p99,
            bytes_sent: bytes_sent_final,
            bytes_received: bytes_received_final,
            error_categories: error_cats_final,
            latency_histogram: histogram,
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
) -> Result<(u16, u64, u64), String> {
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

    let mut bytes_sent = 0u64;
    if let Some(ref body) = req.body {
        let expanded_body = resolve_variables(body, variables);
        bytes_sent = expanded_body.len() as u64;
        req_builder = req_builder.body(expanded_body);
    }

    let response = req_builder.send().await.map_err(|e| e.to_string())?;
    let status = response.status().as_u16();

    // Get response body to calculate bytes received
    let body_bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let bytes_received = body_bytes.len() as u64;

    Ok((status, bytes_sent, bytes_received))
}
