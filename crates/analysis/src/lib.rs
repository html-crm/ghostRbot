use ghostRbot_core::{AnalysisResult, AppError, DiscoveredToken, RugRisk, LiquidityInfo};
use reqwest::Client;
use std::time::Duration;

pub mod contract_analyzer;
pub mod social_analyzer;
pub mod wallet_analyzer;
pub mod scorer;

pub struct AnalysisPipeline {
    http: Client,
    helius_api_key: String,
    birdeye_api_key: String,
}

impl AnalysisPipeline {
    pub fn new() -> Self {
        Self {
            http: Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .unwrap(),
            helius_api_key: std::env::var("HELIUS_API_KEY").unwrap_or_default(),
            birdeye_api_key: std::env::var("BIRDEYE_API_KEY").unwrap_or_default(),
        }
    }

    pub async fn analyze(&self, token: &DiscoveredToken) -> Result<AnalysisResult, AppError> {
        tracing::info!(token = %token.token_address, "Starting analysis");

        let (contract_data, social_data, wallet_data) = tokio::try_join!(
            contract_analyzer::analyze(&self.http, &self.helius_api_key, token),
            social_analyzer::analyze(&self.http, token),
            wallet_analyzer::analyze(&self.http, &self.birdeye_api_key, token),
        )?;

        let result = scorer::score(&contract_data, &social_data, &wallet_data);

        tracing::info!(token = %token.token_address, score = result.score, risk = ?result.rug_risk, "Analysis complete");

        Ok(result)
    }
}
