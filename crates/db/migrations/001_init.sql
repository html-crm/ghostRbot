CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'regular',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subscription_expiry TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(username),
    role TEXT NOT NULL DEFAULT 'regular',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS wallets (
    label TEXT PRIMARY KEY,
    chain TEXT NOT NULL,
    address TEXT NOT NULL,
    private_key_encrypted BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    chain TEXT NOT NULL,
    token_address TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    token_name TEXT NOT NULL,
    token_decimals INTEGER NOT NULL DEFAULT 9,
    quote_mint TEXT NOT NULL,
    pool_address TEXT NOT NULL,
    buy_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    buy_tx_signature TEXT,
    buy_filled BOOLEAN NOT NULL DEFAULT FALSE,
    sell_amount DOUBLE PRECISION,
    sell_tx_signature TEXT,
    sell_filled BOOLEAN NOT NULL DEFAULT FALSE,
    entry_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    exit_price DOUBLE PRECISION,
    current_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    pnl_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'monitoring',
    error TEXT,
    slippage_buy DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    slippage_sell DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    priority_fee DOUBLE PRECISION NOT NULL DEFAULT 0.001,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    tx_signature TEXT NOT NULL,
    chain TEXT NOT NULL,
    order_id UUID,
    tx_type TEXT NOT NULL,
    token_address TEXT NOT NULL,
    token_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    quote_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    price DOUBLE PRECISION NOT NULL DEFAULT 0,
    fee_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS limit_orders (
    id UUID PRIMARY KEY,
    chain TEXT NOT NULL,
    token_address TEXT NOT NULL,
    order_type TEXT NOT NULL,
    trigger_price DOUBLE PRECISION NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS volume_orders (
    id UUID PRIMARY KEY,
    chain TEXT NOT NULL,
    token_address TEXT NOT NULL,
    buy_amount DOUBLE PRECISION NOT NULL,
    total_buys INTEGER NOT NULL,
    current_buys INTEGER NOT NULL DEFAULT 0,
    total_sells INTEGER NOT NULL,
    current_sells INTEGER NOT NULL DEFAULT 0,
    buy_interval_secs BIGINT NOT NULL,
    sell_interval_secs BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    wallets TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exchange_credentials (
    user_id TEXT PRIMARY KEY,
    exchange_name TEXT NOT NULL,
    api_key_encrypted BYTEA NOT NULL,
    api_secret_encrypted BYTEA NOT NULL,
    extra_encrypted BYTEA,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exchange_orders (
    id UUID PRIMARY KEY,
    exchange_order_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    order_type TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exchange_transactions (
    id UUID PRIMARY KEY,
    tx_signature TEXT NOT NULL,
    exchange_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    fee DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_config (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    buy_fee_percent DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    sell_fee_percent DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    fee_wallet TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT single_row CHECK (id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discovery_state (
    source TEXT PRIMARY KEY,
    last_token_address TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_cache (
    cache_key TEXT PRIMARY KEY,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS intelligence_cache (
    cache_key TEXT PRIMARY KEY,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS captcha_challenges (
    id UUID PRIMARY KEY,
    question TEXT NOT NULL,
    answer INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS market_maker_state (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    master_wallet_label TEXT,
    liquidity_positions JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id)
);
