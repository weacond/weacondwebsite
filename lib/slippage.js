// lib/slippage.js — 滑点 / 价差成本（纯函数）
//
// 概念：
//   单次滑点 = 每腿滑点 × 2（进 + 出）
//   往返成本（价格单位）= 价差 + 2×滑点
//   占名义比 = 往返成本 / 价格
//   净回报 = 毛回报 − 占名义比
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:slippage:v1";
// 单次滑点（往返两腿）= 2 × 每腿滑点
export function roundTripSlippage(slippage) {
  const s = Number(slippage);
  if (!Number.isFinite(s)) return 0;
  return 2 * Math.abs(s);
}
// 往返成本（价格单位）= 价差 + 2×滑点
export function roundTripCost(spread, slippage) {
  const sp = Number(spread), s = Number(slippage);
  if (!Number.isFinite(sp) || !Number.isFinite(s)) return 0;
  return Math.abs(sp) + 2 * Math.abs(s);
}
// 占名义比 = 往返成本 / 价格
export function costPctOfNotional(costUnits, price) {
  const c = Number(costUnits), p = Number(price);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p <= 0) return 0;
  return Math.abs(c) / p;
}
// 净回报 = 毛回报 − 占名义比
export function netReturn(grossReturn, costFraction) {
  const g = Number(grossReturn), c = Number(costFraction);
  if (!Number.isFinite(g)) return 0;
  return g - (Number.isFinite(c) ? c : 0);
}
// 成本分级
export function slippageBand(costPct) {
  const c = Number(costPct);
  if (!Number.isFinite(c)) return "invalid";
  if (c <= 0) return "zero";
  if (c < 0.001) return "low";
  if (c < 0.005) return "moderate";
  if (c < 0.01) return "high";
  return "very-high";
}
// 综合视图
export function slippageSummary(inputs = {}) {
  const { price, spread, slippage, grossReturn } = inputs;
  const cost = roundTripCost(spread, slippage);
  const cpct = costPctOfNotional(cost, price);
  return {
    roundTripCost: cost,
    costPct: cpct,
    netReturn: netReturn(Number(grossReturn) || 0, cpct),
    band: slippageBand(cpct),
    valid: Number.isFinite(cpct),
  };
}
// 预设
export const SLIPPAGE_PRESETS = {
  liquidStock: { id: "liquidStock", label: "高流动性股票", price: 100, spread: 0.02, slippage: 0.01, grossReturn: 0.05 },
  illiquid: { id: "illiquid", label: "低流动性", price: 50, spread: 0.5, slippage: 0.2, grossReturn: 0.05 },
  cryptoSpot: { id: "cryptoSpot", label: "加密现货", price: 30000, spread: 1, slippage: 0.5, grossReturn: 0.1 },
  fx: { id: "fx", label: "外汇 majors", price: 1.1, spread: 0.0001, slippage: 0.00005, grossReturn: 0.02 },
  pennyStock: { id: "pennyStock", label: "低价股", price: 3, spread: 0.05, slippage: 0.02, grossReturn: 0.03 },
};