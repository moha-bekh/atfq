use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::{GetUserRequest, User as ProtoUser};
use tonic::{Request, Response, Status};

impl AuthHandler {
    pub async fn get_user_handler(
        &self,
        request: Request<GetUserRequest>,
    ) -> Result<Response<ProtoUser>, Status> {
        let req = request.into_inner();

        let claims = self
            .token_service
            .decode_token(&req.access_token)
            .map_err(|_| Status::unauthenticated("Invalid or expired token"))?;

        if claims.typ != "access" {
            return Err(Status::unauthenticated("Invalid token type"));
        }

        let id = claims.user_id;

        let user = self
            .get_user_uc
            .execute(id)
            .await
            .map_err(map_domain_error)?;

        let response = ProtoUser {
            id: user.id.to_string(),
            username: user.username.to_string(),
            email: user.email.to_string(),
            has_password: user
                .password_hash
                .as_ref()
                .map(|h| !h.is_empty())
                .unwrap_or(false),
            mfa_enabled: user.mfa_secret.is_some(),
        };

        Ok(Response::new(response))
    }
}
