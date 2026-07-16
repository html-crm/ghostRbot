use super::DiscoverySource;
use ghostRbot_core::{AppError, DiscoveredToken, Chain};
use reqwest::Client;
use std::time::Duration;
use chrono::Utc;

pub struct PumpFunSource {
    http: Client,
}

impl PumpFunSource {
    pub fn new(http: Client) -> Self {
        Self { http }
    }
}

impl DiscoverySource for PumpFunSource {
    fn name(&self) -> &str { "pumpfun" }
    fn interval(&self) -> Duration { Duration::from_secs(10) }
}

pub async fn poll(http: &Client) -> Result<Vec<DiscoveredToken>, AppError> {
    let resp = http.get("https://pumpportal.fun/api/data/tokens?limit=20&sort=created_timestamp&order=DESC")
        .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

    let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

    let mut tokens = Vec::new();

    if let Some(data) = body.as_array() {
        for item in data {
            let mint = item["mint"].as_str().unwrap_or("");
            if mint.is_empty() { continue; }

            tokens.push(DiscoveredToken {
                source: "pumpfun".to_string(),
                chain: Chain::Solana,
                token_address: mint.to_string(),
                token_symbol: item["symbol"].as_str().unwrap_or("???").to_string(),
                token_name: item["name"].as_str().unwrap_or("Unknown").to_string(),
                pool_address: item["bondingCurveKey"].as_str().unwrap_or("").to_string(),
                liquidity_usd: item["usdMarketCap"].as_f64().unwrap_or(0.0),
                price_usd: 0.0,
                volume_24h: 0.0,
                fdv: item["usdMarketCap"].as_f64().unwrap_or(0.0),
                created_at: Utc::now(),
            });
        }
    }

    tracing::debug!("PumpFun: found {} tokens", tokens.len());
    Ok(tokens)
}
