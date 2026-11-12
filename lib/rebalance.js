// lib/rebalance.js — 再平衡收益（Rebalancing Bonus，纯函数，可单元测试）
//
// 定期再平衡的两资产组合相对买入持有（静态权重）的额外收益，
// 近似为 Grinold–Kahn 再平衡溢价：
//   bonus ≈ w₁·w₂·(σ₁² + σ₂² − 2ρ·σ₁σ₂) = w₁·w₂·Var(r₁−r₂)
// 当两资产不完美相关时为正；资产越不同（ρ 越小、波动差越大）溢价越高。
// 同时给出静态组合波动：√(w₁²σ₁² + w₂²σ₂² + 2w₁w₂ρσ₁σ₂)。
// 确定性、零外部依赖。

export const STORAGE_KEY = "weacond:rebalance:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 静态组合年化波动（两资产）。
export function portfolioVol(w1, s1, s2, rho) {
  const a = num(w1);
  const b = 1 - a;
  const x = num(s1);
  const y = num(s2);
  const r = num(rho);
  const v = a * a * x * x + b * b * y * y + 2 * a * b * r * x * y;
  return Math.sqrt(Math.max(0, v));
}

// 再平衡溢价（年化）：w₁·w₂·(σ₁² + σ₂² − 2ρ·σ₁σ₂)。
export function rebalancingBonus(w1, s1, s2, rho) {
  const a = num(w1);
  const b = 1 - a;
  const x = num(s1);
  const y = num(s2);
  const r = num(rho);
  return a * b * (x * x + y * y - 2 * r * x * y);
}

// N 年累计再平衡收益（近似）。
export function totalBonus(bonus, years) {
  return num(bonus) * num(years);
}

// 溢价分级。
export function bonusBand(bonus) {
  if (!Number.isFinite(bonus)) return "na";
  const b = num(bonus);
  if (b <= 0) return "none";
  if (b < 0.005) return "low";
  if (b < 0.015) return "moderate";
  return "high";
}

// 综合视图：含静态组合波动、年化/累计溢价与分级。
export function rebalanceSummary(inputs = {}) {
  const { w1, s1, s2, rho, years } = inputs;
  const A = num(w1);
  const valid = A >= 0 && A <= 1;
  if (!valid) return { valid: false };
  const bonus = rebalancingBonus(A, s1, s2, rho);
  const pvol = portfolioVol(A, s1, s2, rho);
  return {
    w1: A,
    w2: 1 - A,
    portfolioVol: pvol,
    bonus,
    totalBonus: totalBonus(bonus, years),
    band: bonusBand(bonus),
    valid: true,
  };
}

// 预设：不同组合情景。
export const REBALANCE_PRESETS = {
  balanced: { id: "balanced", label: "平衡 50/50", w1: 0.5, s1: 0.2, s2: 0.1, rho: 0, years: 10 },
  stockBond: { id: "stockBond", label: "股债 60/40", w1: 0.6, s1: 0.2, s2: 0.05, rho: -0.2, years: 10 },
  antiCorrelated: { id: "antiCorrelated", label: "负相关", w1: 0.5, s1: 0.2, s2: 0.2, rho: -1, years: 5 },
  identical: { id: "identical", label: "完全相同", w1: 0.5, s1: 0.15, s2: 0.15, rho: 1, years: 5 },
  aggressive: { id: "aggressive", label: "激进 80/20", w1: 0.8, s1: 0.3, s2: 0.1, rho: 0, years: 10 },
};
export { num };