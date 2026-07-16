use ghostRbot_core::AppError;
use reqwest::Client;

pub struct BriefingEngine {
    http: Client,
}

impl BriefingEngine {
    pub fn new(http: Client) -> Self {
        Self { http }
    }

    pub async fn generate(&self) -> Result<String, AppError> {
        let (market_data, sentiment_data) = tokio::try_join!(
            self.get_market_snapshot(),
            self.get_sentiment_snapshot(),
        )?;

        Ok(format!(
            "📋 Daily Briefing:\n\n\
            📊 Market:\n{}\n\n\
            🎭 Sentiment:\n{}\n\n\
            💡 Summary: Monitor BTC dominance and sentiment for directional bias.",
            market_data, sentiment_data,
        ))
    }

    async fn get_market_snapshot(&self) -> Result<String, AppError> {
        let resp = self.http.get("https://api.coingecko.com/api/v3/global")
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let data = &body["data"];
        let mcap = data["total_market_cap"]["usd"].as_f64().unwrap_or(0.0);
        let btc_dom = data["market_cap_percentage"]["btc"].as_f64().unwrap_or(0.0);
        let vol = data["total_volume"]["usd"].as_f64().unwrap_or(0.0);

        Ok(format!("Total MCap: ${:.2}T | BTC Dom: {:.1}% | 24h Vol: ${:.2}B", mcap / 1e12, btc_dom, vol / 1e9))
    }

    async fn get_sentiment_snapshot(&self) -> Result<String, AppError> {
        let resp = self.http.get("https://api.alternative.me/fng/?limit=1")
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        if let Some(entry) = body["data"][0].as_object() {
            let value = entry["value"].as_str().unwrap_or("50");
            let class = entry["value_classification"].as_str().unwrap_or("Neutral");
            Ok(format!("Fear & Greed: {}/100 ({})", value, class))
        } else {
            Ok("Sentiment: unavailable".to_string())
        }
    }
}
