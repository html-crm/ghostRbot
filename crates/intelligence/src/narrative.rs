use ghostRbot_core::AppError;
use reqwest::Client;

pub struct NarrativeDetector {
    http: Client,
}

impl NarrativeDetector {
    pub fn new(http: Client) -> Self {
        Self { http }
    }

    pub async fn detect_trending(&self) -> Result<String, AppError> {
        let resp = self.http.get("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=10")
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: Vec<serde_json::Value> = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let mut result = "🔥 Trending Narratives:\n\n".to_string();
        for coin in body.iter().take(5) {
            let name = coin["name"].as_str().unwrap_or("???");
            let change = coin["price_change_percentage_24h"].as_f64().unwrap_or(0.0);
            result.push_str(&format!("• {} ({:+.1}%)\n", name, change));
        }
        Ok(result)
    }
}
