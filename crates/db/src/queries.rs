use sqlx::PgPool;
use chrono::{DateTime, Utc};
use ghostRbot_core::{User, UserRole, UserStatus, Session, Order, OrderStatus, Chain};

#[derive(sqlx::FromRow)]
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

#[derive(sqlx::FromRow)]
struct SessionRow {
    token: String,
    user_id: String,
    role: String,
    created_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
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
    let row = sqlx::query_as::<_, SessionRow>(
        "SELECT token, user_id, role, created_at, expires_at FROM sessions WHERE token = $1 AND expires_at > NOW()"
    )
    .bind(token)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| Session {
        token: r.token,
        user_id: r.user_id,
        role: r.role,
        created_at: r.created_at,
        expires_at: r.expires_at,
    }))
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
    let rows = sqlx::query(
        r#"SELECT id, chain, token_address, token_symbol, token_name, token_decimals, quote_mint, pool_address,
                  buy_amount, buy_tx_signature, buy_filled, sell_amount, sell_tx_signature, sell_filled,
                  entry_price, exit_price, current_price, pnl_percent, status, error,
                  slippage_buy, slippage_sell, priority_fee, created_at, updated_at
           FROM orders WHERE status IN ('monitoring', 'selling')"#
    )
    .fetch_all(pool)
    .await?;

    let mut orders = Vec::new();

    for row in rows {
        let chain_str: String = row.try_get("chain")?;
        let status_str: String = row.try_get("status")?;

        orders.push(Order {
            id: row.try_get("id")?,
            chain: match chain_str.as_str() {
                "bsc" => Chain::Bsc,
                "ethereum" => Chain::Ethereum,
                _ => Chain::Solana,
            },
            token_address: row.try_get("token_address")?,
            token_symbol: row.try_get("token_symbol")?,
            token_name: row.try_get("token_name")?,
            token_decimals: row.try_get("token_decimals")?,
            quote_mint: row.try_get("quote_mint")?,
            pool_address: row.try_get("pool_address")?,
            buy_amount: row.try_get("buy_amount")?,
            buy_tx_signature: row.try_get("buy_tx_signature")?,
            buy_filled: row.try_get("buy_filled")?,
            sell_amount: row.try_get("sell_amount")?,
            sell_tx_signature: row.try_get("sell_tx_signature")?,
            sell_filled: row.try_get("sell_filled")?,
            entry_price: row.try_get("entry_price")?,
            exit_price: row.try_get("exit_price")?,
            current_price: row.try_get("current_price")?,
            pnl_percent: row.try_get("pnl_percent")?,
            status: match status_str.as_str() {
                "selling" => OrderStatus::Selling,
                "sold" => OrderStatus::Sold,
                "error" => OrderStatus::Error,
                "cancelled" => OrderStatus::Cancelled,
                _ => OrderStatus::Monitoring,
            },
            error: row.try_get("error")?,
            slippage_buy: row.try_get("slippage_buy")?,
            slippage_sell: row.try_get("slippage_sell")?,
            priority_fee: row.try_get("priority_fee")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        });
    }

    Ok(orders)
}

pub async fn update_order(pool: &PgPool, order: &Order) -> anyhow::Result<()> {
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
