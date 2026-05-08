use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::UpdatePasswordRequest;
use tonic::{Request, Response, Status};

impl AuthHandler {
    pub async fn update_password_handler(
        &self,
        request: Request<UpdatePasswordRequest>,
    ) -> Result<Response<()>, Status> {
        let req = request.into_inner();

        let claims = self
            .token_service
            .decode_token(&req.access_token)
            .map_err(|_| Status::unauthenticated("Invalid or expired token"))?;

        if claims.typ != "access" {
            return Err(Status::unauthenticated("Invalid token type"));
        }

        self.update_password_uc
            .execute(claims.user_id, &req.old_password, &req.new_password)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(()))
    }
}
