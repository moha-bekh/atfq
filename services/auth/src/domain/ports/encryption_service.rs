use crate::domain::error::DomainError;

pub struct Ciphertext {
    data: Vec<u8>,
    nonce: Vec<u8>,
}

impl Ciphertext {
    pub fn new(data: Vec<u8>, nonce: Vec<u8>) -> Self {
        Self { data, nonce }
    }

    pub fn data(&self) -> &Vec<u8> {
        &self.data
    }

    pub fn nonce(&self) -> &Vec<u8> {
        &self.nonce
    }
}

pub trait EncryptionService: Send + Sync {
    fn encrypt(&self, data: &[u8]) -> Result<Ciphertext, DomainError>;
    fn decrypt(&self, data: &Ciphertext) -> Result<Vec<u8>, DomainError>;
}
