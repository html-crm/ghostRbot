use ghostRbot_core::AppError;
use reqwest::Client;

pub struct RiskIntelEngine {
    http: Client,
}

impl RiskIntelEngine {
    pub fn new(http: Client) -> Self {
        Self { http }
    }

    pub async fn get_token_risk(&self, token_address: &str) -> Result<String, AppError> {
        let resp = self.http.get(format!("https://api.rugcheck.xyz/v1/tokens/{}/report", token_address))
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let mut result = format!("🔍 Risk Report for {}:\n\n", token_address);

        if let Some(risks) = body["risks"].as_array() {
            for risk in risks {
                let name = risk["name"].as_str().unwrap_or("Unknown");
                let level = risk["level"].as_str().unwrap_or("info");
                let description = risk["description"].as_str().unwrap_or("");
                let emoji = match level {
                    "danger" => "🔴",
                    "warn" => "🟡",
                    _ => "🟢",
                };
                result.push_str(&format!("{} {}: {}\n", emoji, name, description));
            }
        }

        let score = body["score"].as_i64().unwrap_or(0);
        result.push_str(&format!("\nOverall Score: {}/1000", score));

        Ok(result)
    }
}
