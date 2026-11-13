// lib/fire.js — 财务自由 FIRE（纯函数）
//
// 概念（4% 规则 + 储蓄率模型）：
//   FIRE 资金目标 = 年支出 / 安全提取率
//   每年新增储蓄 D = 储蓄率 × 年支出，按实际增长 g 复利
//   达到目标所需年数（闭式解）：
//     x = (1+g)^n = (目标 + D/g) / (当前储蓄 + D/g)  →  n = ln(x)/ln(1+g)
//     g=0 时退化为线性  n = (目标 − 当前储蓄) / D
//   确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:fire:v1";
// FIRE 资金目标 = 年支出 / 安全提取率
export function fireTarget(annualExpense, safeWithdrawalRate) {
  const e = Number(annualExpense), swr = Number(safeWithdrawalRate);
  if (!Number.isFinite(e) || !Number.isFinite(swr) || swr <= 0) return 0;
  return e / swr;
}
// 每年新增储蓄 = 储蓄率 × 年支出
export function annualSavings(annualExpense, savingsRate) {
  const e = Number(annualExpense), s = Number(savingsRate);
  if (!Number.isFinite(e) || !Number.isFinite(s)) return 0;
  return Math.abs(e * s);
}
// 达到 FIRE 所需年数（闭式解）
export function yearsToFire(currentSavings, annualExpense, savingsRate, realGrowth, safeWithdrawalRate) {
  const c = Number(currentSavings), e = Number(annualExpense);
  const s = Number(savingsRate), g = Number(realGrowth), swr = Number(safeWithdrawalRate);
  if (![c, e, s, g, swr].every(Number.isFinite) || swr <= 0 || e < 0 || c < 0) return null;
  const target = fireTarget(e, swr);
  const d = annualSavings(e, s);
  if (c >= target) return 0;
  if (d <= 0) {
    if (g <= 0) return null; // 既无新增储蓄、增长又不足 → 永远达不到
    const x = target / c;
    if (c <= 0) return null;
    return Math.log(x) / Math.log(1 + g);
  }
  if (g === 0) return (target - c) / d;
  const dg = d / g;
  const x = (target + dg) / (c + dg);
  if (x <= 0) return null;
  const n = Math.log(x) / Math.log(1 + g);
  return Number.isFinite(n) ? n : null;
}
// 年数分级
export function fireBand(years) {
  const y = Number(years);
  if (!Number.isFinite(y)) return "invalid";
  if (y <= 0) return "now";
  if (y < 10) return "near";
  if (y < 20) return "moderate";
  if (y < 30) return "far";
  return "very-far";
}
// 综合视图
export function fireSummary(inputs = {}) {
  const { annualExpense, safeWithdrawalRate, currentSavings, savingsRate, realGrowth } = inputs;
  const target = fireTarget(annualExpense, safeWithdrawalRate);
  const years = yearsToFire(currentSavings, annualExpense, savingsRate, realGrowth, safeWithdrawalRate);
  const valid = target > 0 && years !== null && years >= 0;
  return {
    fireTarget: target,
    annualSavings: annualSavings(annualExpense, savingsRate),
    years,
    band: fireBand(years),
    valid,
  };
}
// 预设
export const FIRE_PRESETS = {
  fast: { id: "fast", label: "快速 FIRE", annualExpense: 40000, safeWithdrawalRate: 0.04, currentSavings: 200000, savingsRate: 0.4, realGrowth: 0.05 },
  typical: { id: "typical", label: "典型", annualExpense: 60000, safeWithdrawalRate: 0.04, currentSavings: 100000, savingsRate: 0.25, realGrowth: 0.05 },
  slow: { id: "slow", label: "缓慢 3%提取", annualExpense: 80000, safeWithdrawalRate: 0.03, currentSavings: 50000, savingsRate: 0.15, realGrowth: 0.04 },
  aggressive: { id: "aggressive", label: "激进 50%储蓄", annualExpense: 50000, safeWithdrawalRate: 0.03, currentSavings: 300000, savingsRate: 0.5, realGrowth: 0.06 },
  coast: { id: "coast", label: "Coast 0 当前", annualExpense: 100000, safeWithdrawalRate: 0.04, currentSavings: 0, savingsRate: 0.1, realGrowth: 0.05 },
};