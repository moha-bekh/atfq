use tonic::{Request, Response, Status};
use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::GetUserRequest;

impl AuthHandler {
    pub async fn disable_mfa_handler(&self, request: Request<GetUserRequest>) -> Result<Response<()>, Status> {
        let claims = self.auth_interceptor_check(&request)?;
        
        self.disable_mfa_uc.execute(claims.user_id).await.map_err(map_domain_error)?;

        Ok(Response::new(()))
    }

    fn auth_interceptor_check<T>(&self, request: &Request<T>) -> Result<crate::domain::ports::token_service::TokenClaims, Status> {
        let auth_header = request.metadata().get("authorization")
            .ok_or_else(|| Status::unauthenticated("Missing authorization header"))?;
        
        let token = auth_header.to_str()
            .map_err(|_| Status::unauthenticated("Invalid authorization header"))?
            .strip_prefix("Bearer ")
            .ok_or_else(|| Status::unauthenticated("Invalid token format"))?;

        self.token_service.decode_token(token)
            .map_err(|_| Status::unauthenticated("Invalid or expired token"))
    }
}
