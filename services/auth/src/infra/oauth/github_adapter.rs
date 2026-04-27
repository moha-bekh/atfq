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

pub struct GithubAdapter {
    client: BasicClient,
}

#[derive(Deserialize)]
struct GithubUserResponse {
    id: i64,
    login: String,
    name: Option<String>,
    email: Option<String>,
    avatar_url: Option<String>,
}

#[derive(Deserialize)]
struct GithubEmailResponse {
    email: String,
    primary: bool,
    verified: bool,
}

impl GithubAdapter {
    pub fn new(client_id: String, client_secret: String, redirect_url: String) -> Self {
        let client = BasicClient::new(
            ClientId::new(client_id),
            Some(ClientSecret::new(client_secret)),
            AuthUrl::new("https://github.com/login/oauth/authorize".to_string()).expect("Invalid auth URL"),
            Some(TokenUrl::new("https://github.com/login/oauth/access_token".to_string()).expect("Invalid token URL")),
        )
        .set_redirect_uri(RedirectUrl::new(redirect_url).expect("Invalid redirect URL"));

        Self { client }
    }
}

#[async_trait]
impl OAuthProvider for GithubAdapter {
    fn generate_auth_url(&self) -> (String, String) {
        let (auth_url, csrf_token) = self.client
            .authorize_url(CsrfToken::new_random)
            .add_scope(Scope::new("read:user".to_string()))
            .add_scope(Scope::new("user:email".to_string()))
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

        let github_user = client
            .get("https://api.github.com/user")
            .header("User-Agent", "atfq-auth-service")
            .bearer_auth(token_result.access_token().secret())
            .send()
            .await
            .map_err(|e| DomainError::Internal(format!("Failed to fetch user info: {}", e)))?
            .json::<GithubUserResponse>()
            .await
            .map_err(|e| DomainError::Internal(format!("Invalid JSON response from GitHub user info: {}", e)))?;

        let email = if let Some(e) = github_user.email {
            e
        } else {
            let emails = client
                .get("https://api.github.com/user/emails")
                .header("User-Agent", "atfq-auth-service")
                .bearer_auth(token_result.access_token().secret())
                .send()
                .await
                .map_err(|e| DomainError::Internal(format!("Failed to fetch user emails: {}", e)))?
                .json::<Vec<GithubEmailResponse>>()
                .await
                .map_err(|e| DomainError::Internal(format!("Invalid JSON response from GitHub user emails: {}", e)))?;

            emails.into_iter()
                .find(|e| e.primary && e.verified)
                .map(|e| e.email)
                .ok_or_else(|| DomainError::Internal("No verified primary email found for GitHub user".to_string()))?
        };

        Ok(OAuthUserInfo {
            email,
            username: github_user.name.unwrap_or(github_user.login),
            provider_id: github_user.id.to_string(),
            avatar_url: github_user.avatar_url,
        })
    }
}
