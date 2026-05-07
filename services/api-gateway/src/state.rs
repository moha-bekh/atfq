use tonic::transport::Channel;
use crate::grpc::auth::AuthServiceClient; 
use crate::grpc::user::UserServiceClient;
use crate::grpc::wiki::WikiServiceClient;

pub struct AppState {
    pub auth_client: AuthServiceClient<Channel>,
    pub user_client: UserServiceClient<Channel>,
    pub wiki_client: WikiServiceClient<Channel>,
}
