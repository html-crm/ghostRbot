# ghostRbot - Crypto Trading Bot

A high-performance cryptocurrency trading bot written in Rust.

## Features

- **DEX Trading**: Buy/sell tokens on Solana (Jupiter, Raydium, PumpFun) and BSC (PancakeSwap)
- **CEX Trading**: Integration with Binance, Bybit, OKX, KuCoin, Gate.io
- **Volume Bot**: Create buy pressure using multiple wallets in rotation
- **Market Maker**: Manage liquidity positions on DEX pools
- **Limit Orders**: Take-profit and stop-loss orders
- **Token Discovery**: Monitor 6 sources for new tokens (DexScreener, Birdeye, PumpFun, Raydium, Uniswap, PancakeSwap)
- **Analysis Pipeline**: Contract analysis, social analysis, wallet analysis, scoring
- **Intelligence Engines**: 15 modules for news, market analysis, whale tracking, sentiment, etc.
- **Risk Management**: Portfolio monitoring, rug detection, trailing stops
- **Notifications**: Telegram alerts for trades, PnL changes, and discoveries
- **Web Interface**: React SPA with REST API

## Architecture

```
crates/
  core/              # Data models, traits, shared utilities
  db/                # PostgreSQL migrations + queries (sqlx)
  api/               # Axum HTTP server (REST endpoints)
  exchange-bot/      # CEX trading bot
  trading-engine/    # DEX trading engine
  volume-bot/        # DEX volume manipulation
  market-maker/      # Market making + liquidity
  limit-orders/      # Limit order engine
  discovery/         # Token discovery sources (6 pollers)
  analysis/          # Contract, social, wallet analysis
  intelligence/      # 15 intelligence engine modules
  monitoring/        # Portfolio, rug detection
  notifications/     # Telegram + webhook alerts
  telegram/          # Telegram bot
  frontend/          # Built React SPA
```

## Quick Start

### Prerequisites

- Rust 1.85+
- PostgreSQL 16+
- Docker (optional)

### Development

1. Clone the repository:
   ```bash
   git clone https://github.com/html-crm/ghostRbot.git
   cd ghostRbot
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start PostgreSQL:
   ```bash
   docker-compose up db -d
   ```

4. Run the bot:
   ```bash
   cargo run
   ```

### Production

1. Build the binary:
   ```bash
   cargo build --release
   ```

2. Run with Docker:
   ```bash
   docker-compose up -d
   ```

## API Endpoints

### Authentication
- `POST /api/login` - Admin login
- `POST /api/login/user` - User login
- `POST /api/register` - User registration
- `GET /api/verify` - Verify token

### Trading
- `POST /api/trade/buy` - Buy tokens on DEX
- `POST /api/trade/sell` - Sell tokens on DEX
- `GET /api/balances` - Get wallet balances

### Exchange (CEX)
- `POST /api/exchange/credentials` - Save CEX API keys
- `GET /api/exchange/balance` - Get exchange balance
- `POST /api/exchange/orders` - Create CEX order

### Volume Bot
- `POST /api/volume/orders` - Create volume order
- `POST /api/volume/orders/{id}/stop` - Stop volume order
- `GET /api/volume/orders` - List volume orders

### Intelligence
- `POST /api/chat` - AI chat
- `GET /api/intelligence/briefing` - Daily briefing
- `GET /api/intelligence/news` - Crypto news
- `GET /api/intelligence/market` - Market analysis

## Environment Variables

See `.env.example` for all available configuration options.

## License

MIT
