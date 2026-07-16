use ghostRbot_core::AppError;
use reqwest::Client;

pub struct TelegramBot {
    bot_token: String,
    http: Client,
    base_url: String,
}

impl TelegramBot {
    pub fn new(bot_token: &str) -> Self {
        Self {
            bot_token: bot_token.to_string(),
            http: Client::new(),
            base_url: format!("https://api.telegram.org/bot{}", bot_token),
        }
    }

    pub async fn start_polling(&self, intelligence: &ghostRbot_intelligence::IntelligenceEngine) -> Result<(), AppError> {
        let mut offset = 0i64;

        tracing::info!("Telegram bot polling started");

        loop {
            match self.poll_updates(&mut offset, intelligence).await {
                Ok(_) => {}
                Err(e) => {
                    tracing::error!("Telegram poll error: {}", e);
                    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                }
            }

            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        }
    }

    async fn poll_updates(&self, offset: &mut i64, intelligence: &ghostRbot_intelligence::IntelligenceEngine) -> Result<(), AppError> {
        let url = format!("{}/getUpdates?offset={}&timeout=30", self.base_url, offset);

        let resp = self.http.get(&url).send().await
            .map_err(|e| AppError::ExternalApi(format!("Telegram getUpdates failed: {}", e)))?;

        let body: serde_json::Value = resp.json().await
            .map_err(|e| AppError::ExternalApi(format!("Telegram parse failed: {}", e)))?;

        if let Some(updates) = body["result"].as_array() {
            for update in updates {
                if let Some(message) = update["message"].as_object() {
                    let chat_id = message["chat"]["id"].as_i64().unwrap_or(0);
                    let text = message["text"].as_str().unwrap_or("");

                    if text.starts_with('/') {
                        let response = self.handle_command(text, intelligence).await;
                        self.send_message(chat_id, &response).await.ok();
                    }
                }

                *offset = update["update_id"].as_i64().unwrap_or(0) + 1;
            }
        }

        Ok(())
    }

    async fn handle_command(&self, text: &str, intelligence: &ghostRbot_intelligence::IntelligenceEngine) -> String {
        let parts: Vec<&str> = text.splitn(2, ' ').collect();
        let cmd = parts[0].to_lowercase();
        let _args = parts.get(1).unwrap_or(&"");

        match cmd.as_str() {
            "/start" => "🤖 ghostRbot\n\nYour crypto trading assistant.\n\nCommands:\n/market - Market overview\n/news - Latest news\n/sentiment - Fear & Greed\n/whales - Trending tokens\n/briefing - Daily briefing\n/help - Command list".to_string(),
            "/help" => "Commands: /market /news /sentiment /whales /briefing /price {coin}".to_string(),
            "/market" | "/m" => intelligence.process("market overview").await.unwrap_or_else(|_| "Error fetching market data".to_string()),
            "/news" | "/n" => intelligence.process("latest crypto news").await.unwrap_or_else(|_| "Error fetching news".to_string()),
            "/sentiment" | "/s" => intelligence.process("fear greed index").await.unwrap_or_else(|_| "Error fetching sentiment".to_string()),
            "/whales" | "/w" => intelligence.process("whale tracking trending").await.unwrap_or_else(|_| "Error fetching whale data".to_string()),
            "/briefing" | "/b" => intelligence.process("daily briefing summary").await.unwrap_or_else(|_| "Error generating briefing".to_string()),
            "/price" | "/p" => intelligence.process(&format!("price {}", _args)).await.unwrap_or_else(|_| "Error fetching price".to_string()),
            _ => format!("Unknown command: {}. Use /help for available commands.", cmd),
        }
    }

    pub async fn send_message(&self, chat_id: i64, text: &str) -> Result<(), AppError> {
        let url = format!("{}/sendMessage", self.base_url);

        // Split long messages (Telegram limit is 4096 chars)
        let chunks: Vec<&str> = text.split_inclusive('\n').collect();
        let mut current = String::new();

        for chunk in &chunks {
            if current.len() + chunk.len() > 4000 {
                if !current.is_empty() {
                    self.send_single(chat_id, &current).await?;
                }
                current = chunk.to_string();
            } else {
                current.push_str(chunk);
            }
        }

        if !current.is_empty() {
            self.send_single(chat_id, &current).await?;
        }

        Ok(())
    }

    async fn send_single(&self, chat_id: i64, text: &str) -> Result<(), AppError> {
        let body = serde_json::json!({
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown",
        });

        self.http.post(format!("{}/sendMessage", self.base_url))
            .json(&body)
            .send().await.map_err(|e| AppError::ExternalApi(format!("Telegram send failed: {}", e)))?;

        Ok(())
    }
}
