use tonic::{Request, Response, Status};
use crate::auth_proto::{EnableMfaRequest, EnableMfaResponse};
use crate::api::grpc::handler::{AuthHandler};
use crate::api::grpc::handler::map_domain_error;

impl AuthHandler {
    pub async fn enable_mfa_handler(&self, request: Request<EnableMfaRequest>) -> Result<Response<EnableMfaResponse>, Status> {
        let req = request.into_inner();

        let secret = self.enable_mfa_uc
            .execute(&req.access_token)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(
            EnableMfaResponse { secret_base32: secret }
        ))
    }
}
