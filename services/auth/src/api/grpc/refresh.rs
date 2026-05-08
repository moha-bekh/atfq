use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::{
    AuthResponse, AuthSuccess, RefreshRequest, User as ProtoUser, auth_response,
};
use tonic::{Request, Response, Status};

impl AuthHandler {
    pub async fn refresh_handler(
        &self,
        request: Request<RefreshRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        let req = request.into_inner();

        let result = self
            .refresh_uc
            .execute(&req.refresh_token)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(AuthResponse {
            result: Some(auth_response::Result::Success(AuthSuccess {
                user: Some(ProtoUser {
                    id: result.user.id.to_string(),
                    username: result.user.username.to_string(),
                    email: result.user.email.to_string(),
                    has_password: result
                        .user
                        .password_hash
                        .as_ref()
                        .map(|h| !h.is_empty())
                        .unwrap_or(false),
                    mfa_enabled: result.user.mfa_secret.is_some(),
                }),
                access_token: result.access_token,
                refresh_token: result.refresh_token,
            })),
        }))
    }
}
