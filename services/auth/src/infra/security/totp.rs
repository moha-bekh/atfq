use crate::domain::ports::mfa_service::{MfaSecret, MfaService};
use rand::Rng;

pub struct TotpMfa {
}

impl MfaService for TotpMfa {
	fn generate_mfa_secret() -> MfaSecret {
		let mut bytes: MfaSecret = MfaSecret::default();
		rand::rng().fill_bytes(&mut bytes);
		bytes
	}

	fn make_human_readable_secret(secret: &MfaSecret) -> String {
		base32::encode(
			base32::Alphabet::Rfc4648 { padding: false },
			secret,
		)
	}
}
