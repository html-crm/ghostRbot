use axum::{extract::Request, middleware::Next, response::Response};
use std::time::Instant;
use tracing::info;

pub async fn logging_middleware(
    req: Request,
    next: Next,
) -> Response {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let start = Instant::now();

    let response = next.run(req).await;

    let duration = start.elapsed();
    info!(
        method = %method,
        path = %uri,
        status = response.status().as_u16(),
        duration_ms = duration.as_millis() as u64,
        "Request completed"
    );

    response
}
