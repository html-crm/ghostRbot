use ghostRbot_core::AppError;

pub struct TelegramBot {
    pub active: bool,
    pub bot_token: String,
}

impl TelegramBot {
    pub fn new(bot_token: &str) -> Self {
        Self {
            active: false,
            bot_token: bot_token.to_string(),
        }
    }

    pub async fn start(&mut self) -> Result<(), AppError> {
        tracing::info!("Telegram bot started");
        self.active = true;
        Ok(())
    }

    pub async fn send_message(&self, chat_id: i64, text: &str) -> Result<(), AppError> {
        // TODO: Send message via Telegram API
        tracing::info!("Telegram message to {}: {}", chat_id, text);
        Ok(())
    }
}
