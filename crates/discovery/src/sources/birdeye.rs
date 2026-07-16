use super::DiscoverySource;
use ghostRbot_core::{AppError, DiscoveredToken, Chain};
use reqwest::Client;
use std::time::Duration;
use chrono::Utc;

pub struct BirdeyeSource {
    http: Client,
    api_key: String,
}

impl BirdeyeSource {
    pub fn new(http: Client) -> Self {
        let api_key = std::env::var("BIRDEYE_API_KEY").unwrap_or_default();
        Self { http, api_key }
    }
}

impl DiscoverySource for BirdeyeSource {
    fn name(&self) -> &str { "birdeye" }
    fn interval(&self) -> Duration { Duration::from_secs(60) }
}

pub async fn poll(http: &Client) -> Result<Vec<DiscoveredToken>, AppError> {
    let api_key = std::env::var("BIRDEYE_API_KEY").unwrap_or_default();

    let resp = http.get("https://public-api.birdeye.so/public/tokenlist?sort_by=v24hUSD&sort_type=desc&offset=0&limit=20&chain=solana")
        .header("X-API-KEY", &api_key)
        .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

    let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

    let mut tokens = Vec::new();

    if let Some(data) = body["data"]["tokens"].as_array() {
        for item in data {
            let token_address = item["address"].as_str().unwrap_or("");
            if token_address.is_empty() { continue; }

            tokens.push(DiscoveredToken {
                source: "birdeye".to_string(),
                chain: Chain::Solana,
                token_address: token_address.to_string(),
                token_symbol: item["symbol"].as_str().unwrap_or("???").to_string(),
                token_name: item["name"].as_str().unwrap_or("Unknown").to_string(),
                pool_address: item["liquidityAddress"].as_str().unwrap_or("").to_string(),
                liquidity_usd: item["liquidity"].as_f64().unwrap_or(0.0),
                price_usd: item["price"].as_f64().unwrap_or(0.0),
                volume_24h: item["v24hUSD"].as_f64().unwrap_or(0.0),
                fdv: item["fdv"].as_f64().unwrap_or(0.0),
                created_at: Utc::now(),
            });
        }
    }

    tracing::debug!("Birdeye: found {} tokens", tokens.len());
    Ok(tokens)
}
