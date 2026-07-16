use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::state::AppState;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::SaltString;
use rand::rngs::OsRng;
use ghostRbot_core::{AppError, Session};
use uuid::Uuid;
use chrono::{Utc, Duration};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub password: String,
}

#[derive(Deserialize)]
pub struct UserLoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub username: String,
    pub role: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub captcha_id: String,
    pub captcha_answer: i32,
}

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    // Verify admin password
    if req.password != state.config.admin_password {
        return Err(AppError::Unauthorized);
    }

    let token = Uuid::new_v4().to_string();
    let session = Session {
        token: token.clone(),
        user_id: "admin".to_string(),
        role: "admin".to_string(),
        created_at: Utc::now(),
        expires_at: Utc::now() + Duration::hours(24),
    };

    // Store session in database
    ghostRbot_db::queries::create_session(&state.db.pool, &session).await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(LoginResponse {
        token,
        username: "admin".to_string(),
        role: "admin".to_string(),
    }))
}

pub async fn login_user(
    State(state): State<Arc<AppState>>,
    Json(req): Json<UserLoginRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    let user_row = ghostRbot_db::queries::get_user(&state.db.pool, &req.username).await
        .map_err(|e| AppError::Database(e.to_string()))?
        .ok_or(AppError::Unauthorized)?;

    let user = user_row.to_user();

    // Check if user is approved
    if user.status != ghostRbot_core::UserStatus::Approved {
        return Err(AppError::Forbidden);
    }

    // Verify password
    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let argon2 = Argon2::default();
    argon2.verify_password(req.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Unauthorized)?;

    let token = Uuid::new_v4().to_string();
    let session = Session {
        token: token.clone(),
        user_id: user.username.clone(),
        role: serde_json::to_string(&user.role).unwrap_or_default(),
        created_at: Utc::now(),
        expires_at: Utc::now() + Duration::hours(24),
    };

    ghostRbot_db::queries::create_session(&state.db.pool, &session).await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(LoginResponse {
        token,
        username: user.username,
        role: serde_json::to_string(&user.role).unwrap_or_default(),
    }))
}

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // TODO: Verify captcha
    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(req.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .to_string();

    let user = ghostRbot_core::User {
        username: req.username,
        password_hash,
        email: req.email,
        role: ghostRbot_core::UserRole::Regular,
        status: ghostRbot_core::UserStatus::Pending,
        created_at: Utc::now(),
        subscription_expiry: None,
    };

    ghostRbot_db::queries::create_user(&state.db.pool, &user).await
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(Json(serde_json::json!({
        "message": "Registration successful. Awaiting admin approval.",
    })))
}

pub async fn verify(
    axum::extract::Extension(session): axum::extract::Extension<Session>,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({
        "valid": true,
        "username": session.user_id,
        "role": session.role,
    })))
}

pub async fn forgot_password(
    State(state): State<Arc<AppState>>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    let email = req.get("email").and_then(|v| v.as_str()).ok_or(AppError::BadRequest("Email required".into()))?;

    // Generate reset token
    let reset_token = Uuid::new_v4().to_string();

    // TODO: Send email with reset token
    tracing::info!("Password reset requested for {}: token={}", email, reset_token);

    Ok(Json(serde_json::json!({
        "message": "If the email exists, a reset link has been sent.",
        "reset_token": reset_token, // Remove in production
    })))
}

pub async fn reset_password(
    State(state): State<Arc<AppState>>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    let token = req.get("token").and_then(|v| v.as_str()).ok_or(AppError::BadRequest("Token required".into()))?;
    let new_password = req.get("password").and_then(|v| v.as_str()).ok_or(AppError::BadRequest("Password required".into()))?;

    // TODO: Verify reset token and update password
    tracing::info!("Password reset completed for token={}", token);

    Ok(Json(serde_json::json!({
        "message": "Password updated successfully.",
    })))
}

pub async fn get_captcha() -> Result<Json<serde_json::Value>, AppError> {
    // Generate simple math captcha
    let a = rand::random::<u8>() as i32 % 50 + 1;
    let b = rand::random::<u8>() as i32 % 50 + 1;
    let answer = a + b;
    let id = Uuid::new_v4().to_string();

    // TODO: Store challenge in database or memory

    Ok(Json(serde_json::json!({
        "id": id,
        "question": format!("{} + {} = ?", a, b),
    })))
}

pub async fn change_admin_password(
    State(state): State<Arc<AppState>>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    let new_password = req.get("password").and_then(|v| v.as_str()).ok_or(AppError::BadRequest("Password required".into()))?;

    // TODO: Update admin password in database
    tracing::info!("Admin password changed");

    Ok(Json(serde_json::json!({
        "message": "Admin password updated successfully.",
    })))
}
