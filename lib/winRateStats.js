// lib/winRateStats.js — 胜率统计推断（纯函数，SSR/Edge 安全，可单元测试）
//
// 把"历史回测胜率"从点估计升级为统计结论：
//   1. Wilson 得分区间（p 接近 0/1 时比正态近似更稳）—— 胜率的 95% 置信区间；
//   2. 二项检验（单边）—— 胜率是否【显著优于 50% 抛硬币】，给 z 值与 p 值；
//   3. 盈亏比(Profit Factor) 与 期望(Expectancy)。
//
// 手册 §1「卖确定性的概率」：对历史策略同样用「概率 + 置信 + 显著性」表达，而非裸胜率。
// 复用 lib/winProbability.js 的正态 CDF（单一事实源，避免重复实现）。

import { normalCdf } from "./winProbability.js";

// Wilson 得分区间：95% 置信下 p 的 [lower, upper]。
export function wilsonInterval(wins, total, z = 1.96) {
  const w = Number(wins);
  const n = Number(total);
  if (!Number.isFinite(w) || !Number.isFinite(n) || n <= 0 || w < 0 || w > n) return null;
  const p = w / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z / denom) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return {
    p,
    lower: Math.max(0, center - half),
    upper: Math.min(1, center + half),
    z,
  };
}

// 二项检验（单边）：H1: 胜率 p > 0.5（是否显著优于抛硬币）。
export function binomialSignificance(wins, total, alpha = 0.05) {
  const ci = wilsonInterval(wins, total);
  if (!ci) return null;
  const n = Number(total);
  const p = ci.p;
  const se = Math.sqrt(0.25 / n); // H0: p=0.5，方差 0.5*0.5/n
  const z = se > 0 ? (p - 0.5) / se : 0;
  const pValue = 1 - normalCdf(z); // 单边 p 值
  const significant = pValue < alpha;
  return {
    z,
    pValue,
    alpha,
    significant,
    verdict: significant ? "significant" : "not_significant",
  };
}

// 盈亏比(Profit Factor) = 总盈利 / 总亏损
export function profitFactor(grossProfit = 0, grossLoss = 0) {
  const g = Number(grossLoss);
  if (g === 0) return Number(grossProfit) > 0 ? Infinity : 0;
  return Number(grossProfit) / g;
}

// 期望(Expectancy) = winRate * 平均盈利 − (1 − winRate) * 平均亏损
export function expectancy(winRate, avgWin = 0, avgLoss = 0) {
  const wr = Number(winRate);
  return wr * Number(avgWin) - (1 - wr) * Number(avgLoss);
}

// 把"胜率"升级为完整统计结论（CI + 显著性 + [期望/盈亏比]）。
export function assessWinRate(wins, total, opts = {}) {
  const ci = wilsonInterval(wins, total);
  if (!ci) return null;
  const sig = binomialSignificance(wins, total, opts.alpha ?? 0.05);
  const out = {
    wins,
    total,
    winRate: ci.p,
    confidenceBand: [ci.lower, ci.upper], // 95% 区间
    z: sig.z,
    pValue: sig.pValue,
    significant: sig.significant,
    verdict: sig.verdict,
  };
  if (opts.avgWin != null && opts.avgLoss != null) {
    out.expectancy = expectancy(ci.p, opts.avgWin, opts.avgLoss);
  }
  if (opts.grossProfit != null && opts.grossLoss != null) {
    out.profitFactor = profitFactor(opts.grossProfit, opts.grossLoss);
  }
  return out;
}

export default assessWinRate;
