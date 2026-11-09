// 行情数据 API — GET /api/marketdata
// 查询参数: ?symbol=SPY&source=alphaVantage&apiKey=xxx
// 返回: { candles: [...], fundamentals: {...} }
//
// 注意：用默认 Node runtime（非 edge）。Pages Router 的 edge API 对 (req,res).status().json()
// 支持不完整会导致 res.status is not a function；Node 18+ 原生 fetch 足以访问 Alpha Vantage。

import { fetchRealCandles, fetchFundamentals, fetchFredSeries } from "../../lib/marketdata_real";

// 简单内存缓存（TTL）：减少 Alpha Vantage / FRED 配额消耗。
// Node runtime 下随进程存活；edge 下随 isolate 存活。日线数据 15 分钟足够，FRED 日频 1 小时足够。
const cache = new Map();
const CANDLE_TTL = 15 * 60 * 1000; // 15 分钟
const FRED_TTL = 60 * 60 * 1000;   // 1 小时

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > hit.ttl) { cache.delete(key); return null; }
  return hit.v;
}
function cacheSet(key, v, ttl) {
  cache.set(key, { v, t: Date.now(), ttl });
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 用 Web 标准 URL 解析 query（edge + node 双兼容；不依赖 req.query 是否被填充）。
  const params = new URL(req.url, "http://localhost").searchParams;
  const symbol = params.get("symbol") || "SPY";
  const source = params.get("source") || "alphaVantage";
  const includeFundamentals = params.get("includeFundamentals") || "false";
  // 安全：优先用服务端 env 密钥；绝不信任 URL 里的 apiKey（会进日志 / Referer 造成泄漏）。
  // 仅当未配置 env（本地开发调试）时才允许 query 透传。
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || params.get("apiKey");

  // FRED 宏观系列（利率/通胀/就业/信用利差）：?fred=DFF,UNRATE,CPIAUCSL,BAMLC0A0CM
  const fredParam = params.get("fred");
  if (fredParam) {
    const ids = fredParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8);
    const fredKey = `fred:${[...ids].sort().join(",")}`;
    const cached = cacheGet(fredKey);
    if (cached) return res.status(200).json(cached);
    try {
      const fredKey2 = process.env.FREDSERIESKEY || apiKey;
      const series = await fetchFredSeries(ids, fredKey2);
      const payload = {
        type: "fred",
        live: Boolean(process.env.FREDSERIESKEY || process.env.ALPHA_VANTAGE_API_KEY),
        series,
      };
      cacheSet(fredKey, payload, FRED_TTL);
      res.status(200).json(payload);
    } catch (err) {
      console.error("FRED error:", err);
      res.status(500).json({ error: err.message || "FRED fetch failed" });
    }
    return;
  }

  // 日线缓存：同标的同周期 15 分钟内复用，避免重复打满 Alpha Vantage 配额
  const candleKey = `candles:${symbol}:${source}`;
  const candleCache = cacheGet(candleKey);
  const candles = candleCache || await fetchRealCandles({ symbol, source, apiKey });
  if (!candleCache) cacheSet(candleKey, candles, CANDLE_TTL);

  try {
    const result = {
      symbol,
      source,
      live: Boolean(process.env.ALPHA_VANTAGE_API_KEY),
      candles: candles.map((c) => ({
        date: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
      count: candles.length,
      startDate: candles[0]?.date,
      endDate: candles[candles.length - 1]?.date,
    };

    if (includeFundamentals === "true") {
      result.fundamentals = await fetchFundamentals(symbol);
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("Market data error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch market data" });
  }
}
