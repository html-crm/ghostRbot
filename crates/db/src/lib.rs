use sqlx::postgres::{PgPool, PgPoolOptions};
use std::time::Duration;

pub mod queries;

pub struct Database {
    pub pool: PgPool,
}

impl Database {
    pub async fn connect(database_url: &str) -> anyhow::Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .acquire_timeout(Duration::from_secs(30))
            .connect(database_url)
            .await?;

        sqlx::migrate!("migrations").run(&pool).await?;

        tracing::info!("Database connected and migrations applied");

        Ok(Self { pool })
    }
}
