use ghostRbot_core::AppError;
use reqwest::Client;

pub struct SmartMoneyTracker {
    http: Client,
    birdeye_key: String,
}

impl SmartMoneyTracker {
    pub fn new(http: Client) -> Self {
        Self {
            http,
            birdeye_key: std::env::var("BIRDEYE_API_KEY").unwrap_or_default(),
        }
    }

    pub async fn get_smart_money_buys(&self) -> Result<String, AppError> {
        let resp = self.http.get("https://public-api.birdeye.so/public/token_trending?sort_by=volume24hUSD&sort_type=desc&offset=0&limit=5&chain=solana")
            .header("X-API-KEY", &self.birdeye_key)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let mut result = "💰 Smart Money Activity:\n\n".to_string();
        if let Some(tokens) = body["data"]["tokens"].as_array() {
            for (i, t) in tokens.iter().enumerate() {
                let symbol = t["symbol"].as_str().unwrap_or("???");
                let volume = t["v24hUSD"].as_f64().unwrap_or(0.0);
                result.push_str(&format!("{}. {} (Vol: ${:.0})\n", i + 1, symbol, volume));
            }
        }
        Ok(result)
    }
}
