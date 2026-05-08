pub mod api;
pub mod app;
pub mod domain;
pub mod infra;

pub mod auth_proto {
    tonic::include_proto!("auth.v1");
    pub const FILE_DESCRIPTOR_SET: &[u8] = tonic::include_file_descriptor_set!("auth_descriptor");
}

pub mod user_proto {
    tonic::include_proto!("user.v1");
}
