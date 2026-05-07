use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema)]
pub enum MfaMethod {
    TOTP,
    SMS,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct EnableMFARequest {
    pub method: MfaMethod,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct EnableMFAResponse {
    pub secret_base32: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct VerifyMFARequest {
    pub login_request_id: String,
    pub code: String,
}
