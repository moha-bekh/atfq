use async_trait::async_trait;
use crate::domain::error::DomainError;
use crate::domain::ports::user_profile_service::UserProfileService;
use crate::user_proto::user_service_client::UserServiceClient;
use crate::user_proto::CreateProfileRequest;
use uuid::Uuid;
use tonic::transport::Channel;

use std::time::Duration;
use tokio::time::sleep;

pub struct GrpcUserProfileService {
    client: UserServiceClient<Channel>,
}

impl GrpcUserProfileService {
    pub async fn new(addr: String) -> Result<Self, Box<dyn std::error::Error>> {
        let mut retry_count = 0;
        let max_retries = 15;

        loop {
            match UserServiceClient::connect(addr.clone()).await {
                Ok(client) => {
                    println!("Connected to User Service at {}", addr);
                    return Ok(Self { client });
                }
                Err(e) => {
                    retry_count += 1;
                    if retry_count >= max_retries {
                        return Err(Box::<dyn std::error::Error>::from(e));
                    }

                    println!(
                        "User Service not ready ({}/{})... Retrying in 2s. Error: {}", 
                        retry_count, 
                        max_retries,
                        e
                    );

                    sleep(Duration::from_secs(2)).await;
                }
            }
        }
    }
}

#[async_trait]
impl UserProfileService for GrpcUserProfileService {
    async fn create_profile(&self, user_id: Uuid) -> Result<(), DomainError> {
        let mut client = self.client.clone();
        
        let request = tonic::Request::new(CreateProfileRequest {
            id: user_id.to_string(),
        });

        client.create_profile(request)
            .await
            .map_err(|e| DomainError::Internal(e.to_string()))?;

        Ok(())
    }
}
