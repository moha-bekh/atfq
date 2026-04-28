use crate::domain::ports::mfa_service::{MfaSecret, MfaService};
use crate::domain::error::DomainError;
use rand::Rng;
use totp_rs::{Algorithm, TOTP};

pub struct TotpMfa;

impl MfaService for TotpMfa {
	fn generate_mfa_secret(&self) -> MfaSecret {
		let mut bytes: MfaSecret = MfaSecret::default();
		rand::rng().fill_bytes(&mut bytes);
		bytes
	}

	fn code_currently_valid(&self, secret: &MfaSecret, code: &str) -> Result<bool, DomainError> {
		let totp = TOTP::new(Algorithm::SHA1, 6, 1, 30, secret.to_vec())
			.map_err(|_| DomainError::Internal("OTP instantiation error".to_string()))?;

		let valid = totp.check_current(code)
			.map_err(|_| DomainError::Internal("System clock error".to_string()))?;

		Ok(valid)
	}

	fn make_human_readable_secret(&self, secret: &MfaSecret) -> String {
		base32::encode(
			base32::Alphabet::Rfc4648 { padding: false },
			secret,
		)
	}
}
