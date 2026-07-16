use sqlx::PgPool;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use ghostRbot_core::{User, UserRole, UserStatus, Session, Order, OrderStatus, Chain};

pub struct UserRow {
    pub username: String,
    pub password_hash: String,
    pub email: String,
    pub role: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub subscription_expiry: Option<DateTime<Utc>>,
}

impl UserRow {
    pub fn to_user(self) -> User {
        User {
            username: self.username,
            password_hash: self.password_hash,
            email: self.email,
            role: match self.role.as_str() {
                "admin" => UserRole::Admin,
                "vip" => UserRole::Vip,
                _ => UserRole::Regular,
            },
            status: match self.status.as_str() {
                "approved" => UserStatus::Approved,
                "rejected" => UserStatus::Rejected,
                "banned" => UserStatus::Banned,
                _ => UserStatus::Pending,
            },
            created_at: self.created_at,
            subscription_expiry: self.subscription_expiry,
        }
    }
}

pub async fn create_user(pool: &PgPool, user: &User) -> anyhow::Result<()> {
    sqlx::query(
        r#"INSERT INTO users (username, password_hash, email, role, status, created_at, subscription_expiry)
           VALUES ($1, $2, $3, $4, $5, $6, $7)"#
    )
    .bind(&user.username)
    .bind(&user.password_hash)
    .bind(&user.email)
    .bind(serde_json::to_string(&user.role).unwrap_or_default())
    .bind(serde_json::to_string(&user.status).unwrap_or_default())
    .bind(user.created_at)
    .bind(user.subscription_expiry)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_user(pool: &PgPool, username: &str) -> anyhow::Result<Option<UserRow>> {
    let row = sqlx::query_as::<_, UserRow>(
        "SELECT username, password_hash, email, role, status, created_at, subscription_expiry FROM users WHERE username = $1"
    )
    .bind(username)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn create_session(pool: &PgPool, session: &Session) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO sessions (token, user_id, role, created_at, expires_at) VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(&session.token)
    .bind(&session.user_id)
    .bind(&session.role)
    .bind(session.created_at)
    .bind(session.expires_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_session(pool: &PgPool, token: &str) -> anyhow::Result<Option<Session>> {
    let row = sqlx::query_as::<_, Session>(
        "SELECT token, user_id, role, created_at, expires_at FROM sessions WHERE token = $1 AND expires_at > NOW()"
    )
    .bind(token)
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

pub async fn delete_session(pool: &PgPool, token: &str) -> anyhow::Result<()> {
    sqlx::query("DELETE FROM sessions WHERE token = $1")
        .bind(token)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn create_order(pool: &PgPool, order: &Order) -> anyhow::Result<()> {
    sqlx::query(
        r#"INSERT INTO orders (id, chain, token_address, token_symbol, token_name, token_decimals, quote_mint, pool_address, buy_amount, buy_tx_signature, buy_filled, sell_amount, sell_tx_signature, sell_filled, entry_price, exit_price, current_price, pnl_percent, status, error, slippage_buy, slippage_sell, priority_fee, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)"#
    )
    .bind(order.id)
    .bind(serde_json::to_string(&order.chain).unwrap_or_default())
    .bind(&order.token_address)
    .bind(&order.token_symbol)
    .bind(&order.token_name)
    .bind(order.token_decimals)
    .bind(&order.quote_mint)
    .bind(&order.pool_address)
    .bind(order.buy_amount)
    .bind(&order.buy_tx_signature)
    .bind(order.buy_filled)
    .bind(order.sell_amount)
    .bind(&order.sell_tx_signature)
    .bind(order.sell_filled)
    .bind(order.entry_price)
    .bind(order.exit_price)
    .bind(order.current_price)
    .bind(order.pnl_percent)
    .bind(serde_json::to_string(&order.status).unwrap_or_default())
    .bind(&order.error)
    .bind(order.slippage_buy)
    .bind(order.slippage_sell)
    .bind(order.priority_fee)
    .bind(order.created_at)
    .bind(order.updated_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_active_orders(pool: &PgPool) -> anyhow::Result<Vec<Order>> {
    let rows = sqlx::query_as::<_, (Uuid, String, String, String, String, u8, String, String, f64, Option<String>, bool, Option<f64>, Option<String>, bool, f64, Option<f64>, f64, f64, String, Option<String>, f64, f64, f64, DateTime<Utc>, DateTime<Utc>)>(
        r#"SELECT id, chain, token_address, token_symbol, token_name, token_decimals, quote_mint, pool_address, buy_amount, buy_tx_signature, buy_filled, sell_amount, sell_tx_signature, sell_filled, entry_price, exit_price, current_price, pnl_percent, status, error, slippage_buy, slippage_sell, priority_fee, created_at, updated_at
           FROM orders WHERE status IN ('monitoring', 'selling')"#
    )
    .fetch_all(pool)
    .await?;

    let orders = rows.into_iter().map(|r| Order {
        id: r.0,
        chain: match r.1.as_str() {
            "bsc" => Chain::Bsc,
            "ethereum" => Chain::Ethereum,
            _ => Chain::Solana,
        },
        token_address: r.2,
        token_symbol: r.3,
        token_name: r.4,
        token_decimals: r.5,
        quote_mint: r.6,
        pool_address: r.7,
        buy_amount: r.8,
        buy_tx_signature: r.9,
        buy_filled: r.10,
        sell_amount: r.11,
        sell_tx_signature: r.12,
        sell_filled: r.13,
        entry_price: r.14,
        exit_price: r.15,
        current_price: r.16,
        pnl_percent: r.17,
        status: match r.18.as_str() {
            "selling" => OrderStatus::Selling,
            "sold" => OrderStatus::Sold,
            "error" => OrderStatus::Error,
            "cancelled" => OrderStatus::Cancelled,
            _ => OrderStatus::Monitoring,
        },
        error: r.19,
        slippage_buy: r.20,
        slippage_sell: r.21,
        priority_fee: r.22,
        created_at: r.23,
        updated_at: r.24,
    }).collect();

    Ok(orders)
}

pub async fn update_order(pool: &PgPool, order: &ghostRbot_core::Order) -> anyhow::Result<()> {
    sqlx::query(
        r#"UPDATE orders SET
            buy_tx_signature = $2, buy_filled = $3,
            sell_amount = $4, sell_tx_signature = $5, sell_filled = $6,
            entry_price = $7, exit_price = $8, current_price = $9,
            pnl_percent = $10, status = $11, error = $12,
            updated_at = NOW()
        WHERE id = $1"#,
    )
    .bind(order.id)
    .bind(&order.buy_tx_signature)
    .bind(order.buy_filled)
    .bind(order.sell_amount)
    .bind(&order.sell_tx_signature)
    .bind(order.sell_filled)
    .bind(order.entry_price)
    .bind(order.exit_price)
    .bind(order.current_price)
    .bind(order.pnl_percent)
    .bind(serde_json::to_string(&order.status).unwrap_or_default())
    .bind(&order.error)
    .execute(pool)
    .await?;
    Ok(())
}
