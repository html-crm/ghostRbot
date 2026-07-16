use ghostRbot_core::AppConfig;
use ghostRbot_api::{create_router, AppState};
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting ghostRbot...");

    // Load config
    let config = AppConfig::from_env();
    tracing::info!("Config loaded - port: {}", config.port);

    // Initialize app state
    let state = AppState::new(config.clone()).await?;
    tracing::info!("App state initialized");

    // Create router
    let app = create_router(state);

    // Start server
    let addr = format!("0.0.0.0:{}", config.port);
    tracing::info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
