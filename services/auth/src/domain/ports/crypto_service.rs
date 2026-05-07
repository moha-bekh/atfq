pub trait CryptoService: Send + Sync {
    fn hash_password(&self, password: &str) -> Result<String, String>;
    fn verify_password(&self, password: &str, hash: &str) -> bool;
    fn hash(&self, data: &[u8]) -> String;
}
