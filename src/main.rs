use ghostRbot_core::AppConfig;
use ghostRbot_trading_engine::{TradingEngine, solana::SolanaDexClient, bsc::BscDexClient};
use ghostRbot_volume_bot::VolumeBot;
use ghostRbot_limit_orders::LimitOrderEngine;
use ghostRbot_discovery::DiscoveryEngine;
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
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "info,ghostrbot=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting ghostRbot...");

    // Load config
    let config = AppConfig::from_env();
    tracing::info!("Config loaded - port: {}", config.port);

    // Shared HTTP client
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    // Initialize database
    let db = ghostRbot_db::Database::connect(&config.database_url).await?;
    tracing::info!("Database connected");

    // Create DEX clients
    let solana_client = SolanaDexClient::new(&config.solana_rpc_url, http_client.clone());
    let bsc_client = BscDexClient::new(&config.bsc_rpc_url, http_client.clone());

    // Create trading engine
    let trading_engine = Arc::new(TradingEngine::new(
        Box::new(solana_client),
        Box::new(bsc_client),
    ));

    // Notification manager
    let notifier = Arc::new(NotificationManager::new());

    // Portfolio monitor
    let monitor = Arc::new(PortfolioMonitor::new(
        trading_engine.clone(),
        notifier.clone(),
    ));

    // Intelligence engine
    let intelligence = Arc::new(IntelligenceEngine::new(http_client.clone()));

    // Discovery engine
    let (discovery_tx, mut discovery_rx) = mpsc::channel::<ghostRbot_core::DiscoveredToken>(100);
    let discovery = DiscoveryEngine::new(discovery_tx);

    // Analysis pipeline
    let analysis = Arc::new(AnalysisPipeline::new());

    // Telegram bot
    let telegram_bot = if let Some(ref token) = config.telegram_bot_token {
        Some(TelegramBot::new(token))
    } else {
        None
    };

    // Build API state
    let app_state = ghostRbot_api::AppState {
        db,
        config: config.clone(),
        http_client: http_client.clone(),
    };

    // Spawn background tasks
    let monitor_pool = ghostRbot_db::Database::connect(&config.database_url).await?.pool;
    let monitor_wallets = Arc::new(std::collections::HashMap::new()); // TODO: load from DB
    let monitor_clone = monitor.clone();
    let monitor_pool_clone = monitor_pool.clone();
    let monitor_wallets_clone = monitor_wallets.clone();
    tokio::spawn(async move {
        monitor_clone.run(&monitor_pool_clone, monitor_wallets_clone).await;
    });

    // Spawn discovery engine
    let discovery_pool = ghostRbot_db::Database::connect(&config.database_url).await?.pool;
    let discovery_analysis = analysis.clone();
    let discovery_intel = intelligence.clone();
    tokio::spawn(async move {
        discovery.start().await.ok();

        while let Some(token) = discovery_rx.recv().await {
            let analysis = discovery_analysis.clone();
            let intel = discovery_intel.clone();
            let pool = discovery_pool.clone();

            tokio::spawn(async move {
                match analysis.analyze(&token).await {
                    Ok(result) => {
                        tracing::info!(
                            token = %token.token_symbol,
                            score = result.score,
                            "Token analyzed"
                        );

                        // Store in DB
                        // TODO: Store analysis result

                        if result.score > 70.0 {
                            tracing::info!(token = %token.token_symbol, score = result.score, "High-scoring token discovered!");
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

    // Create API router
    let state = Arc::new(app_state);
    let app = ghostRbot_api::create_router(state);

    // Start server
    let addr = format!("0.0.0.0:{}", config.port);
    tracing::info!("ghostRbot server listening on {}", addr);
    tracing::info!("API available at http://localhost:{}/api", config.port);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
