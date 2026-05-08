use crate::domain::ports::crypto_service::CryptoService;
use argon2::{
    Argon2,
    password_hash::{PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};
use sha2::{Digest, Sha256};

pub struct Argon2Hasher;

impl CryptoService for Argon2Hasher {
    fn hash_password(&self, password: &str) -> Result<String, String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();

        argon2
            .hash_password(password.as_bytes(), &salt)
            .map(|h| h.to_string())
            .map_err(|e| e.to_string())
    }

    fn verify_password(&self, password: &str, hash: &str) -> bool {
        let argon2 = Argon2::default();
        if let Ok(parsed_hash) = argon2::password_hash::PasswordHash::new(hash) {
            return argon2
                .verify_password(password.as_bytes(), &parsed_hash)
                .is_ok();
        }
        false
    }

    fn hash(&self, data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        hex::encode(hasher.finalize())
    }
}
