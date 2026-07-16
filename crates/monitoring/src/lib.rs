use ghostRbot_core::AppError;

pub struct PortfolioMonitor {
    pub active: bool,
}

impl PortfolioMonitor {
    pub fn new() -> Self {
        Self { active: false }
    }

    pub async fn start(&mut self) -> Result<(), AppError> {
        tracing::info!("Portfolio monitor started");
        self.active = true;
        Ok(())
    }

    pub async fn stop(&mut self) -> Result<(), AppError> {
        tracing::info!("Portfolio monitor stopped");
        self.active = false;
        Ok(())
    }
}
