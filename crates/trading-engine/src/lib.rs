use ghostRbot_core::AppError;

pub struct TradingEngine {
    pub max_concurrent: usize,
}

impl TradingEngine {
    pub fn new() -> Self {
        Self {
            max_concurrent: 5,
        }
    }

    pub async fn start(&self) -> Result<(), AppError> {
        // TODO: Start trading engine
        tracing::info!("Trading engine started");
        Ok(())
    }
}
