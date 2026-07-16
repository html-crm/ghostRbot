use ghostRbot_core::AppConfig;
use ghostRbot_db::Database;
use std::sync::Arc;
use reqwest::Client;

pub struct AppState {
    pub db: Database,
    pub config: AppConfig,
    pub http_client: Client,
}

impl AppState {
    pub async fn new(config: AppConfig) -> anyhow::Result<Arc<Self>> {
        let db = Database::connect(&config.database_url).await?;
        let http_client = Client::new();

        Ok(Arc::new(Self {
            db,
            config,
            http_client,
        }))
    }
}
