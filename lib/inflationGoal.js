// lib/inflationGoal.js — 含通胀的定投目标（纯函数）
//
// 概念：
//   未来名义目标 = 实际目标 × (1+通胀)^年限
//   名义终值 = 本金×(1+r)^n + 月投×[((1+rm)^N−1)/rm]，rm=(1+r)^(1/12)−1，N=年限×12
//   实际终值 = 名义终值 / (1+通胀)^年限
//   求月投：monthly = (未来名义目标 − 本金×(1+r)^n)×rm / ((1+rm)^N−1)
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:inflationGoal:v1";
function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}
// 名义终值
export function nominalFutureValue(principal, monthly, annualRate, years) {
  const P = num(principal), M = num(monthly), r = num(annualRate), n = Math.max(0, Math.floor(num(years) * 12));
  const rm = Math.pow(1 + r, 1 / 12) - 1;
  const growth = Math.pow(1 + rm, n);
  const monthlyGrowth = Math.abs(rm) < 1e-12 ? M * n : M * ((growth - 1) / rm);
  return P * growth + monthlyGrowth;
}
// 实际终值 = 名义终值 / (1+通胀)^年限
export function realFutureValue(nominalFV, inflation, years) {
  const fv = Number(nominalFV), I = num(inflation), y = num(years);
  if (!Number.isFinite(fv) || 1 + I <= 0) return 0;
  return fv / Math.pow(1 + I, y);
}
// 求达成「实际目标」所需月投
export function requiredMonthly(principal, annualRate, inflation, years, realGoal) {
  const P = num(principal), r = num(annualRate), I = num(inflation), y = num(years), G = num(realGoal);
  if (1 + I <= 0 || y <= 0) return 0;
  const n = Math.floor(y * 12);
  const rm = Math.pow(1 + r, 1 / 12) - 1;
  const futureNominalGoal = G * Math.pow(1 + I, y);
  const principalGrowth = P * Math.pow(1 + rm, n);
  const denom = Math.abs(rm) < 1e-12 ? n : Math.pow(1 + rm, n) - 1;
  if (denom <= 0) return 0;
  const monthly = (futureNominalGoal - principalGrowth) / denom;
  return monthly;
}
// 通胀分级
export function inflationBand(inflation) {
  const I = Number(inflation);
  if (!Number.isFinite(I)) return "invalid";
  if (I < 0) return "deflation";
  if (I < 0.02) return "low";
  if (I < 0.04) return "moderate";
  if (I < 0.08) return "high";
  return "very-high";
}
// 综合视图
export function inflationGoalSummary(inputs = {}) {
  const { principal, monthly, annualRate, inflation, years, realGoal } = inputs;
  const I = num(inflation);
  if (1 + I <= 0) return { valid: false };
  const nominalFV = nominalFutureValue(principal, monthly, annualRate, years);
  const realFV = realFutureValue(nominalFV, I, years);
  const need = requiredMonthly(principal, annualRate, I, years, realGoal || 0);
  return {
    nominalFV,
    realFV,
    inflationBand: inflationBand(I),
    requiredMonthly: need,
    monthlyShortfall: need - num(monthly),
    valid: true,
  };
}
// 预设
export const INFLATION_GOAL_PRESETS = {
  retirement: { id: "retirement", label: "退休 低通胀", principal: 100000, monthly: 1000, annualRate: 0.07, inflation: 0.025, years: 30, realGoal: 1000000 },
  highInflation: { id: "highInflation", label: "高通胀", principal: 50000, monthly: 800, annualRate: 0.05, inflation: 0.07, years: 20, realGoal: 500000 },
  homeDown: { id: "homeDown", label: "首付目标", principal: 10000, monthly: 2000, annualRate: 0.04, inflation: 0.03, years: 10, realGoal: 100000 },
  education: { id: "education", label: "教育基金", principal: 20000, monthly: 500, annualRate: 0.06, inflation: 0.03, years: 15, realGoal: 200000 },
  erode: { id: "erode", label: "通胀侵蚀", principal: 100000, monthly: 0, annualRate: 0.03, inflation: 0.05, years: 30, realGoal: 100000 },
};
export { num };