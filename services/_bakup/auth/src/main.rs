use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Charger les variables d'env (Simulation Vault)
    // En local sur ton Mac, il cherchera .env, dans Docker il cherchera /vault/...
    let config_path = env::var("APP_CONFIG_PATH").unwrap_or_else(|_| ".env".to_string());
    dotenvy::from_path(config_path).ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    // 2. Créer le pool de connexion
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    println!("✅ Connecté à PostgreSQL !");

    // 3. Test de requête simple
    let row: (i32,) = sqlx::query_as("SELECT 1")
        .fetch_one(&pool)
        .await?;

    println!("🚀 Test query réussi, résultat: {}", row.0);

    // C'est ici que tu lanceras Axum plus tard
    // ...

    Ok(())
}
