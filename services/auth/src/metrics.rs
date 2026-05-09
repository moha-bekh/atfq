use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

pub async fn serve(
    service_name: &'static str,
    addr: String,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let started_at = now_seconds();
    let listener = TcpListener::bind(&addr).await?;
    println!("Metrics endpoint for {service_name} listening on {addr}");

    loop {
        let (mut stream, _) = listener.accept().await?;
        tokio::spawn(async move {
            let mut buffer = [0; 1024];
            let _ = stream.read(&mut buffer).await;
            let uptime = now_seconds().saturating_sub(started_at);
            let body = render_metrics(service_name, started_at, uptime);
            let response = format!(
                "HTTP/1.1 200 OK\r\ncontent-type: text/plain; version=0.0.4\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            let _ = stream.write_all(response.as_bytes()).await;
        });
    }
}

fn render_metrics(service_name: &str, started_at: u64, uptime: u64) -> String {
    format!(
        concat!(
            "# HELP atfq_service_up Whether the service process is running.\n",
            "# TYPE atfq_service_up gauge\n",
            "atfq_service_up{{service=\"{}\"}} 1\n",
            "# HELP atfq_service_start_time_seconds Unix timestamp when the service started.\n",
            "# TYPE atfq_service_start_time_seconds gauge\n",
            "atfq_service_start_time_seconds{{service=\"{}\"}} {}\n",
            "# HELP atfq_service_uptime_seconds Seconds since the service started.\n",
            "# TYPE atfq_service_uptime_seconds gauge\n",
            "atfq_service_uptime_seconds{{service=\"{}\"}} {}\n",
        ),
        service_name, service_name, started_at, service_name, uptime
    )
}

fn now_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}
