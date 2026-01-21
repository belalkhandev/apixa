use crate::models::HistogramBucket;

/// Calculate percentiles from a list of latencies
/// Returns (p50, p90, p95, p99)
pub fn calculate_percentiles(latencies: &[u64]) -> (u64, u64, u64, u64) {
    if latencies.is_empty() {
        return (0, 0, 0, 0);
    }

    let mut sorted = latencies.to_vec();
    sorted.sort_unstable();

    let len = sorted.len();
    let p50 = sorted[len * 50 / 100];
    let p90 = sorted[len * 90 / 100];
    let p95 = sorted[len * 95 / 100];
    let p99 = sorted[len * 99 / 100];

    (p50, p90, p95, p99)
}

/// Generate histogram buckets from latencies
/// Buckets: 0-10ms, 10-50ms, 50-100ms, 100-200ms, 200-500ms, 500-1000ms, 1000-2000ms, 2000-5000ms, 5000+ms
pub fn generate_histogram(latencies: &[u64]) -> Vec<HistogramBucket> {
    let bucket_ranges = vec![
        (0, 10),
        (10, 50),
        (50, 100),
        (100, 200),
        (200, 500),
        (500, 1000),
        (1000, 2000),
        (2000, 5000),
        (5000, u64::MAX),
    ];

    let mut buckets = Vec::new();

    for (start, end) in bucket_ranges {
        let count = latencies
            .iter()
            .filter(|&&lat| lat >= start && (end == u64::MAX || lat < end))
            .count() as u32;

        buckets.push(HistogramBucket {
            range_start: start,
            range_end: if end == u64::MAX { 0 } else { end }, // 0 means infinity
            count,
        });
    }

    buckets
}

/// Categorize error message into a category
pub fn categorize_error(error: &str) -> String {
    let error_lower = error.to_lowercase();

    if error_lower.contains("timeout") || error_lower.contains("timed out") {
        "timeout".to_string()
    } else if error_lower.contains("connection refused") {
        "connection_refused".to_string()
    } else if error_lower.contains("dns") || error_lower.contains("name resolution") {
        "dns_error".to_string()
    } else if error_lower.contains("tls")
        || error_lower.contains("ssl")
        || error_lower.contains("certificate")
    {
        "tls_error".to_string()
    } else if error_lower.contains("network") || error_lower.contains("unreachable") {
        "network_error".to_string()
    } else {
        "other".to_string()
    }
}

/// Categorize HTTP status code
pub fn categorize_status(status: u16) -> Option<String> {
    match status {
        400..=499 => Some("4xx".to_string()),
        500..=599 => Some("5xx".to_string()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_percentiles() {
        let latencies = vec![10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        let (p50, p90, p95, p99) = calculate_percentiles(&latencies);
        assert_eq!(p50, 50);
        assert_eq!(p90, 90);
        assert_eq!(p95, 95);
        assert_eq!(p99, 99);
    }

    #[test]
    fn test_histogram() {
        let latencies = vec![5, 25, 75, 150, 350, 750, 1500, 3500, 7000];
        let histogram = generate_histogram(&latencies);
        assert_eq!(histogram.len(), 9);
        assert_eq!(histogram[0].count, 1); // 0-10ms
        assert_eq!(histogram[1].count, 1); // 10-50ms
        assert_eq!(histogram[2].count, 1); // 50-100ms
    }

    #[test]
    fn test_error_categorization() {
        assert_eq!(categorize_error("connection timed out"), "timeout");
        assert_eq!(categorize_error("Connection refused"), "connection_refused");
        assert_eq!(categorize_error("DNS lookup failed"), "dns_error");
        assert_eq!(categorize_error("TLS handshake failed"), "tls_error");
        assert_eq!(categorize_error("unknown error"), "other");
    }
}
