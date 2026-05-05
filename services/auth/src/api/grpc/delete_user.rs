use tonic::{Request, Response, Status};
use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::DeleteUserRequest;
use crate::domain::ports::token_service::TokenPair;

impl AuthHandler {
    pub async fn delete_user_handler(&self, request: Request<DeleteUserRequest>) -> Result<Response<()>, Status> {
        let req = request.into_inner();
        
        let claims = self.token_service.decode_token(&req.access_token)
            .map_err(|_| Status::unauthenticated("Invalid or expired token"))?;

        if claims.typ != "access" {
            return Err(Status::unauthenticated("Invalid token type"));
        }

        let id = claims.user_id;

        let tokens = TokenPair {
            access: req.access_token,
            refresh: req.refresh_token,
        };

        self.delete_user_uc
            .execute(id, tokens)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(()))
    }
}
