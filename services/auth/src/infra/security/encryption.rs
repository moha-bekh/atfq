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
    fn encrypt(&self, data: &[u8]) -> Ciphertext {
        unimplemented!()
    }

    fn decrypt(&self, data: &Ciphertext) -> Vec<u8> {
        unimplemented!()
    }
}
