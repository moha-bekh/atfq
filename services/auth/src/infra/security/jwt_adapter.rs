use crate::domain::error::DomainError;
use crate::domain::ports::token_service::{TokenClaims, TokenPair, TokenService};
use chrono::{Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
struct JwtClaims {
    sub: String,
    iat: usize,
    exp: usize,
    jti: String,
    typ: String,
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
        let access_token =
            self.create_token(&user_id, &self.secret, Duration::minutes(15), "access");
        let refresh_token = self.create_token(&user_id, &self.secret, Duration::days(7), "refresh");

        TokenPair {
            access: access_token,
            refresh: refresh_token,
        }
    }

    fn decode_token(&self, token: &str) -> Result<TokenClaims, DomainError> {
        let decoded = decode::<JwtClaims>(
            token,
            &DecodingKey::from_secret(self.secret.as_ref()),
            &Validation::default(),
        )
        .map_err(|_| DomainError::Unauthenticated)?;

        let user_id =
            Uuid::from_str(&decoded.claims.sub).map_err(|_| DomainError::Unauthenticated)?;

        Ok(TokenClaims {
            user_id,
            exp: decoded.claims.exp,
            typ: decoded.claims.typ,
        })
    }
}

impl JwtAdapter {
    fn create_token(&self, user_id: &Uuid, secret: &str, duration: Duration, typ: &str) -> String {
        let now = Utc::now();
        let expiry = now + duration;
        let jti = Uuid::new_v4().to_string();

        let claims = JwtClaims {
            sub: user_id.to_string(),
            iat: now.timestamp() as usize,
            exp: expiry.timestamp() as usize,
            jti,
            typ: typ.to_string(),
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_ref()),
        )
        .expect("Failed to generate JWT")
    }
}
