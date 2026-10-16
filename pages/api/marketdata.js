export const runtime = "edge";

// 行情数据 API — GET /api/marketdata
// 查询参数: ?symbol=SPY&source=alphaVantage&apiKey=xxx
// 返回: { candles: [...], fundamentals: {...} }

import { fetchRealCandles, fetchFundamentals } from "../../lib/marketdata_real";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { symbol = "SPY", source = "alphaVantage", apiKey, includeFundamentals = "false" } = req.query;

  try {
    const candles = await fetchRealCandles({ symbol, source, apiKey });

    const result = {
      symbol,
      source,
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
