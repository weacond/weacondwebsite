// lib/fundingRate.js — 永续合约资金费率成本（纯函数）
//
// 概念：
//   永续合约每 8 小时结算一次资金费，多头/空头一方付给另一方
//   单期成本 = 名义本金 × 资金费率(每期)；N 期总成本 = 名义本金 × 费率 × N
//   年化资金费率 = 单期费率 × 每年期数（默认 3×365 = 1095）
//   费率为负时持有方「收」资金费（成本为负）
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:fundingRate:v1";
// 默认每天期数：每 8 小时一次 → 3
export const DEFAULT_PERIODS_PER_DAY = 3;
// 默认每年期数 = 每天期数 × 365
export const DEFAULT_PERIODS_PER_YEAR = DEFAULT_PERIODS_PER_DAY * 365;
// 单期资金成本 = 名义本金 × 费率（可负）
export function fundingCost(notional, perPeriodRate, periods = 1) {
  const n = Number(notional), r = Number(perPeriodRate), p = Number(periods);
  if (![n, r, p].every(Number.isFinite)) return 0;
  return n * r * p;
}
// 资金成本占名义本金比例 = 费率 × 期数
export function fundingCostFraction(perPeriodRate, periods = 1) {
  const r = Number(perPeriodRate), p = Number(periods);
  if (![r, p].every(Number.isFinite)) return 0;
  return r * p;
}
// 年化资金费率 = 单期费率 × 每年期数
export function annualizedFunding(perPeriodRate, periodsPerYear = DEFAULT_PERIODS_PER_YEAR) {
  const r = Number(perPeriodRate), y = Number(periodsPerYear);
  if (![r, y].every(Number.isFinite)) return 0;
  return r * y;
}
// 资金成本分级（按年化绝对值）
export function fundingBand(annualized) {
  const a = Math.abs(Number(annualized));
  if (!Number.isFinite(a)) return "invalid";
  if (a === 0) return "none";
  if (a < 0.02) return "low";
  if (a < 0.05) return "moderate";
  if (a < 0.1) return "high";
  return "very-high";
}
// 综合视图
export function fundingSummary(inputs = {}) {
  const { notional, fundingRatePct, days, periodsPerDay } = inputs;
  const perPeriod = Number(fundingRatePct) / 100;
  const ppd = Number(periodsPerDay) || DEFAULT_PERIODS_PER_DAY;
  const d = Number(days);
  const periods = d * ppd;
  const valid =
    Number.isFinite(notional) &&
    Number.isFinite(perPeriod) &&
    Number.isFinite(d) && d >= 0 &&
    Number.isFinite(ppd) && ppd > 0;
  const totalCost = valid ? fundingCost(notional, perPeriod, periods) : 0;
  const ann = valid ? annualizedFunding(perPeriod, ppd * 365) : 0;
  return {
    notional: Number(notional) || 0,
    perPeriod,
    periods,
    totalCost,
    costFraction: valid ? fundingCostFraction(perPeriod, periods) : 0,
    annualized: ann,
    band: fundingBand(ann),
    valid,
  };
}
// 预设
export const FUNDING_PRESETS = {
  normalLong: { id: "normalLong", label: "多头 0.01%/8h · 7天", notional: 100000, fundingRatePct: 0.01, days: 7 },
  highFunding: { id: "highFunding", label: "高费 0.05%/8h · 30天", notional: 200000, fundingRatePct: 0.05, days: 30 },
  shortReceives: { id: "shortReceives", label: "空头收 0.01%/8h · 30天", notional: 150000, fundingRatePct: -0.01, days: 30 },
  weekly: { id: "weekly", label: "7天 0.01%/8h", notional: 50000, fundingRatePct: 0.01, days: 7 },
  monthly: { id: "monthly", label: "30天 0.01%/8h", notional: 100000, fundingRatePct: 0.01, days: 30 },
};