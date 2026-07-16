use ghostRbot_core::AppError;

pub struct LimitOrderEngine {
    pub active: bool,
}

impl LimitOrderEngine {
    pub fn new() -> Self {
        Self { active: false }
    }

    pub async fn start(&mut self) -> Result<(), AppError> {
        tracing::info!("Limit order engine started");
        self.active = true;
        Ok(())
    }

    pub async fn stop(&mut self) -> Result<(), AppError> {
        tracing::info!("Limit order engine stopped");
        self.active = false;
        Ok(())
    }
}
