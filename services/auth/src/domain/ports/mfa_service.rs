use crate::domain::ports::encryption_service::Ciphertext;
use crate::domain::error::DomainError;

pub type MfaSecret = [u8; 20];
pub type EncryptedMfaSecret = Ciphertext;

pub trait MfaService: Send + Sync {
	fn generate_mfa_secret(&self) -> MfaSecret;
	fn code_currently_valid(&self, secret: &MfaSecret, code: &str) -> Result<bool, DomainError>;
	fn make_human_readable_secret(&self, secret: &MfaSecret) -> String;
}
