use ghostRbot_core::AppError;
use reqwest::Client;

pub struct NewsEngine {
    http: Client,
}

impl NewsEngine {
    pub fn new(http: Client) -> Self {
        Self { http }
    }

    pub async fn get_latest(&self) -> Result<String, AppError> {
        let mut headlines = Vec::new();

        // CoinDesk RSS
        if let Ok(resp) = self.http.get("https://www.coindesk.com/arc/outboundfeeds/rss/").send().await {
            if let Ok(text) = resp.text().await {
                if let Ok(feed) = feed_rs::parser::parse(text.as_bytes()) {
                    for entry in feed.entries.iter().take(5) {
                        let title = entry.title.as_ref().map(|t| t.content.as_str()).unwrap_or("");
                        if !title.is_empty() {
                            headlines.push(title.to_string());
                        }
                    }
                }
            }
        }

        // CoinTelegraph RSS
        if let Ok(resp) = self.http.get("https://cointelegraph.com/rss").send().await {
            if let Ok(text) = resp.text().await {
                if let Ok(feed) = feed_rs::parser::parse(text.as_bytes()) {
                    for entry in feed.entries.iter().take(5) {
                        let title = entry.title.as_ref().map(|t| t.content.as_str()).unwrap_or("");
                        if !title.is_empty() && !headlines.contains(&title.to_string()) {
                            headlines.push(title.to_string());
                        }
                    }
                }
            }
        }

        // Decrypt RSS
        if let Ok(resp) = self.http.get("https://decrypt.co/feed").send().await {
            if let Ok(text) = resp.text().await {
                if let Ok(feed) = feed_rs::parser::parse(text.as_bytes()) {
                    for entry in feed.entries.iter().take(3) {
                        let title = entry.title.as_ref().map(|t| t.content.as_str()).unwrap_or("");
                        if !title.is_empty() && !headlines.contains(&title.to_string()) {
                            headlines.push(title.to_string());
                        }
                    }
                }
            }
        }

        if headlines.is_empty() {
            return Ok("No news available at the moment.".to_string());
        }

        let mut result = "📰 Latest Crypto News:\n\n".to_string();
        for (i, h) in headlines.iter().enumerate() {
            result.push_str(&format!("{}. {}\n", i + 1, h));
        }
        Ok(result)
    }
}
