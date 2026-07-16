use super::DiscoverySource;
use ghostRbot_core::{AppError, DiscoveredToken, Chain};
use reqwest::Client;
use std::time::Duration;
use chrono::Utc;

pub struct RaydiumSource {
    http: Client,
}

impl RaydiumSource {
    pub fn new(http: Client) -> Self {
        Self { http }
    }
}

impl DiscoverySource for RaydiumSource {
    fn name(&self) -> &str { "raydium" }
    fn interval(&self) -> Duration { Duration::from_secs(30) }
}

pub async fn poll(http: &Client) -> Result<Vec<DiscoveredToken>, AppError> {
    // Raydium new pools via their API
    let resp = http.get("https://api-v3.raydium.io/pools/info/latest?limit=20&sort_by=createdTime&sort_type=desc&pool_type=all")
        .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

    let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

    let mut tokens = Vec::new();

    if let Some(data) = body["data"]["data"].as_array() {
        for item in data {
            let pool_address = item["id"].as_str().unwrap_or("");
            if pool_address.is_empty() { continue; }

            let base_symbol = item["base"]["symbol"].as_str().unwrap_or("???").to_string();
            let base_address = item["base"]["mint"].as_str().unwrap_or("").to_string();
            let quote_symbol = item["quote"]["symbol"].as_str().unwrap_or("???").to_string();

            if quote_symbol != "SOL" && quote_symbol != "USDC" { continue; }

            tokens.push(DiscoveredToken {
                source: "raydium".to_string(),
                chain: Chain::Solana,
                token_address: base_address,
                token_symbol: base_symbol,
                token_name: item["base"]["name"].as_str().unwrap_or("Unknown").to_string(),
                pool_address: pool_address.to_string(),
                liquidity_usd: item["tvl"].as_f64().unwrap_or(0.0),
                price_usd: 0.0,
                volume_24h: item["day"]["volume"].as_f64().unwrap_or(0.0),
                fdv: item["marketCap"].as_f64().unwrap_or(0.0),
                created_at: Utc::now(),
            });
        }
    }

    tracing::debug!("Raydium: found {} tokens", tokens.len());
    Ok(tokens)
}
