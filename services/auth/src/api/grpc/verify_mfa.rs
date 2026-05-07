use tonic::{Request, Response, Status};
use crate::auth_proto::{User as ProtoUser, AuthSuccess, VerifyMfaRequest};
use crate::api::grpc::handler::{AuthHandler};
use crate::api::grpc::handler::map_domain_error;
use crate::domain::error::DomainError;
use crate::domain::ports::cache_service::CacheService;
use std::convert::AsRef;

const MAX_MFA_ATTEMPTS: u64 = 5;

async fn get_requesting_info(cache: &dyn CacheService, id: &str) -> Result<(String, String), DomainError> {
    let key = format!("mfa:{}", id);
    let value = cache.get(&key)
         .await?
         .ok_or_else(|| DomainError::Internal("auth request not found".to_string()))?;

    let parts: Vec<&str> = value.split(':').collect();
    if parts.len() < 2 {
        return Err(DomainError::Internal("malformed mfa request data".to_string()));
    }

    let user_id = parts[0].to_string();
    let secret_hash = parts[1].to_string();

    let counter_key = format!("mfa_attempts:{}", id);
    let attempt_count = cache.increment(&counter_key).await?;
    if attempt_count > MAX_MFA_ATTEMPTS {
        return Err(DomainError::Unauthorized);
    }

    Ok((user_id, secret_hash))
}

async fn remove_auth_request(cache: &dyn CacheService, id: &str) -> Result<(), DomainError> {
    let counter_key = format!("mfa_attempts:{}", id);
    let key = format!("mfa:{}", id);
    cache.delete(&key).await?;
    cache.delete(&counter_key).await?;

    Ok(())
}

impl AuthHandler {
    pub async fn verify_mfa_handler(&self, request: Request<VerifyMfaRequest>) -> Result<Response<AuthSuccess>, Status> {
        let req = request.into_inner();

        let (user_id, secret_hash) = get_requesting_info(self.cache_service.as_ref(), &req.login_request_id)
            .await
            .map_err(map_domain_error)?;

        let authenticated_user = self.verify_mfa_uc
            .execute(user_id.as_str(), &req.code, &secret_hash)
            .await
            .map_err(map_domain_error)?;
        let user = &authenticated_user.user;

        remove_auth_request(self.cache_service.as_ref(), &req.login_request_id)
            .await
            .ok();

        Ok(Response::new(AuthSuccess {
            user: Some(ProtoUser {
                id: user.id.to_string(),
                username: user.username.to_string(),
                email: user.email.to_string(),
                has_password: user.password_hash.as_ref().map(|h| !h.is_empty()).unwrap_or(false),
                mfa_enabled: user.mfa_secret.is_some(),
            }),
            refresh_token: authenticated_user.refresh_token,
            access_token: authenticated_user.access_token,
        }))
    }
}
