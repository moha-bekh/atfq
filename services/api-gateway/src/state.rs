use tonic::transport::Channel;
use crate::grpc::auth::AuthServiceClient; 
use crate::grpc::user::UserServiceClient;

pub struct AppState {
    pub auth_client: AuthServiceClient<Channel>,
    pub user_client: UserServiceClient<Channel>,
}
