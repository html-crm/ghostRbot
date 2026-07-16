use ghostRbot_core::AppError;

pub struct VolumeBot {
    pub active: bool,
}

impl VolumeBot {
    pub fn new() -> Self {
        Self { active: false }
    }

    pub async fn start(&mut self) -> Result<(), AppError> {
        // TODO: Start volume bot
        tracing::info!("Volume bot started");
        self.active = true;
        Ok(())
    }

    pub async fn stop(&mut self) -> Result<(), AppError> {
        // TODO: Stop volume bot
        tracing::info!("Volume bot stopped");
        self.active = false;
        Ok(())
    }
}
