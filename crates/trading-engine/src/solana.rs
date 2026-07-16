use super::{DexClient, PoolInfo, BuyParams, SellParams, AppError};
use async_trait::async_trait;
use reqwest::Client;

pub struct SolanaDexClient {
    rpc_url: String,
    http: Client,
}

impl SolanaDexClient {
    pub fn new(rpc_url: &str, http: Client) -> Self {
        Self { rpc_url: rpc_url.to_string(), http }
    }
}

#[async_trait]
impl DexClient for SolanaDexClient {
    async fn get_token_price(&self, pool_address: &str) -> Result<f64, AppError> {
        // Use Jupiter price API
        let url = format!("https://api.jup.ag/price/v2?ids={}", pool_address);
        let resp = self.http.get(&url).send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        body["data"][pool_address]["price"].as_f64()
            .ok_or_else(|| AppError::ExternalApi("Price not found".into()))
    }

    async fn get_pool_info(&self, pool_address: &str) -> Result<PoolInfo, AppError> {
        // Use Jupiter or on-chain data
        Ok(PoolInfo {
            address: pool_address.to_string(),
            token_a: String::new(),
            token_b: String::new(),
            liquidity_usd: 0.0,
            price: 0.0,
        })
    }

    async fn buy(&self, params: BuyParams) -> Result<String, AppError> {
        // Jupiter v6 quote
        let input_mint = &params.quote_mint;
        let output_mint = &params.token_address;
        let amount_lamports = (params.amount * 1_000_000_000.0) as u64;

        let quote_url = format!(
            "https://quote-api.jup.ag/v6/quote?inputMint={}&outputMint={}&amount={}&slippageBps={}",
            input_mint, output_mint, amount_lamports, (params.slippage * 100.0) as u32
        );

        let quote_resp = self.http.get(&quote_url).send().await
            .map_err(|e| AppError::ExternalApi(format!("Jupiter quote failed: {}", e)))?;
        let quote: serde_json::Value = quote_resp.json().await
            .map_err(|e| AppError::ExternalApi(format!("Jupiter quote parse: {}", e)))?;

        if quote.get("errorResult").is_some() {
            return Err(AppError::Trading(format!("Jupiter quote error: {}", quote)));
        }

        // Get swap transaction
        let swap_resp = self.http.post("https://quote-api.jup.ag/v6/swap")
            .json(&serde_json::json!({
                "quoteResponse": quote,
                "userPublicKey": "TODO_derive_from_private_key",
                "wrapAndUnwrapSol": true,
                "dynamicComputeUnitLimit": true,
                "prioritizationFeeLamports": (params.priority_fee * 1_000_000_000.0) as u64,
            }))
            .send().await
            .map_err(|e| AppError::ExternalApi(format!("Jupiter swap failed: {}", e)))?;

        let swap_body: serde_json::Value = swap_resp.json().await
            .map_err(|e| AppError::ExternalApi(format!("Jupiter swap parse: {}", e)))?;

        let swap_tx = swap_body["swapTransaction"].as_str()
            .ok_or_else(|| AppError::Trading("No swap transaction returned".into()))?;

        // TODO: Sign transaction with wallet key and send to Solana RPC
        tracing::info!("Jupiter swap transaction obtained, length={}", swap_tx.len());

        // For now, return a placeholder - signing requires solana-sdk
        Ok(format!("placeholder_{}", chrono::Utc::now().timestamp_millis()))
    }

    async fn sell(&self, params: SellParams) -> Result<String, AppError> {
        // Same as buy but reversed direction
        let input_mint = &params.token_address;
        let output_mint = &params.quote_mint;

        let url = format!(
            "https://quote-api.jup.ag/v6/quote?inputMint={}&outputMint={}&amount={}&slippageBps={}",
            input_mint, output_mint, params.amount as u64, (params.slippage * 100.0) as u32
        );

        let quote_resp = self.http.get(&url).send().await
            .map_err(|e| AppError::ExternalApi(format!("Jupiter quote failed: {}", e)))?;
        let _quote: serde_json::Value = quote_resp.json().await
            .map_err(|e| AppError::ExternalApi(format!("Jupiter quote parse: {}", e)))?;

        // TODO: Sign and send
        Ok(format!("sell_{}", chrono::Utc::now().timestamp_millis()))
    }
}
