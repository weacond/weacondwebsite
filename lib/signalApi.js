// lib/signalApi.js — 信号 API 数据层（纯函数，Edge 安全，可单元测试）
//
// 三引擎评分 → 可解释评分 + 胜率(盈利概率) + 置信区间 + 假设清单，按胜率排序。
// 供 /api/signals.js（对外 JSON，无密钥、always 200）与未来邮件简报/外部消费者复用。
// 手册：§1「卖确定性的概率」、§5 API 层、Phase 4「信号 API」。
//
// 注意：computeSignalScore 的 score 是 0-100；winProbability 的 edge 是 0-1，故 /100 归一。

import { computeSignalScore } from "./signals.js";
import { winProbability } from "./winProbability.js";

// 默认标的池（镜像 /signals 演示；技术面在 API 侧用估算分，待接真实行情源）
export const DEFAULT_UNIVERSE = [
  { ticker: "NVDA", name: "NVIDIA", fairValueScore: 0.82, technicalScore: 0.85, ivRank: 78, thetaScore: 0.7 },
  { ticker: "MSFT", name: "Microsoft", fairValueScore: 0.78, technicalScore: 0.68, ivRank: 55, thetaScore: 0.65 },
  { ticker: "SPY", name: "S&P 500 ETF", fairValueScore: 0.72, technicalScore: 0.7, ivRank: 40, thetaScore: 0.6 },
  { ticker: "AAPL", name: "Apple", fairValueScore: 0.65, technicalScore: 0.6, ivRank: 45, thetaScore: 0.6 },
  { ticker: "AMD", name: "AMD", fairValueScore: 0.55, technicalScore: 0.5, ivRank: 70, thetaScore: 0.75 },
  { ticker: "TSLA", name: "Tesla", fairValueScore: 0.4, technicalScore: 0.35, ivRank: 82, thetaScore: 0.85 },
];

export const DEFAULT_WEIGHTS = { fundamental: 0.35, technical: 0.3, volatility: 0.35 };

// 组装信号 API 响应：每个标的含评分 + 胜率 + 95% 置信区间 + 假设 + 可解释 rationale。
export function buildSignalApi(universe = DEFAULT_UNIVERSE, weights = DEFAULT_WEIGHTS, opts = {}) {
  const highThreshold = opts.highThreshold ?? 0.6;
  const horizon = opts.horizon ?? 21;
  const round2 = (n) => Math.round(n * 100) / 100;

  const signals = universe.map((u) => {
    const s = computeSignalScore(weights, u);
    const sigmaPer = 0.01 + (Number(u.ivRank) / 100) * 0.03;
    const wp = winProbability({
      score: s.score / 100, // 0-100 综合分 → winProbability 的 0-1 edge 代理
      sigmaPer,
      horizon,
      gain: 1.5,
      highThreshold,
    });
    return {
      ticker: u.ticker,
      name: u.name,
      ivRank: u.ivRank,
      score: s.score, // 0-100
      direction: s.direction,
      riskLevel: s.riskLevel,
      rationale: s.rationale, // 可解释性
      probOfProfit: round2(wp.probOfProfit), // 0-1
      confidenceBand: [round2(wp.confidenceBand[0]), round2(wp.confidenceBand[1])], // 95% 区间
      highWin: wp.highWin,
      assumptions: wp.assumptions,
    };
  });

  // 按胜率降序
  signals.sort((a, b) => b.probOfProfit - a.probOfProfit);

  const avg = signals.length
    ? signals.reduce((x, y) => x + y.probOfProfit, 0) / signals.length
    : 0;

  return {
    engine: "Weacond Engine v0.1",
    generatedAt: opts.generatedAt || new Date().toISOString(),
    dataMode: opts.dataMode || "estimated", // estimated | live
    highThreshold,
    count: signals.length,
    topWin: signals[0]
      ? { ticker: signals[0].ticker, probOfProfit: signals[0].probOfProfit }
      : null,
    avgProbOfProfit: round2(avg),
    signals,
    disclaimer:
      "教育性参考，非投资建议。盈利概率为正态近似，真实肥尾下实际更低；请配合止损/对冲。",
  };
}

// 单标的落地页数据（SEO 落地页 /signals/[ticker]）：给定 ticker 返回其完整信号 + 排名。
// 纯函数，getStaticProps 复用；找不到返回 null（页面据此 notFound）。
export function buildTickerLanding(ticker, universe = DEFAULT_UNIVERSE) {
  const t = String(ticker || "").toUpperCase();
  if (!t) return null;
  const api = buildSignalApi(universe, DEFAULT_WEIGHTS, {
    generatedAt: "static",
    dataMode: "estimated",
  });
  const signal = api.signals.find((s) => s.ticker === t);
  if (!signal) return null;
  const rank = api.signals.findIndex((s) => s.ticker === t) + 1;
  return {
    ...signal,
    rank,
    total: api.signals.length,
    engine: api.engine,
    dataMode: api.dataMode,
    disclaimer: api.disclaimer,
  };
}

export default buildSignalApi;
