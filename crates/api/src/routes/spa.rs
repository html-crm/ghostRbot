use axum::body::Body;
use axum::http::{Request, Response, StatusCode};
use axum::response::IntoResponse;
use std::path::PathBuf;
use tokio::fs;

pub async fn serve_spa(req: Request<Body>) -> impl IntoResponse {
    let path = req.uri().path().trim_start_matches('/');

    let dist_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../frontend/dist");

    let file_path = if path.is_empty() || path == "index.html" {
        dist_dir.join("index.html")
    } else {
        let candidate = dist_dir.join(path);
        if candidate.is_file() {
            candidate
        } else {
            dist_dir.join("index.html")
        }
    };

    match fs::read(&file_path).await {
        Ok(contents) => {
            let mime = mime_guess::from_path(&file_path)
                .first_or_octet_stream()
                .to_string();

            Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", mime.as_str())
                .body(Body::from(contents))
                .unwrap()
        }
        Err(_) => {
            let fallback = dist_dir.join("index.html");
            match fs::read(&fallback).await {
                Ok(contents) => Response::builder()
                    .status(StatusCode::OK)
                    .header("Content-Type", "text/html")
                    .body(Body::from(contents))
                    .unwrap(),
                Err(_) => Response::builder()
                    .status(StatusCode::NOT_FOUND)
                    .body(Body::from("Not Found"))
                    .unwrap(),
            }
        }
    }
}
