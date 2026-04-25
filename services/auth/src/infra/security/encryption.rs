use crate::domain::ports::encryption_service::{Ciphertext, EncryptionService};

pub struct ChaChaEncryption {
    key: Vec<u8>
}

impl ChaChaEncryption {
    pub fn from_key(key: &[u8]) -> Self {
        Self {
            key: Vec::from(key)
        }
    }
}

impl EncryptionService for ChaChaEncryption {
    fn encrypt(&self, data: &[u8]) -> Result<Ciphertext, DomainError> {
        unimplemented!()
    }

    fn decrypt(&self, data: &Ciphertext) -> Result<Vec<u8>, DomainError> {
        unimplemented!()
    }
}
