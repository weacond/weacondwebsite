export const runtime = "edge";

// 行情数据 API — GET /api/marketdata
// 查询参数: ?symbol=SPY&source=alphaVantage&apiKey=xxx
// 返回: { candles: [...], fundamentals: {...} }

import { fetchRealCandles, fetchFundamentals } from "../../lib/marketdata_real";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { symbol = "SPY", source = "alphaVantage", includeFundamentals = "false" } = req.query;
  // 安全：优先用服务端 env 密钥；绝不信任 URL 里的 apiKey（会进日志 / Referer 造成泄漏）。
  // 仅当未配置 env（本地开发调试）时才允许 query 透传。
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || req.query.apiKey;

  try {
    const candles = await fetchRealCandles({ symbol, source, apiKey });

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
