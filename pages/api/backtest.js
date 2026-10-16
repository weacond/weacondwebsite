export const runtime = "edge";

// 回测 API — POST /api/backtest
// Body: { strategy, params, config, preset }
// 使用 lib/backtest.js + lib/marketdata.js 运行回测

import { runFullBacktest } from "../../lib/marketdata";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { strategy, params, config, preset } = req.body;
    if (!strategy) {
      return res.status(400).json({ error: "strategy is required" });
    }
    const result = runFullBacktest({
      strategy,
      params: params || {},
      config: config || {},
      preset: preset || "SPY_2023",
    });
    res.status(200).json(result);
  } catch (err) {
    console.error("Backtest error:", err);
    res.status(400).json({ error: err.message || "Backtest failed" });
  }
}
