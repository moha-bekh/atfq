pub struct Ciphertext {
	data: Vec<u8>,
	nonce: Vec<u8>
}

impl Ciphertext {
	pub fn data(&self) -> &Vec<u8> {
		&self.data
	}

	pub fn nonce(&self) -> &Vec<u8> {
		&self.nonce
	}
}

pub trait EncryptionService: Send + Sync {
	fn encrypt(&self, data: &[u8]) -> Ciphertext;
	fn decrypt(&self, data: &Ciphertext) -> Vec<u8>;
}
