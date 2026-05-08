use tonic::{Request, Response, Status};

use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::PasswordResetConfirmRequest;

impl AuthHandler {
    pub async fn confirm_password_reset_handler(
        &self,
        request: Request<PasswordResetConfirmRequest>,
    ) -> Result<Response<()>, Status> {
        let payload = request.into_inner();
        self.confirm_password_reset_uc
            .execute(&payload.reset_token, &payload.new_password)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(()))
    }
}
