use axum::response::Html;
use ghostRbot_core::AppError;

pub async fn serve_spa() -> Result<Html<String>, AppError> {
    // TODO: Serve static files from frontend/dist/
    Ok(Html("<!DOCTYPE html><html><head><title>ghostRbot</title></head><body><h1>ghostRbot - Crypto Trading Bot</h1><p>Frontend not yet built.</p></body></html>".into()))
}
