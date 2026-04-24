pub struct Ciphertext {
	data: Vec<u8>,
	nonce: Vec<u8>
}

pub trait EncryptionService: Send + Sync {
	fn encrypt(&self, data: &[u8]) -> Ciphertext;
	fn decrypt(&self, data: &Ciphertext) -> Vec<u8>;
}
