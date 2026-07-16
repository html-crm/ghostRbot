const CG = 'https://api.coingecko.com/api/v3'
const DEX = 'https://api.dexscreener.com'
const FNG = 'https://api.alternative.me'

async function cg(path, params = {}) {
  const url = new URL(`${CG}${path}`)
  Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v))
  const r = await fetch(url)
  if (!r.ok) throw new Error(`CoinGecko ${r.status}`)
  return r.json()
}

async function dex(path) {
  const r = await fetch(`${DEX}${path}`)
  if (!r.ok) throw new Error(`DexScreener ${r.status}`)
  return r.json()
}

export async function getGlobalData() {
  const d = await cg('/global')
  return d.data
}

export async function getCoins(ids) {
  return cg('/coins/markets', {
    vs_currency: 'usd',
    ids: ids.join(','),
    order: 'market_cap_desc',
    sparkline: 'false',
    price_change_percentage: '1h,24h,7d',
  })
}

export async function getCoin(id) {
  return cg(`/coins/${id}`, {
    localization: 'false',
    tickers: 'false',
    community_data: 'true',
    developer_data: 'false',
    sparkline: 'false',
  })
}

export async function getTopGainers() {
  const d = await cg('/coins/markets', {
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: 250,
    page: 1,
    sparkline: 'false',
    price_change_percentage: '24h',
  })
  return d.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
}

export async function getTopLosers() {
  const d = await cg('/coins/markets', {
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: 250,
    page: 1,
    sparkline: 'false',
    price_change_percentage: '24h',
  })
  return d.sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0))
}

export async function getTrending() {
  const d = await cg('/search/trending')
  return d.coins?.map(c => c.item) || []
}

export async function getFearGreed() {
  const r = await fetch(`${FNG}/fng/`)
  const d = await r.json()
  return d.data?.[0] || { value: '50', value_classification: 'Neutral' }
}

export async function getFearGreedHistory(limit = 30) {
  const r = await fetch(`${FNG}/fng/?limit=${limit}`)
  const d = await r.json()
  return d.data || []
}

export async function getDexToken(address) {
  const d = await dex(`/latest/dex/tokens/${address}`)
  return d.pairs?.[0] || null
}

export async function getDexTrending() {
  const r = await fetch(`${DEX}/token-profiles/latest/v1`)
  if (!r.ok) return []
  return r.json()
}

export async function searchCoins(query) {
  return cg('/search', { query })
}
