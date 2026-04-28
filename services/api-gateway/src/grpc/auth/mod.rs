use std::time::Duration;
use tokio::time::sleep;
use tonic::transport::Channel;

tonic::include_proto!("auth.v1");

pub use auth_service_client::AuthServiceClient;

pub async fn connect() -> Result<AuthServiceClient<Channel>, Box<dyn std::error::Error>> {
    let addr = std::env::var("AUTH_SERVICE_URL").unwrap_or_else(|_| "http://auth:8080".into());
    let mut retry_count = 0;
    let max_retries = 15;

    loop {
        match AuthServiceClient::connect(addr.clone()).await {
            Ok(client) => {
                println!("Connected to Auth Service at {}", addr);
                return Ok(client);
            }
            Err(e) => {
                retry_count += 1;
                if retry_count >= max_retries {
                    return Err(Box::<dyn std::error::Error>::from(e));
                }

                println!(
                    "Auth Service not ready ({}/{})... Retrying in 2s", 
                    retry_count, 
                    max_retries
                );

                sleep(Duration::from_secs(2)).await;
            }
        }
    }
}
