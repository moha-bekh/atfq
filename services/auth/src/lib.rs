pub mod domain;
pub mod app;
pub mod infra;
pub mod api;

pub mod auth_proto {
    tonic::include_proto!("auth");
    pub const FILE_DESCRIPTOR_SET: &[u8] = tonic::include_file_descriptor_set!("auth_descriptor");
}
