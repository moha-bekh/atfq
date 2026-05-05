use tonic::{Request, Response, Status};
use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::UserIdMessage;
use std::str::FromStr;
use uuid::Uuid;

impl AuthHandler {
    pub async fn delete_user_by_id_handler(&self, request: Request<UserIdMessage>) -> Result<Response<()>, Status> {
        let req = request.into_inner();
        
        let id = Uuid::from_str(&req.id)
            .map_err(|_| Status::invalid_argument("Invalid user ID format"))?;

        self.delete_user_uc
            .execute(id)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(()))
    }
}
