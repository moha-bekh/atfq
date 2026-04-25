use crate::domain::{
    error::DomainError,
    ports::encryption_service::{Ciphertext, EncryptionService}
};
use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    ChaCha20Poly1305
};

pub type ChaChaKey = [u8; 32];

pub struct ChaChaEncryption {
    cipher: ChaCha20Poly1305
}

impl ChaChaEncryption {
    pub fn from_key(key: &ChaChaKey) -> Self {
        Self {
            cipher: ChaCha20Poly1305::new(key.into())
        }
    }
}

impl EncryptionService for ChaChaEncryption {
    fn encrypt(&self, data: &[u8]) -> Result<Ciphertext, DomainError> {
        let nonce = ChaCha20Poly1305::generate_nonce(&mut OsRng);

        let ciphertext = self.cipher.encrypt(&nonce, data)
            .map_err(|e| DomainError::Internal(e.to_string()))?;

        Ok(Ciphertext::new(ciphertext, Vec::from(nonce.as_slice())))
    }

    fn decrypt(&self, data: &Ciphertext) -> Result<Vec<u8>, DomainError> {
        let (data, nonce) = (data.data().as_slice(), data.nonce().as_slice());

        self.cipher.decrypt(data.into(), nonce)
            .map_err(|e| DomainError::Internal(e.to_string()))
    }
}
