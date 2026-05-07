use tonic::{Request, Response, Status};
use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::UnlinkProviderRequest;

impl AuthHandler {
    pub async fn unlink_provider_handler(&self, request: Request<UnlinkProviderRequest>) -> Result<Response<()>, Status> {
        let req = request.into_inner();
        
        let claims = self.token_service.decode_token(&req.access_token)
            .map_err(|_| Status::unauthenticated("Invalid or expired token"))?;

        if claims.typ != "access" {
            return Err(Status::unauthenticated("Invalid token type"));
        }

        let user_id = claims.user_id;

        self.unlink_oauth_uc
            .execute(user_id, &req.provider)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(()))
    }
}
