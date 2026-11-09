// 真实行情数据接入层
// 支持 Alpha Vantage / Yahoo Finance / 本地CSV
// 回测引擎自动适配真实数据格式

import { computeOptionChain } from "./options.js";

const DATA_SOURCES = {
  alphaVantage: {
    baseUrl: "https://www.alphavantage.co/query",
    freeRateLimit: 5, // 每分钟5次
  },
  yfinance: {
    // 需要后端代理，避免CORS
    baseUrl: "/api/proxy/yfinance",
  },
};

/**
 * 获取真实行情数据
 * @param {Object} params - { symbol, function, interval, outputsize, apiKey }
 * @returns {Promise<Array>} 返回 candles 数组 [{date, open, high, low, close, volume}]
 */
export async function fetchRealCandles(params = {}) {
  const {
    symbol = "SPY",
    source = "alphaVantage",
    apiKey,
    outputsize = "full",
    interval = "daily",
  } = params;

  if (!apiKey && source === "alphaVantage") {
    console.warn("Alpha Vantage API key not provided, falling back to mock");
    return generateMockCandlesFallback(symbol);
  }

  try {
    if (source === "alphaVantage") {
      return await fetchFromAlphaVantage({ symbol, apiKey, outputsize, interval });
    }
    if (source === "yfinance") {
      return await fetchFromYFinance({ symbol, interval });
    }
    throw new Error(`Unknown data source: ${source}`);
  } catch (err) {
    console.error(`Failed to fetch from ${source}:`, err);
    // 降级到模拟数据
    return generateMockCandlesFallback(symbol);
  }
}

/**
 * Alpha Vantage 日线数据
 */
async function fetchFromAlphaVantage({ symbol, apiKey, outputsize, interval }) {
  const url = new URL(DATA_SOURCES.alphaVantage.baseUrl);
  url.searchParams.set("function", interval === "daily" ? "TIME_SERIES_DAILY" : "TIME_SERIES_INTRADAY");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("outputsize", outputsize);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();

  // Alpha Vantage 返回 { "2024-01-01": { "1. open": "123.45", ... } }
  const timeSeries = data["Time Series (Daily)"] || data["Time Series (5min)"] || {};

  const candles = Object.entries(timeSeries)
    .map(([date, values]) => ({
      date: new Date(date).toISOString(),
      open: parseFloat(values["1. open"]),
      high: parseFloat(values["2. high"]),
      low: parseFloat(values["3. low"]),
      close: parseFloat(values["4. close"]),
      volume: parseFloat(values["5. volume"]),
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // 升序排列

  return candles;
}

/**
 * Yahoo Finance 代理（需要后端）
 */
async function fetchFromYFinance({ symbol, interval }) {
  const range = "2y"; // 2年历史
  const url = `${DATA_SOURCES.yfinance.baseUrl}?symbol=${symbol}&interval=${interval}&range=${range}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();

  // Yahoo 返回 { "chart": { "result": [{ "timestamp": [...], "indicators": { "quote": [{ "open": [...] }] } }] } }
  const result = data.chart?.result?.[0];
  if (!result) throw new Error("Invalid response format");

  const { timestamp, indicators } = result;
  const quote = indicators.quote[0];

  const candles = timestamp.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString(),
    open: quote.open[i],
    high: quote.high[i],
    low: quote.low[i],
    close: quote.close[i],
    volume: quote.volume[i],
  }));

  return candles;
}

/**
 * 降级到模拟数据
 */
function generateMockCandlesFallback(symbol) {
  // 简单的随机游走
  const startDate = new Date(Date.now() - 365 * 1000 * 60 * 60 * 24);
  const endDate = new Date();
  const candles = [];
  let price = 100;

  for (let t = startDate; t <= endDate; t.setDate(t.getDate() + 1)) {
    const change = (Math.random() - 0.5) * 2;
    price = Math.max(1, price + change);
    candles.push({
      date: new Date(t).toISOString(),
      open: price - change / 2,
      high: Math.max(price, price + change),
      low: Math.min(price, price - change),
      close: price,
      volume: Math.floor(Math.random() * 1000000 + 500000),
    });
  }

  return candles;
}

/**
 * 获取 FRED 宏观系列（经 Alpha Vantage FRED 函数），用于宏观仪表盘。
 * @param {string[]} ids FRED 系列 id，如 ["DFF","UNRATE","CPIAUCSL","BAMLC0A0CM"]
 * @param {string} apiKey Alpha Vantage / FRED key
 * @returns {Promise<Object>} { [id]: [{date, value}] } 近 24 个月，按时间升序；失败项自动省略
 */
export async function fetchFredSeries(ids, apiKey) {
  if (!Array.isArray(ids) || ids.length === 0) return {};
  const out = {};
  await Promise.all(ids.map(async (id) => {
    if (!/^[-_a-zA-Z0-9]{1,32}$/.test(id)) return; // 防注入
    try {
      const url = `https://www.alphavantage.co/query?function=FRED&series_id=${encodeURIComponent(id)}&outputsize=full&apikey=${encodeURIComponent(apiKey || "")}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return;
      const data = await res.json();
      const arr = data[id];
      if (Array.isArray(arr) && arr.length) {
        out[id] = arr
          .filter((e) => e && e.date && e.value != null)
          .map((e) => ({ date: e.date, value: Number(e.value) }))
          .reverse()
          .slice(-24); // 近 24 个月，升序
      }
    } catch {
      /* 单项失败静默，不中断其它系列 */
    }
  }));
  return out;
}

/**
 * Alpha Vantage OVERVIEW 原始字段 → 本站统一基本面形状。
 * 纯函数、无副作用，便于单测。缺失 / "-"（AV 的空值占位）一律转 null，绝不臆造。
 * 字段为加法式扩展：保留历史 6 字段，新增 name/sector/live/source。
 */
const AV_FIELD_MAP = {
  peRatio: "PEFork",
  pbRatio: "PriceToBookRatio",
  roe: "ROE",
  marketCap: "MarketCapitalization",
  dividendYield: "DividendYield",
  beta: "Beta",
};

function avNumber(v) {
  if (v == null || v === "-") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseOverview(symbol, raw) {
  const out = {
    symbol,
    name: null,
    sector: null,
    peRatio: null,
    pbRatio: null,
    roe: null,
    marketCap: null,
    dividendYield: null,
    beta: null,
    live: true,
    source: "alphaVantage",
  };
  if (!raw || typeof raw !== "object") return out;
  for (const [localKey, avKey] of Object.entries(AV_FIELD_MAP)) {
    out[localKey] = avNumber(raw[avKey]);
  }
  out.name = raw.Name ? String(raw.Name) : null;
  out.sector = raw.Sector ? String(raw.Sector) : null;
  return out;
}

/**
 * 演示用基本面（无密钥 / 上游失败时的降级值）。
 * 保留历史字段形状，附加 live:false 供消费方区分真假数据。
 */
function mockFundamentals(symbol) {
  return {
    symbol,
    name: null,
    sector: null,
    peRatio: 15.5,
    pbRatio: 2.8,
    roe: 0.22,
    marketCap: 1234567890,
    dividendYield: 0.015,
    beta: 1.2,
    live: false,
    source: "mock",
  };
}

/**
 * 获取基本面数据（Alpha Vantage OVERVIEW）。
 * @param {string} symbol 标的代码，如 "AAPL"
 * @param {string} [apiKey] Alpha Vantage / FRED 密钥；无则降级到演示数据
 * @returns {Promise<Object>} 统一基本面形状 { symbol, name, sector, peRatio, pbRatio, roe, marketCap, dividendYield, beta, live, source }
 */
export async function fetchFundamentals(symbol, apiKey) {
  const sym = String(symbol || "SPY").toUpperCase();
  // 防注入：仅允许字母数字与 "."（与 fetchFredSeries 同口径）
  if (!/^[A-Z0-9.]{1,12}$/.test(sym)) return mockFundamentals(sym);
  // 无密钥：保持原行为，返回演示数据
  if (!apiKey) return mockFundamentals(sym);

  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    // Alpha Vantage 的限流 / 错误信封：{"Note": "...", "1 min limit": "..." } 等
    if (raw && (raw.Note || raw["1 min limit"] || raw["1 day limit"])) {
      throw new Error(raw.Note || "Alpha Vantage rate limited");
    }
    const parsed = parseOverview(sym, raw);
    // 关键字段全空（数据缺失）→ 回退演示数据，避免返回全 null 的“真但无用”对象
    if (parsed.peRatio == null && parsed.marketCap == null && parsed.roe == null) {
      return mockFundamentals(sym);
    }
    return parsed;
  } catch (err) {
    console.warn(`Fundamentals fetch failed for ${sym}, falling back to mock:`, err.message || err);
    return mockFundamentals(sym);
  }
}

/**
 * 获取期权数据
 * @param {string} symbol
 * @param {Date} expiration
 * @returns {Promise<Array>} 返回期权链
 */
export async function fetchOptionChain(symbol, expiration, opts = {}) {
  // 真实逐档期权链需付费数据源（Polygon / OptionsDX）；免费层无可靠数据。
  // 故用 Black-Scholes 解析模型生成确定性期权链，并诚实标注 model:'black-scholes'。
  // 纯函数实现见 lib/options.js（已单元测试）；本异步壳层仅做入参归一，无随机、可复现。
  const spot = opts.spot || 100;
  const iv = opts.iv ?? 0.2;
  const r = opts.r ?? 0.04;
  const t =
    opts.t ??
    (expiration ? Math.max(1 / 365, (expiration - Date.now()) / (365 * 24 * 3600 * 1000)) : 1 / 12);
  return computeOptionChain({
    symbol: symbol ? String(symbol).toUpperCase() : null,
    spot,
    iv,
    r,
    t,
  });
}
