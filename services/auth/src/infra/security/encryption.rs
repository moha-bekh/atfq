use crate::domain::ports::encryption_service::{Ciphertext, EncryptionService};

pub struct ChaChaEncryption;

impl EncryptionService for ChaChaEncryption {
    fn encrypt(&self, data: &[u8]) -> Ciphertext {
        unimplemented!()
    }

    fn decrypt(&self, data: &Ciphertext) -> Vec<u8> {
        unimplemented!()
    }
}
