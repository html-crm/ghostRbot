use axum::{extract::Request, middleware::Next, response::Response};
use ghostRbot_core::Session;

pub async fn auth_middleware(
    mut req: Request,
    next: Next,
) -> Result<Response, axum::http::StatusCode> {
    let path = req.uri().path();

    // Skip auth for public routes
    if path.starts_with("/api/login")
        || path.starts_with("/api/register")
        || path.starts_with("/api/captcha")
        || path.starts_with("/api/forgot-password")
        || path.starts_with("/api/reset-password")
        || (!path.starts_with("/api/"))
    {
        return Ok(next.run(req).await);
    }

    let header = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    match header {
        Some(token) => {
            // TODO: Verify session from database
            // For now, accept any token for development
            let session = Session {
                token: token.to_string(),
                user_id: "admin".to_string(),
                role: "admin".to_string(),
                created_at: chrono::Utc::now(),
                expires_at: chrono::Utc::now() + chrono::Duration::hours(24),
            };
            req.extensions_mut().insert(session);
            Ok(next.run(req).await)
        }
        None => Err(axum::http::StatusCode::UNAUTHORIZED),
    }
}
