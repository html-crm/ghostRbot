use ghostRbot_core::AppError;
use reqwest::Client;

pub struct SentimentEngine {
    http: Client,
}

impl SentimentEngine {
    pub fn new(http: Client) -> Self {
        Self { http }
    }

    pub async fn get_sentiment(&self) -> Result<String, AppError> {
        let resp = self.http.get("https://api.alternative.me/fng/?limit=7")
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let mut result = "📊 Fear & Greed Index:\n\n".to_string();

        if let Some(data) = body["data"].as_array() {
            for entry in data.iter().take(7) {
                let value = entry["value"].as_str().unwrap_or("0").parse::<i32>().unwrap_or(0);
                let classification = entry["value_classification"].as_str().unwrap_or("Unknown");
                let timestamp = entry["timestamp"].as_str().unwrap_or("0").parse::<i64>().unwrap_or(0);
                let date = chrono::DateTime::from_timestamp(timestamp, 0)
                    .map(|dt| dt.format("%Y-%m-%d").to_string())
                    .unwrap_or_default();

                let emoji = match value {
                    0..=24 => "😱",
                    25..=49 => "😨",
                    50..=74 => "😐",
                    _ => "🤑",
                };

                result.push_str(&format!("{} {} - {}/100 ({})\n", emoji, date, value, classification));
            }
        }

        Ok(result)
    }
}
