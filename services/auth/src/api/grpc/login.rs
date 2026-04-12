use tonic::{Request, Response, Status};
use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::{AuthResponse, AuthSuccess, User as ProtoUser, auth_response, LoginRequest, identifier};

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
