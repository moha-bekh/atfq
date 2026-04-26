use crate::domain::ports::oauth_service::{OAuthProvider, OAuthUserInfo};
use crate::domain::error::DomainError;
use async_trait::async_trait;
use oauth2::basic::BasicClient;
use oauth2::{
    AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl,
    AuthorizationCode, CsrfToken, Scope, TokenResponse,
};
use oauth2::reqwest::async_http_client;
use serde::Deserialize;

pub struct GoogleAdapter {
    client: BasicClient,
}

#[derive(Deserialize)]
struct GoogleUserResponse {
    sub: String,
    name: String,
    email: String,
    picture: String,
}

impl GoogleAdapter {
    pub fn new(client_id: String, client_secret: String, redirect_url: String) -> Self {
        let client = BasicClient::new(
            ClientId::new(client_id),
            Some(ClientSecret::new(client_secret)),
            AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string()).expect("Invalid auth URL"),
            Some(TokenUrl::new("https://oauth2.googleapis.com/token".to_string()).expect("Invalid token URL")),
        )
        .set_redirect_uri(RedirectUrl::new(redirect_url).expect("Invalid redirect URL"));

        Self { client }
    }
}

#[async_trait]
impl OAuthProvider for GoogleAdapter {
    fn generate_auth_url(&self) -> (String, String) {
        let (auth_url, csrf_token) = self.client
            .authorize_url(CsrfToken::new_random)
            .add_scope(Scope::new("https://www.googleapis.com/auth/userinfo.email".to_string()))
            .add_scope(Scope::new("https://www.googleapis.com/auth/userinfo.profile".to_string()))
            .url();

        (auth_url.to_string(), csrf_token.secret().to_string())
    }

    async fn fetch_user_info(&self, code: String) -> Result<OAuthUserInfo, DomainError> {
        let token_result = self.client
            .exchange_code(AuthorizationCode::new(code))
            .request_async(async_http_client)
            .await
            .map_err(|e| DomainError::Internal(format!("Failed to exchange code: {}", e)))?;

        let client = reqwest::Client::new();
        let google_user = client
            .get("https://www.googleapis.com/oauth2/v3/userinfo")
            .bearer_auth(token_result.access_token().secret())
            .send()
            .await
            .map_err(|e| DomainError::Internal(format!("Failed to fetch user info: {}", e)))?
            .json::<GoogleUserResponse>()
            .await
            .map_err(|e| DomainError::Internal(format!("Invalid JSON response: {}", e)))?;

        Ok(OAuthUserInfo {
            email: google_user.email,
            username: google_user.name,
            provider_id: google_user.sub,
            avatar_url: Some(google_user.picture),
        })
    }
}
