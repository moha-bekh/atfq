use crate::domain::ports::encryption_service::Ciphertext;

pub type MfaSecret = [u8; 20];
pub type EncryptedMfaSecret = Ciphertext;

pub trait MfaService: Send + Sync {
    fn generate_mfa_secret() -> MfaSecret;
}
