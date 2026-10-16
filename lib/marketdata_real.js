// 真实行情数据接入层
// 支持 Alpha Vantage / Yahoo Finance / 本地CSV
// 回测引擎自动适配真实数据格式

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
 * 获取基本面数据
 * @param {string} symbol
 * @returns {Promise<Object>} 返回基本面指标
 */
export async function fetchFundamentals(symbol) {
  // TODO: 接入真实基本面API（如 Alpha Vantage OVERVIEW / Polygon.io）
  console.warn("Fundamentals not yet integrated, returning mock data");

  return {
    symbol,
    peRatio: 15.5,
    pbRatio: 2.8,
    roe: 0.22,
    marketCap: 1234567890,
    dividendYield: 0.015,
    beta: 1.2,
  };
}

/**
 * 获取期权数据
 * @param {string} symbol
 * @param {Date} expiration
 * @returns {Promise<Array>} 返回期权链
 */
export async function fetchOptionChain(symbol, expiration) {
  // TODO: 接入真实期权API（如 Polygon.io Options / OptionsDX）
  console.warn("Option chain not yet integrated, returning mock data");

  const basePrice = 100;
  const iv = 0.35;

  // 生成 ATM 附近的期权
  const strikes = [80, 90, 95, 100, 105, 110, 120];

  const options = strikes.flatMap((strike) => {
    const intrinsic = Math.max(0, (strike < basePrice ? basePrice - strike : strike - basePrice));
    const timeToExp = Math.max(0.01, (expiration - Date.now()) / (365 * 24 * 60 * 60 * 1000));
    const ivPrice = intrinsic + basePrice * iv * Math.sqrt(timeToExp) * 0.4;

    return [
      {
        type: "put",
        strike,
        bid: Math.max(0.01, ivPrice - 0.1),
        ask: ivPrice + 0.1,
        volume: Math.floor(Math.random() * 1000),
        openInterest: Math.floor(Math.random() * 10000),
      },
      {
        type: "call",
        strike,
        bid: Math.max(0.01, ivPrice - 0.1),
        ask: ivPrice + 0.1,
        volume: Math.floor(Math.random() * 1000),
        openInterest: Math.floor(Math.random() * 10000),
      },
    ];
  });

  return options;
}
