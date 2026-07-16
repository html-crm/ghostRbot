use ghostRbot_core::AppError;

pub struct MarketMaker {
    pub active: bool,
}

impl MarketMaker {
    pub fn new() -> Self {
        Self { active: false }
    }

    pub async fn start(&mut self) -> Result<(), AppError> {
        tracing::info!("Market maker started");
        self.active = true;
        Ok(())
    }

    pub async fn stop(&mut self) -> Result<(), AppError> {
        tracing::info!("Market maker stopped");
        self.active = false;
        Ok(())
    }
}
