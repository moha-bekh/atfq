use tonic::{Request, Response, Status};
use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::{GetUserRequest, LinkedProvidersResponse, LinkedProvider};

impl AuthHandler {
    pub async fn get_linked_providers_handler(&self, request: Request<GetUserRequest>) -> Result<Response<LinkedProvidersResponse>, Status> {
        let req = request.into_inner();
        
        let claims = self.token_service.decode_token(&req.access_token)
            .map_err(|_| Status::unauthenticated("Invalid or expired token"))?;

        if claims.typ != "access" {
            return Err(Status::unauthenticated("Invalid token type"));
        }

        let id = claims.user_id;

        let accounts = self.get_linked_providers_uc
            .execute(id)
            .await
            .map_err(map_domain_error)?;

        let response = LinkedProvidersResponse {
            providers: accounts.into_iter().map(|(name, provider_id)| {
                LinkedProvider { name, provider_id }
            }).collect(),
        };

        Ok(Response::new(response))
    }
}
