use ghostRbot_core::AppError;
use reqwest::Client;

pub struct NotificationManager {
    bot_token: String,
    chat_id: i64,
    http: Client,
}

impl NotificationManager {
    pub fn new() -> Self {
        let bot_token = std::env::var("TELEGRAM_BOT_TOKEN").unwrap_or_default();
        let chat_id = std::env::var("TELEGRAM_CHAT_ID")
            .ok()
            .and_then(|v| v.parse::<i64>().ok())
            .unwrap_or(0);

        Self {
            bot_token,
            chat_id,
            http: Client::new(),
        }
    }

    pub async fn send_alert(&self, title: &str, message: &str) -> Result<(), AppError> {
        if self.bot_token.is_empty() || self.chat_id == 0 {
            tracing::debug!("Telegram not configured, skipping notification: {}", title);
            return Ok(());
        }

        let text = format!("*{}*\n\n{}", escape_markdown(title), escape_markdown(message));

        let url = format!("https://api.telegram.org/bot{}/sendMessage", self.bot_token);
        let body = serde_json::json!({
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "Markdown",
        });

        match self.http.post(&url).json(&body).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    tracing::debug!("Telegram notification sent: {}", title);
                } else {
                    let status = resp.status();
                    let body_text = resp.text().await.unwrap_or_default();
                    tracing::warn!("Telegram send failed ({}): {}", status, body_text);
                }
            }
            Err(e) => {
                tracing::error!("Telegram request failed: {}", e);
            }
        }

        Ok(())
    }

    pub async fn send_trade_alert(&self, action: &str, token: &str, amount: f64, price: f64, tx: &str) -> Result<(), AppError> {
        let msg = format!(
            "🔔 Trade Executed\n\
            Action: {}\n\
            Token: {}\n\
            Amount: {:.6}\n\
            Price: ${:.8}\n\
            Tx: `{}`",
            action, token, amount, price, tx
        );
        self.send_alert("Trading Alert", &msg).await
    }

    pub async fn send_rug_alert(&self, token: &str, details: &str) -> Result<(), AppError> {
        let msg = format!(
            "🚨 RUG DETECTED\n\
            Token: {}\n\
            Details: {}",
            token, details
        );
        self.send_alert("Rug Alert", &msg).await
    }

    pub async fn send_discovery_alert(&self, token: &str, score: f64, chain: &str) -> Result<(), AppError> {
        let msg = format!(
            "🔍 New Token Discovered\n\
            Token: {}\n\
            Score: {:.1}/100\n\
            Chain: {}",
            token, score, chain
        );
        self.send_alert("Token Discovery", &msg).await
    }
}

fn escape_markdown(text: &str) -> String {
    text.replace('_', "\\_")
        .replace('*', "\\*")
        .replace('[', "\\[")
        .replace(']', "\\]")
        .replace('(', "\\(")
        .replace(')', "\\)")
        .replace('~', "\\~")
        .replace('`', "\\`")
        .replace('>', "\\>")
        .replace('#', "\\#")
        .replace('+', "\\+")
        .replace('-', "\\-")
        .replace('=', "\\=")
        .replace('|', "\\|")
        .replace('{', "\\{")
        .replace('}', "\\}")
        .replace('.', "\\.")
        .replace('!', "\\!")
}
