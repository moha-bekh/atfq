use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema)]
pub struct HelloRequest {
    pub name: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct HelloResponse {
    pub message: String,
}
