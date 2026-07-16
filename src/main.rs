use ghostRbot_core::AppConfig;
use ghostRbot_trading_engine::{TradingEngine, solana::SolanaDexClient, bsc::BscDexClient};
use ghostRbot_analysis::AnalysisPipeline;
use ghostRbot_intelligence::IntelligenceEngine;
use ghostRbot_monitoring::PortfolioMonitor;
use ghostRbot_notifications::NotificationManager;
use ghostRbot_telegram::TelegramBot;
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "info,ghostrbot=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting ghostRbot...");

    let _ = dotenvy::dotenv();

    let config = AppConfig::from_env();
    tracing::info!("Config loaded - port: {}", config.port);

    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let solana_client = SolanaDexClient::new(&config.solana_rpc_url, http_client.clone());
    let bsc_client = BscDexClient::new(&config.bsc_rpc_url, http_client.clone());

    let trading_engine = Arc::new(TradingEngine::new(
        Box::new(solana_client),
        Box::new(bsc_client),
    ));

    let notifier = Arc::new(NotificationManager::new());
    let monitor = Arc::new(PortfolioMonitor::new(trading_engine.clone(), notifier.clone()));
    let intelligence = Arc::new(IntelligenceEngine::new(http_client.clone()));
    let analysis = Arc::new(AnalysisPipeline::new());

    let telegram_bot = if let Some(ref token) = config.telegram_bot_token {
        Some(TelegramBot::new(token))
    } else {
        None
    };

    // Discovery channel
    let (discovery_tx, mut discovery_rx) = mpsc::channel::<ghostRbot_core::DiscoveredToken>(100);

    // Spawn discovery + analysis pipeline
    let discovery_analysis = analysis.clone();
    tokio::spawn(async move {
        let http = reqwest::Client::new();
        match ghostRbot_discovery::poll_source("dexscreener", &http, "").await {
            Ok(tokens) => tracing::info!("Discovery test: found {} tokens", tokens.len()),
            Err(e) => tracing::warn!("Discovery test failed: {}", e),
        }

        while let Some(token) = discovery_rx.recv().await {
            let analysis = discovery_analysis.clone();
            tokio::spawn(async move {
                match analysis.analyze(&token).await {
                    Ok(result) => {
                        tracing::info!(token = %token.token_symbol, score = result.score, "Token analyzed");
                        if result.score > 70.0 {
                            tracing::info!(token = %token.token_symbol, score = result.score, "High-scoring token!");
                        }
                    }
                    Err(e) => {
                        tracing::error!(token = %token.token_address, error = %e, "Analysis failed");
                    }
                }
            });
        }
    });

    // Spawn Telegram bot
    if let Some(bot) = telegram_bot {
        let telegram_intel = intelligence.clone();
        tokio::spawn(async move {
            if let Err(e) = bot.start_polling(&telegram_intel).await {
                tracing::error!("Telegram bot error: {}", e);
            }
        });
    }

    // Build API state
    let db = ghostRbot_db::Database::connect(&config.database_url).await?;
    tracing::info!("Database connected");

    let app_state = Arc::new(ghostRbot_api::AppState {
        db,
        config: config.clone(),
        http_client,
    });

    let app = ghostRbot_api::create_router(app_state);

    let addr = format!("0.0.0.0:{}", config.port);
    tracing::info!("ghostRbot server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
