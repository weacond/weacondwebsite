// lib/riskBudget.js — 风险预算 / VaR 仓位规模（纯函数）
//
// 概念：给定账户规模、单笔最大风险比例、每单位风险（如 VaR），
//   风险金额 = 账户 × 风险比例
//   最大仓位 = 风险金额 / 每单位风险
//   名义价值 = 最大仓位 × 价格
// 多策略：总风险预算 / N 策略 = 每策略风险
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:riskBudget:v1";
// 风险金额 = 账户 × 风险比例
export function riskAmount(account, riskPct) {
  const a = Number(account), r = Number(riskPct);
  if (!Number.isFinite(a) || !Number.isFinite(r) || r <= 0) return 0;
  return a * r;
}
// 最大仓位（单位）= 风险金额 / 每单位风险
export function maxUnits(riskAmt, varPerUnit) {
  const amt = Number(riskAmt), v = Number(varPerUnit);
  if (!Number.isFinite(amt) || !Number.isFinite(v) || v <= 0) return 0;
  return amt / v;
}
// 名义价值 = 单位 × 价格
export function positionNotional(units, price) {
  const u = Number(units), p = Number(price);
  if (!Number.isFinite(u) || !Number.isFinite(p)) return 0;
  return u * p;
}
// 仓位占账户比例 = 名义价值 / 账户
export function positionPct(notional, account) {
  const n = Number(notional), a = Number(account);
  if (!Number.isFinite(n) || !Number.isFinite(a) || a === 0) return 0;
  return n / a;
}
// 多策略风险分配：总风险 / N 策略
export function perStrategyRisk(totalRisk, numStrategies) {
  const t = Number(totalRisk), n = Number(numStrategies);
  if (!Number.isFinite(t) || !Number.isFinite(n) || n <= 0) return 0;
  return t / n;
}
// 风险比例分级
export function riskBudgetBand(riskPct) {
  const r = Number(riskPct);
  if (!Number.isFinite(r)) return "invalid";
  if (r <= 0) return "zero";
  if (r < 0.01) return "conservative";
  if (r < 0.02) return "moderate";
  if (r < 0.05) return "aggressive";
  return "over-leveraged";
}
// 综合视图
export function riskBudgetSummary(inputs = {}) {
  const { account, riskPct, varPerUnit, price, numStrategies } = inputs;
  const r = Number(riskPct);
  if (!Number.isFinite(r) || r <= 0) return { valid: false };
  const ra = riskAmount(account, r);
  const units = maxUnits(ra, varPerUnit);
  const notional = positionNotional(units, price);
  const pct = positionPct(notional, account);
  const perStrat = numStrategies > 1 ? perStrategyRisk(ra, numStrategies) : null;
  return {
    riskAmount: ra,
    units,
    notional,
    positionPct: pct,
    perStrategy: perStrat,
    band: riskBudgetBand(r),
    valid: true,
  };
}
// 预设
export const RISK_BUDGET_PRESETS = {
  conservative: { id: "conservative", label: "保守 0.5%", account: 100000, riskPct: 0.005, varPerUnit: 10, price: 100 },
  moderate: { id: "moderate", label: "中等 1%", account: 100000, riskPct: 0.01, varPerUnit: 10, price: 100 },
  aggressive: { id: "aggressive", label: "激进 2%", account: 100000, riskPct: 0.02, varPerUnit: 10, price: 100 },
  multiStrat: { id: "multiStrat", label: "多策略 1%", account: 100000, riskPct: 0.01, varPerUnit: 5, price: 50, numStrategies: 4 },
  tiny: { id: "tiny", label: "小账户 1%", account: 10000, riskPct: 0.01, varPerUnit: 2, price: 20 },
};
