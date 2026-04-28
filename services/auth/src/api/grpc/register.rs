use tonic::{Request, Response, Status};
use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::{AuthResponse, AuthSuccess, User as ProtoUser, auth_response, RegisterRequest};

impl AuthHandler {
    pub async fn register_handler(&self, request: Request<RegisterRequest>) -> Result<Response<AuthResponse>, Status> {
        let req = request.into_inner();

        let result = self.register_uc
            .execute(&req.username, &req.email, &req.password)
            .await
            .map_err(map_domain_error)?;

        let response = AuthResponse {
            result: Some(auth_response::Result::Success(AuthSuccess {
                access_token: result.access_token,
                refresh_token: result.refresh_token,
                user: Some(ProtoUser {
                    id: result.user.id.to_string(),
                    username: result.user.username.to_string(),
                    email: result.user.email.to_string(),
                }),
            })),
        };

        Ok(Response::new(response))
    }
}
