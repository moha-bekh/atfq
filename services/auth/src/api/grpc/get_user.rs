use tonic::{Request, Response, Status};
use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::{UserIdMessage, User as ProtoUser};
use std::str::FromStr;
use uuid::Uuid;

impl AuthHandler {
    pub async fn get_user_by_id_handler(&self, request: Request<UserIdMessage>) -> Result<Response<ProtoUser>, Status> {
        let req = request.into_inner();
        
        let id = Uuid::from_str(&req.id)
            .map_err(|_| Status::invalid_argument("Invalid user ID format"))?;

        let user = self.get_user_uc
            .execute(id)
            .await
            .map_err(map_domain_error)?;

        let response = ProtoUser {
            id: user.id.to_string(),
            username: user.username.to_string(),
            email: user.email.to_string(),
        };

        Ok(Response::new(response))
    }
}
