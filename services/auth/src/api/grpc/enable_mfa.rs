use tonic::{Request, Response, Status};
use crate::auth_proto::{EnableMfaRequest, EnableMfaResponse};
use crate::api::grpc::handler::AuthHandler;

impl AuthHandler {
    pub async fn enable_mfa_handler(&self, request: Request<EnableMfaRequest>) -> Result<Response<EnableMfaResponse>, Status> {
        let req = request.into_inner();

        unimplemented!("hello from enable_mfa_handler! {req:?}");
    }
}
