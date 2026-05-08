use crate::grpc::auth::AuthServiceClient;
use crate::grpc::user::UserServiceClient;
use crate::grpc::wiki::WikiServiceClient;
use sqlx::PgPool;
use tonic::transport::Channel;

pub struct AppState {
    pub auth_client: AuthServiceClient<Channel>,
    pub user_client: UserServiceClient<Channel>,
    pub wiki_client: WikiServiceClient<Channel>,
    pub auth_db: Option<PgPool>,
    pub user_db: Option<PgPool>,
}
