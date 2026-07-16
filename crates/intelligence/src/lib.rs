use ghostRbot_core::AppError;
use std::sync::Arc;

pub mod news;
pub mod market;
pub mod whale;
pub mod smart_money;
pub mod narrative;
pub mod sentiment;
pub mod risk_intel;
pub mod briefings;
pub mod router;

pub struct IntelligenceEngine {
    pub news: news::NewsEngine,
    pub market: market::MarketEngine,
    pub whale: whale::WhaleTracker,
    pub sentiment: sentiment::SentimentEngine,
    pub briefings: briefings::BriefingEngine,
    pub router: router::IntentRouter,
}

impl IntelligenceEngine {
    pub fn new(http: reqwest::Client) -> Self {
        Self {
            news: news::NewsEngine::new(http.clone()),
            market: market::MarketEngine::new(http.clone()),
            whale: whale::WhaleTracker::new(http.clone()),
            sentiment: sentiment::SentimentEngine::new(http.clone()),
            briefings: briefings::BriefingEngine::new(http.clone()),
            router: router::IntentRouter::new(),
        }
    }

    pub async fn process(&self, query: &str) -> Result<String, AppError> {
        let intent = self.router.classify(query);
        tracing::info!(query = %query, intent = ?intent, "Processing intelligence query");

        match intent {
            router::Intent::News => self.news.get_latest().await,
            router::Intent::Market => self.market.get_overview().await,
            router::Intent::Whales => self.whale.get_recent().await,
            router::Intent::Sentiment => self.sentiment.get_sentiment().await,
            router::Intent::Briefing => self.briefings.generate().await,
            router::Intent::Price => self.market.get_price(query).await,
            router::Intent::Unknown => Ok("I can help with market data, news, whale tracking, sentiment, and briefings. Try asking about any of these topics.".to_string()),
        }
    }
}
