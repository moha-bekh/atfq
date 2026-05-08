use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::LogoutRequest;
use crate::domain::ports::token_service::TokenPair;
use tonic::{Request, Response, Status};

impl AuthHandler {
    pub async fn logout_handler(
        &self,
        request: Request<LogoutRequest>,
    ) -> Result<Response<()>, Status> {
        let req = request.into_inner();
        let tokens = TokenPair {
            access: req.access_token.clone(),
            refresh: req.refresh_token.clone(),
        };

        self.logout_uc
            .execute(tokens)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(()))
    }
}
