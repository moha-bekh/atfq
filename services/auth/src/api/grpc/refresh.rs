use tonic::{Request, Response, Status};
use crate::auth_proto::{RefreshRequest, AuthResponse, AuthSuccess, User as ProtoUser, auth_response};
use crate::api::grpc::handler::{AuthHandler, map_domain_error};

impl AuthHandler {
    pub async fn refresh_handler(&self, request: Request<RefreshRequest>) -> Result<Response<AuthResponse>, Status> {
        let req = request.into_inner();

        let result = self.refresh_uc
            .execute(&req.refresh_token)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(AuthResponse {
            result: Some(auth_response::Result::Success(AuthSuccess {
                user: Some(ProtoUser {
                    id: result.user.id.to_string(),
                    username: result.user.username.to_string(),
                    email: result.user.email.to_string(),
                }),
                access_token: result.access_token,
                refresh_token: result.refresh_token,
            })),
        }))
    }
}
