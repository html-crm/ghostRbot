pub mod sources;

use ghostRbot_core::{AppError, DiscoveredToken, Chain};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::time::Duration;

pub struct DiscoveryEngine {
    sources: Vec<Box<dyn sources::DiscoverySource>>,
    seen_addresses: Arc<tokio::sync::Mutex<HashSet<String>>>,
    sender: mpsc::Sender<DiscoveredToken>,
}

impl DiscoveryEngine {
    pub fn new(sender: mpsc::Sender<DiscoveredToken>) -> Self {
        let http = reqwest::Client::new();

        let sources: Vec<Box<dyn sources::DiscoverySource>> = vec![
            Box::new(sources::dexscreener::DexScreenerSource::new(http.clone())),
            Box::new(sources::birdeye::BirdeyeSource::new(http.clone())),
            Box::new(sources::pumpfun::PumpFunSource::new(http.clone())),
            Box::new(sources::raydium::RaydiumSource::new(http.clone())),
        ];

        Self {
            sources,
            seen_addresses: Arc::new(tokio::sync::Mutex::new(HashSet::new())),
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
            let http = reqwest::Client::new();

            tokio::spawn(async move {
                tracing::info!(source = %source_name, interval_secs = interval.as_secs(), "Discovery source started");
                loop {
                    tokio::time::sleep(interval).await;

                    // TODO: Fetch last_seen from DB
                    let last_seen = String::new();

                    // This is a simplification - in reality we'd need to box the source
                    // For now, poll via HTTP directly
                    match poll_source(&source_name, &http, &last_seen).await {
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

async fn poll_source(name: &str, http: &reqwest::Client, _last_seen: &str) -> Result<Vec<DiscoveredToken>, AppError> {
    match name {
        "dexscreener" => sources::dexscreener::poll(http).await,
        "birdeye" => sources::birdeye::poll(http).await,
        "pumpfun" => sources::pumpfun::poll(http).await,
        "raydium" => sources::raydium::poll(http).await,
        _ => Ok(vec![]),
    }
}
