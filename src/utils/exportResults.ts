import { LoadTestProgress, RecordedRequest } from "../api";

export function exportToJSON(progress: LoadTestProgress, requestLog: RecordedRequest[]): string {
    const exportData = {
        summary: {
            elapsed_seconds: progress.elapsed_seconds,
            completed_requests: progress.completed_requests,
            successful_requests: progress.successful_requests,
            failed_requests: progress.failed_requests,
            current_rps: progress.current_rps,
        },
        latency: {
            avg_ms: progress.avg_latency_ms,
            min_ms: progress.min_latency_ms,
            max_ms: progress.max_latency_ms,
            p50_ms: progress.p50_latency_ms,
            p90_ms: progress.p90_latency_ms,
            p95_ms: progress.p95_latency_ms,
            p99_ms: progress.p99_latency_ms,
        },
        throughput: {
            bytes_sent: progress.bytes_sent,
            bytes_received: progress.bytes_received,
        },
        error_categories: progress.error_categories,
        latency_histogram: progress.latency_histogram,
        request_log: requestLog,
    };

    return JSON.stringify(exportData, null, 2);
}

export function exportToCSV(requestLog: RecordedRequest[]): string {
    const headers = [
        "Name",
        "Method",
        "URL",
        "Status",
        "Latency (ms)",
        "Bytes Sent",
        "Bytes Received",
        "Error",
        "Error Category",
    ];

    const rows = requestLog.map((req) => [
        req.name,
        req.method,
        req.url,
        req.status.toString(),
        req.latency_ms.toString(),
        req.bytes_sent.toString(),
        req.bytes_received.toString(),
        req.error || "",
        req.error_category || "",
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
            row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
        ),
    ].join("\n");

    return csvContent;
}

export async function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
