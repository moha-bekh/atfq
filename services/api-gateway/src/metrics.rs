use axum::{http::header, response::IntoResponse};
use std::sync::OnceLock;
use std::time::{SystemTime, UNIX_EPOCH};

static START_TIME_SECONDS: OnceLock<u64> = OnceLock::new();

pub fn init() {
    let _ = START_TIME_SECONDS.set(now_seconds());
}

pub async fn handler() -> impl IntoResponse {
    let started_at = *START_TIME_SECONDS.get_or_init(now_seconds);
    let uptime = now_seconds().saturating_sub(started_at);
    let body = format!(
        concat!(
            "# HELP atfq_service_up Whether the service process is running.\n",
            "# TYPE atfq_service_up gauge\n",
            "atfq_service_up{{service=\"api-gateway\"}} 1\n",
            "# HELP atfq_service_start_time_seconds Unix timestamp when the service started.\n",
            "# TYPE atfq_service_start_time_seconds gauge\n",
            "atfq_service_start_time_seconds{{service=\"api-gateway\"}} {}\n",
            "# HELP atfq_service_uptime_seconds Seconds since the service started.\n",
            "# TYPE atfq_service_uptime_seconds gauge\n",
            "atfq_service_uptime_seconds{{service=\"api-gateway\"}} {}\n",
        ),
        started_at, uptime
    );

    ([(header::CONTENT_TYPE, "text/plain; version=0.0.4")], body)
}

fn now_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}
