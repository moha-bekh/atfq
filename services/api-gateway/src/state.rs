use tonic::transport::Channel;
use crate::grpc::auth::AuthServiceClient; 

pub struct AppState {
    pub auth_client: AuthServiceClient<Channel>,
}
