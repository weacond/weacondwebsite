// lib/twrr.js — 时间加权收益率 TWRR（纯函数）
//
// 概念：
//   TWRR 几何链接各子期收益，对现金流中性：
//     总收益   = Π(1 + r_i) − 1
//     累计乘数 = Π(1 + r_i)
//     年化几何 = [Π(1+r_i)]^(年/期数) − 1
//   算术年化 − 几何年化 = 波动拖累（volatility drag）
//   确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:twrr:v1";
// 解析逗号/空白分隔的收益序列为数字数组
export function parseReturns(raw) {
  if (Array.isArray(raw)) return raw.map(Number).filter((x) => Number.isFinite(x));
  if (typeof raw === "string") {
    return raw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(Number)
      .filter((x) => Number.isFinite(x));
  }
  return [];
}
// 累计乘数 = Π(1+r_i)
export function growthMultiple(returns) {
  const arr = parseReturns(returns);
  if (arr.length === 0) return 1;
  return arr.reduce((acc, r) => acc * (1 + r), 1);
}
// 总时间加权收益 = Π(1+r_i) − 1
export function timeWeightedReturn(returns) {
  const arr = parseReturns(returns);
  if (arr.length === 0) return 0;
  return arr.reduce((acc, r) => acc * (1 + r), 1) - 1;
}
// 年化几何收益 = [Π(1+r_i)]^(periodsPerYear/期数) − 1
export function annualizedTWRR(returns, periodsPerYear = 252) {
  const arr = parseReturns(returns);
  const n = arr.length;
  if (n === 0) return 0;
  const ppy = Number(periodsPerYear) || 1;
  const product = arr.reduce((acc, r) => acc * (1 + r), 1);
  if (product <= 0) return null; // 累计亏损超过 100%
  return Math.pow(product, ppy / n) - 1;
}
// 算术年化（用于对比）= 均值 × 每年期数
export function annualizedArithmetic(returns, periodsPerYear = 252) {
  const arr = parseReturns(returns);
  const n = arr.length;
  if (n === 0) return 0;
  const ppy = Number(periodsPerYear) || 1;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  return mean * ppy;
}
// 波动拖累（每期）= 算术平均收益 − 几何平均收益，恒 ≥ 0（AM ≥ GM）
export function volatilityDrag(returns) {
  const arr = parseReturns(returns);
  const n = arr.length;
  if (n < 2) return 0;
  const product = arr.reduce((acc, r) => acc * (1 + r), 1);
  if (product <= 0) return null;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const geoReturn = Math.pow(product, 1 / n) - 1;
  return mean - geoReturn;
}
// 年化分级
export function twrrBand(annualized) {
  const a = Number(annualized);
  if (!Number.isFinite(a)) return "invalid";
  if (a < 0) return "negative";
  if (a < 0.05) return "low";
  if (a < 0.1) return "moderate";
  if (a < 0.2) return "high";
  return "very-high";
}
// 综合视图
export function twrrSummary(inputs = {}) {
  const { returns, periodsPerYear } = inputs;
  const arr = parseReturns(returns);
  const n = arr.length;
  const total = timeWeightedReturn(returns);
  const annual = annualizedTWRR(returns, periodsPerYear);
  const valid = n >= 1 && annual !== null;
  return {
    count: n,
    total,
    growthMultiple: growthMultiple(returns),
    annualized: annual,
    drag: n >= 2 ? volatilityDrag(returns) : null,
    band: twrrBand(annual),
    valid,
  };
}
// 预设（每期收益为小数，如 0.05 = 5%）
export const TWRR_PRESETS = {
  steady: { id: "steady", label: "稳健月 +1%", returns: "0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01", periodsPerYear: 12 },
  volatile: { id: "volatile", label: "震荡 ±3%", returns: "0.03,-0.03,0.03,-0.03,0.03,-0.03,0.03,-0.03,0.03,-0.03", periodsPerYear: 12 },
  bullRun: { id: "bullRun", label: "牛市 6个月", returns: "0.08,0.12,-0.05,0.1,0.15,0.07", periodsPerYear: 12 },
  daily: { id: "daily", label: "日收益 0.1%", returns: "0.001,0.001,0.001,0.001,0.001", periodsPerYear: 252 },
  losses: { id: "losses", label: "连续亏损", returns: "-0.05,-0.03,-0.08,-0.02", periodsPerYear: 12 },
};