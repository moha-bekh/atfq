use tonic::{Request, Response, Status};
use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::{AuthResponse, AuthSuccess, MfaMethod, MfaRequired, User as ProtoUser, auth_response, LoginRequest, identifier};
use crate::domain::ports::cache_service::CacheService;
use crate::domain::error::DomainError;
use crate::domain::entities::{LoginResult, User};
use std::convert::AsRef;
use std::time::Duration;
use uuid::Uuid;

const DEFAULT_MFA_REQUEST_TTL: Duration = Duration::from_mins(3);

async fn make_login_request(cache: &dyn CacheService, user: &User) -> Result<Uuid, DomainError> {
    let id = Uuid::new_v4();

    let key = format!("mfa:{}", id);
    let counter_key = format!("mfa_attempts:{}", id);
    let value = user.id.to_string();
    cache.set(key.as_str(), value.as_str(), DEFAULT_MFA_REQUEST_TTL)
         .await
         .map_err(|e| DomainError::Internal(e.to_string()))?;
    cache.set(counter_key.as_str(), "0", DEFAULT_MFA_REQUEST_TTL)
         .await
         .map_err(|e| DomainError::Internal(e.to_string()))?;

    Ok(id)
}

impl AuthHandler {
    pub async fn login_handler(&self, request: Request<LoginRequest>) -> Result<Response<AuthResponse>, Status> {
        let req = request.into_inner();

        let id_msg = req.id.ok_or_else(|| Status::invalid_argument("Missing identifier"))?;
        
        let identifier_str = match id_msg.id {
            Some(identifier::Id::Email(email)) => email,
            Some(identifier::Id::Username(username)) => username,
            None => return Err(Status::invalid_argument("Identifier must be email or username")),
        };

        let result = self.login_uc
            .execute(&identifier_str, &req.password)
            .await
            .map_err(map_domain_error)?;

        let response = match result {
            LoginResult::Requires2FA(user) => {
                let login_request_id = make_login_request(self.cache_service.as_ref(), &user)
                    .await
                    .map_err(map_domain_error)?;
                AuthResponse {
                    result: Some(auth_response::Result::MfaRequired(MfaRequired {
                        login_request_id: login_request_id.to_string(),
                        preferred_method: MfaMethod::MethodTotp as i32
                    })),
                }
            }
            LoginResult::Success(result) => {
                AuthResponse {
                    result: Some(auth_response::Result::Success(AuthSuccess {
                        access_token: result.access_token,
                        refresh_token: result.refresh_token,
                        user: Some(ProtoUser {
                            id: result.user.id.to_string(),
                            username: result.user.username.to_string(),
                            email: result.user.email.to_string(),
                        }),
                    })),
                }
            }
        };

        Ok(Response::new(response))
    }
}
