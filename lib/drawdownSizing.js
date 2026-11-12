// lib/drawdownSizing.js — 回撤→头寸缩放（Drawdown-to-equity position sizing，纯函数）
//
// 给定目标最大回撤 targetDD 和策略历史最大回撤 stratDD：
// 头寸比例 = targetDD / stratDD（上限 1.0）
// 缩放收益 = stratReturn × 头寸比例
// 每笔最大亏损 = 账户 × 目标回撤 / 交易次数
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:ddSizing:v1";
function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}
// 头寸比例 = min(targetDD / stratDD, 1.0)。
export function ddPosition(targetDD, strategyDD) {
  const t = num(targetDD);
  const s = num(strategyDD);
  if (s <= 0 || t <= 0) return 0;
  return Math.min(t / s, 1.0);
}
// 缩放收益 = stratReturn × position。
export function scaledReturn(stratReturn, stratDD, targetDD) {
  const r = num(stratReturn);
  const pos = ddPosition(targetDD, stratDD);
  return r * pos;
}
// 每笔最大亏损 = account × targetDD / numTrades。
export function maxLossPerTrade(account, targetDD, numTrades) {
  const A = num(account);
  const t = num(targetDD);
  const n = num(numTrades);
  if (n <= 0) return 0;
  return (A * t) / n;
}
// 风险调整后的夏普 = scaledReturn / scaledVol。
export function riskAdjustedSharpe(stratReturn, stratVol, stratDD, targetDD) {
  const scaled = scaledReturn(stratReturn, stratDD, targetDD);
  const pos = ddPosition(targetDD, stratDD);
  const scaledVol = num(stratVol) * pos;
  if (scaledVol <= 0) return 0;
  return scaled / scaledVol;
}
// 头寸比例分级。
export function ddSizingBand(position) {
  const p = num(position);
  if (p <= 0) return "zero";
  if (p < 0.25) return "small";
  if (p < 0.5) return "moderate";
  if (p < 0.75) return "large";
  return "full";
}
// 综合视图。
export function ddSizingSummary(inputs = {}) {
  const { account = 100000, targetDD = 0.15, strategyDD = 0.30, stratReturn = 0.25, stratVol = 0.20, numTrades = 50 } = inputs;
  const A = num(account);
  const t = num(targetDD);
  const s = num(strategyDD);
  const valid = A > 0 && t > 0 && s > 0 && t <= 1 && s <= 1;
  if (!valid) return { valid: false };
  const pos = ddPosition(t, s);
  const scaled = scaledReturn(num(stratReturn), s, t);
  const mlp = maxLossPerTrade(A, t, numTrades);
  const sharpe = riskAdjustedSharpe(num(stratReturn), num(stratVol), s, t);
  return {
    account: A,
    targetDD: t,
    strategyDD: s,
    position: pos,
    scaledReturn: scaled,
    maxLossPerTrade: mlp,
    scaledSharpe: sharpe,
    band: ddSizingBand(pos),
    valid: true,
  };
}
// 预设：不同回撤场景。
export const DD_SIZING_PRESETS = {
  conservative: { id: "conservative", label: "保守 10%", account: 100000, targetDD: 0.10, strategyDD: 0.30, stratReturn: 0.25, stratVol: 0.20, numTrades: 50 },
  standard: { id: "standard", label: "标准 15%", account: 100000, targetDD: 0.15, strategyDD: 0.30, stratReturn: 0.25, stratVol: 0.20, numTrades: 50 },
  aggressive: { id: "aggressive", label: "激进 25%", account: 100000, targetDD: 0.25, strategyDD: 0.30, stratReturn: 0.25, stratVol: 0.20, numTrades: 50 },
  lowDD: { id: "lowDD", label: "低回撤 5%", account: 200000, targetDD: 0.05, strategyDD: 0.15, stratReturn: 0.12, stratVol: 0.10, numTrades: 100 },
  highDD: { id: "highDD", label: "高回撤 30%", account: 50000, targetDD: 0.30, strategyDD: 0.40, stratReturn: 0.40, stratVol: 0.35, numTrades: 30 },
};
export { num };
