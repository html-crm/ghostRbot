pub mod sources;

use ghostRbot_core::{AppError, DiscoveredToken};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tokio::time::Duration;

pub struct DiscoveryEngine {
    sources: Vec<Box<dyn sources::DiscoverySource + Send + Sync>>,
    seen_addresses: Arc<Mutex<HashSet<String>>>,
    sender: mpsc::Sender<DiscoveredToken>,
}

impl DiscoveryEngine {
    pub fn new(sender: mpsc::Sender<DiscoveredToken>) -> Self {
        let http = reqwest::Client::new();

        let sources: Vec<Box<dyn sources::DiscoverySource + Send + Sync>> = vec![
            Box::new(sources::dexscreener::DexScreenerSource::new(http.clone())),
            Box::new(sources::birdeye::BirdeyeSource::new(http.clone())),
            Box::new(sources::pumpfun::PumpFunSource::new(http.clone())),
            Box::new(sources::raydium::RaydiumSource::new(http.clone())),
        ];

        Self {
            sources,
            seen_addresses: Arc::new(Mutex::new(HashSet::new())),
            sender,
        }
    }

    pub async fn start(&self) -> Result<(), AppError> {
        tracing::info!("Starting discovery engine with {} sources", self.sources.len());

        for source in &self.sources {
            let source_name = source.name().to_string();
            let interval = source.interval();
            let sender = self.sender.clone();
            let seen = self.seen_addresses.clone();

            tokio::spawn(async move {
                tracing::info!(source = %source_name, interval_secs = interval.as_secs(), "Discovery source started");
                loop {
                    tokio::time::sleep(interval).await;

                    let tokens = match source_name.as_str() {
                        "dexscreener" => sources::dexscreener::poll(&reqwest::Client::new()).await,
                        "birdeye" => sources::birdeye::poll(&reqwest::Client::new()).await,
                        "pumpfun" => sources::pumpfun::poll(&reqwest::Client::new()).await,
                        "raydium" => sources::raydium::poll(&reqwest::Client::new()).await,
                        _ => Ok(vec![]),
                    };

                    match tokens {
                        Ok(tokens) => {
                            let mut seen_lock = seen.lock().await;
                            for token in tokens {
                                if seen_lock.contains(&token.token_address) {
                                    continue;
                                }
                                seen_lock.insert(token.token_address.clone());
                                if let Err(e) = sender.send(token).await {
                                    tracing::error!("Failed to send discovered token: {}", e);
                                }
                            }
                        }
                        Err(e) => {
                            tracing::error!(source = %source_name, error = %e, "Discovery poll failed");
                        }
                    }
                }
            });
        }

        Ok(())
    }
}

pub async fn poll_source(name: &str, http: &reqwest::Client, _last_seen: &str) -> Result<Vec<DiscoveredToken>, AppError> {
    match name {
        "dexscreener" => sources::dexscreener::poll(http).await,
        "birdeye" => sources::birdeye::poll(http).await,
        "pumpfun" => sources::pumpfun::poll(http).await,
        "raydium" => sources::raydium::poll(http).await,
        _ => Ok(vec![]),
    }
}
