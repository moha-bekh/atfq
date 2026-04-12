use crate::domain::ports::token_service::{TokenService, TokenPair};
use uuid::Uuid;
use jsonwebtoken::{encode, Header, EncodingKey};
use serde::{Serialize, Deserialize};
use chrono::{Utc, Duration};

#[derive(Debug, Serialize, Deserialize)]
struct JwtClaims {
    sub: String,
    iat: usize,
    exp: usize,
}

pub struct JwtAdapter {
    secret: String,
}

impl JwtAdapter {
    pub fn new(secret: String) -> Self {
        Self { secret }
    }
}

impl TokenService for JwtAdapter {
    fn generate_tokens(&self, user_id: Uuid) -> TokenPair {

        let access_token = self.create_token(&user_id, &self.secret, Duration::minutes(15));
        let refresh_token = self.create_token(&user_id, &self.secret, Duration::days(7));

        TokenPair {
            access: access_token,
            refresh: refresh_token,
        }
    }
}

impl JwtAdapter {
    fn create_token(&self, user_id: &Uuid, secret: &str, duration: Duration) -> String {
        let now = Utc::now();
        let expiry = now + duration;

        let claims = JwtClaims {
            sub: user_id.to_string(),
            iat: now.timestamp() as usize,
            exp: expiry.timestamp() as usize,
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_ref()),
        )
        .expect("Failed to generate JWT")
    }
}
