use tonic::{Request, Response, Status};

use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::{PasswordResetRequest, PasswordResetResponse};

impl AuthHandler {
    pub async fn request_password_reset_handler(
        &self,
        request: Request<PasswordResetRequest>,
    ) -> Result<Response<PasswordResetResponse>, Status> {
        let payload = request.into_inner();
        self.request_password_reset_uc
            .execute(&payload.identifier)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(PasswordResetResponse {
            accepted: true,
            reset_token: String::new(),
        }))
    }
}
