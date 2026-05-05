use tonic::{Request, Response, Status};
use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::UpdateEmailRequest;

impl AuthHandler {
    pub async fn update_email_handler(&self, request: Request<UpdateEmailRequest>) -> Result<Response<()>, Status> {
        let req = request.into_inner();
        
        let claims = self.token_service.decode_token(&req.access_token)
            .map_err(|_| Status::unauthenticated("Invalid or expired token"))?;

        if claims.typ != "access" {
            return Err(Status::unauthenticated("Invalid token type"));
        }

        self.update_email_uc
            .execute(claims.user_id, &req.new_email)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(()))
    }
}
