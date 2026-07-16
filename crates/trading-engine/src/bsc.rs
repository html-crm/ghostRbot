use super::{DexClient, PoolInfo, BuyParams, SellParams, AppError};
use async_trait::async_trait;
use reqwest::Client;

pub struct BscDexClient {
    rpc_url: String,
    http: Client,
}

impl BscDexClient {
    pub fn new(rpc_url: &str, http: Client) -> Self {
        Self { rpc_url: rpc_url.to_string(), http }
    }

    async fn rpc_call(&self, method: &str, params: serde_json::Value) -> Result<serde_json::Value, AppError> {
        let body = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        });

        let resp = self.http.post(&self.rpc_url)
            .json(&body)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))
    }
}

#[async_trait]
impl DexClient for BscDexClient {
    async fn get_token_price(&self, pool_address: &str) -> Result<f64, AppError> {
        // Use PancakeSwap or DeFi Llama
        let url = format!("https://api.dexscreener.com/latest/dex/tokens/{}", pool_address);
        let resp = self.http.get(&url).send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        body["pairs"][0]["priceUsd"].as_str()
            .and_then(|p| p.parse::<f64>().ok())
            .ok_or_else(|| AppError::ExternalApi("Price not found".into()))
    }

    async fn get_pool_info(&self, pool_address: &str) -> Result<PoolInfo, AppError> {
        Ok(PoolInfo {
            address: pool_address.to_string(),
            token_a: String::new(),
            token_b: String::new(),
            liquidity_usd: 0.0,
            price: 0.0,
        })
    }

    async fn buy(&self, params: BuyParams) -> Result<String, AppError> {
        // PancakeSwap Router V2
        // swapExactETHForTokensSupportingFeeOnTransferTokens
        tracing::info!(
            token = %params.token_address,
            amount = params.amount,
            "BSC buy via PancakeSwap"
        );

        // TODO: Build and sign BSC transaction using ethers-rs or alloy
        // 1. Build swap calldata
        // 2. Sign with private key
        // 3. Send via eth_sendRawTransaction

        Ok(format!("bsc_buy_{}", chrono::Utc::now().timestamp_millis()))
    }

    async fn sell(&self, params: SellParams) -> Result<String, AppError> {
        tracing::info!(
            token = %params.token_address,
            amount = params.amount,
            "BSC sell via PancakeSwap"
        );

        // TODO: Build and sign BSC transaction
        Ok(format!("bsc_sell_{}", chrono::Utc::now().timestamp_millis()))
    }
}
