use std::time::Duration;
use tokio::time::sleep;
use tonic::transport::Channel;

tonic::include_proto!("wiki");

pub use wiki_service_client::WikiServiceClient;

pub async fn connect() -> Result<WikiServiceClient<Channel>, Box<dyn std::error::Error>> {
    let addr = std::env::var("WIKI_SERVICE_URL").unwrap_or_else(|_| "http://wiki:8080".into());
    let mut retry_count = 0;
    let max_retries = std::env::var("STARTUP_MAX_RETRIES")
        .ok()
        .and_then(|value| value.parse::<u32>().ok())
        .unwrap_or(90);

    loop {
        match WikiServiceClient::connect(addr.clone()).await {
            Ok(client) => {
                println!("Connected to Wiki Service at {}", addr);
                return Ok(client);
            }
            Err(e) => {
                retry_count += 1;
                if retry_count >= max_retries {
                    return Err(Box::<dyn std::error::Error>::from(e));
                }

                println!(
                    "Wiki Service not ready ({}/{})... Retrying in 2s",
                    retry_count, max_retries
                );

                sleep(Duration::from_secs(2)).await;
            }
        }
    }
}
