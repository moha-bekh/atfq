use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema)]
pub enum OAuthProvider {
    #[serde(rename = "google")]
    Google,
    #[serde(rename = "github")]
    Github,
}

#[derive(Serialize, ToSchema)]
pub struct OAuthUrlResponse {
    pub url: String,
}

#[derive(Deserialize, ToSchema)]
pub struct OAuthCallbackParams {
    pub code: String,
    pub state: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct LinkedProvider {
    pub name: String,
    pub provider_id: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct LinkedProvidersResponse {
    pub providers: Vec<LinkedProvider>,
}
