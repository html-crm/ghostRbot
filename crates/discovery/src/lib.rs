pub mod sources;

use ghostRbot_core::{AppError, DiscoveredToken};

pub struct DiscoveryEngine {
    pub active: bool,
}

impl DiscoveryEngine {
    pub fn new() -> Self {
        Self { active: false }
    }

    pub async fn start(&mut self) -> Result<(), AppError> {
        tracing::info!("Discovery engine started");
        self.active = true;
        Ok(())
    }

    pub async fn stop(&mut self) -> Result<(), AppError> {
        tracing::info!("Discovery engine stopped");
        self.active = false;
        Ok(())
    }
}
