use super::DiscoverySource;
use ghostRbot_core::{AppError, DiscoveredToken, Chain};
use reqwest::Client;
use std::time::Duration;
use chrono::Utc;

pub struct DexScreenerSource {
    http: Client,
}

impl DexScreenerSource {
    pub fn new(http: Client) -> Self {
        Self { http }
    }
}

impl DiscoverySource for DexScreenerSource {
    fn name(&self) -> &str { "dexscreener" }
    fn interval(&self) -> Duration { Duration::from_secs(30) }
}

pub async fn poll(http: &Client) -> Result<Vec<DiscoveredToken>, AppError> {
    let resp = http.get("https://api.dexscreener.com/token-profiles/latest/v1")
        .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

    let body: Vec<serde_json::Value> = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

    let mut tokens = Vec::new();

    for item in &body {
        let chain_id = item["chainId"].as_str().unwrap_or("");
        let token_address = item["tokenAddress"].as_str().unwrap_or("");

        if token_address.is_empty() { continue; }

        let chain = match chain_id {
            "solana" => Chain::Solana,
            "bsc" | "bnb" => Chain::Bsc,
            "ethereum" | "arbitrum" => Chain::Ethereum,
            _ => continue,
        };

        // Try to get price data
        let price_usd = item["tokenPrice"].as_str()
            .and_then(|p| p.parse::<f64>().ok())
            .unwrap_or(0.0);

        tokens.push(DiscoveredToken {
            source: "dexscreener".to_string(),
            chain,
            token_address: token_address.to_string(),
            token_symbol: item["tokenSymbol"].as_str().unwrap_or("???").to_string(),
            token_name: item["tokenName"].as_str().unwrap_or("Unknown").to_string(),
            pool_address: String::new(),
            liquidity_usd: 0.0,
            price_usd,
            volume_24h: 0.0,
            fdv: 0.0,
            created_at: Utc::now(),
        });
    }

    tracing::debug!("DexScreener: found {} tokens", tokens.len());
    Ok(tokens)
}
