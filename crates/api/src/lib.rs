use axum::{routing::{get, post, put, delete}, Router};
use ghostRbot_core::AppConfig;
use ghostRbot_db::Database;
use std::sync::Arc;
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;

pub mod routes;
pub mod middleware;
pub mod state;

pub use state::AppState;

pub fn create_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api_routes = Router::new()
        // Auth routes
        .route("/api/login", post(routes::auth::login))
        .route("/api/login/user", post(routes::auth::login_user))
        .route("/api/register", post(routes::auth::register))
        .route("/api/verify", get(routes::auth::verify))
        .route("/api/forgot-password", post(routes::auth::forgot_password))
        .route("/api/reset-password", post(routes::auth::reset_password))
        .route("/api/captcha", get(routes::auth::get_captcha))
        .route("/api/admin/password", put(routes::auth::change_admin_password))
        // Wallet routes
        .route("/api/wallets", get(routes::wallets::list_wallets))
        .route("/api/wallets/create", post(routes::wallets::create_wallet))
        .route("/api/wallets/import", post(routes::wallets::import_wallet))
        .route("/api/wallets/:label", delete(routes::wallets::delete_wallet))
        .route("/api/wallets/batch", post(routes::wallets::batch_create))
        .route("/api/wallets/:label/secret", get(routes::wallets::get_secret))
        .route("/api/wallets/:label/rename", put(routes::wallets::rename_wallet))
        // Trading routes
        .route("/api/trade/buy", post(routes::trading::buy))
        .route("/api/trade/sell", post(routes::trading::sell))
        .route("/api/balances", get(routes::trading::balances))
        .route("/api/orders", get(routes::orders::list_orders).post(routes::orders::create_order))
        .route("/api/orders/:id", delete(routes::orders::cancel_order))
        // Volume bot routes
        .route("/api/volume/orders", get(routes::volume::list_orders).post(routes::volume::create_order))
        .route("/api/volume/orders/:id/stop", post(routes::volume::stop_order))
        .route("/api/volume/orders/:id", delete(routes::volume::delete_order))
        .route("/api/volume/stop", post(routes::volume::stop_all))
        .route("/api/volume/close-all", post(routes::volume::close_all))
        .route("/api/volume/transactions", get(routes::volume::transactions))
        // Exchange routes
        .route("/api/exchange/credentials", get(routes::exchange::check_credentials).post(routes::exchange::save_credentials).delete(routes::exchange::delete_credentials))
        .route("/api/exchange/info", get(routes::exchange::info))
        .route("/api/exchange/balance", get(routes::exchange::balance))
        .route("/api/exchange/ticker/:symbol", get(routes::exchange::ticker))
        .route("/api/exchange/orders", get(routes::exchange::list_orders).post(routes::exchange::create_order))
        .route("/api/exchange/orders/history", get(routes::exchange::order_history))
        .route("/api/exchange/orders/:id", delete(routes::exchange::cancel_order))
        .route("/api/exchange/orders/:id/stop", post(routes::exchange::stop_order))
        .route("/api/exchange/markets", get(routes::exchange::markets))
        .route("/api/exchange/transactions", get(routes::exchange::transactions))
        .route("/api/exchange/stop", post(routes::exchange::stop_all))
        .route("/api/exchange/close-all", post(routes::exchange::close_all))
        // Market maker routes
        .route("/api/market-maker/fund", post(routes::market_maker::fund))
        .route("/api/market-maker/liquidity", post(routes::market_maker::liquidity))
        .route("/api/market-maker/stats", get(routes::market_maker::stats))
        // User management routes
        .route("/api/users", get(routes::users::list_users).post(routes::users::create_user))
        .route("/api/users/:username", put(routes::users::update_user).delete(routes::users::delete_user))
        .route("/api/users/:username/status", put(routes::users::update_status))
        // Intelligence routes
        .route("/api/chat", post(routes::intelligence::chat))
        .route("/api/intelligence/briefing", get(routes::intelligence::briefing))
        .route("/api/intelligence/news", get(routes::intelligence::news))
        .route("/api/intelligence/market", get(routes::intelligence::market))
        .route("/api/intelligence/sentiment", get(routes::intelligence::sentiment))
        .route("/api/intelligence/:module", get(routes::intelligence::module))
        // Config routes
        .route("/api/config", get(routes::config::get_config).put(routes::config::update_config))
        .route("/api/fees", get(routes::config::get_fees).put(routes::config::update_fees));

    let app = Router::new()
        .merge(api_routes)
        .fallback(routes::spa::serve_spa)
        .layer(axum::middleware::from_fn(middleware::auth::auth_middleware))
        .layer(axum::middleware::from_fn(middleware::logging::logging_middleware))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state);

    app
}
