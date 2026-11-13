// lib/continuousCompound.js — 连续复利（纯函数）
//
// 概念：
//   连续复利终值 FV = P · e^(r·t)
//   倍增倍数 = e^(r·t)
//   期间有效利率 = e^(r·t) − 1
//   连续有效年利率 = e^r − 1
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:continuousCompound:v1";
// 倍增倍数 = e^(r·t)
export function continuousMultiplier(annualRate, years) {
  const r = Number(annualRate), t = Number(years);
  if (!Number.isFinite(r) || !Number.isFinite(t)) return 0;
  return Math.exp(r * t);
}
// 连续复利终值 FV = P · e^(r·t)
export function continuousFV(principal, annualRate, years) {
  const p = Number(principal), mult = continuousMultiplier(annualRate, years);
  if (!Number.isFinite(p) || !Number.isFinite(mult)) return 0;
  return p * mult;
}
// 连续有效年利率 = e^r − 1
export function continuousEAR(annualRate) {
  const r = Number(annualRate);
  if (!Number.isFinite(r)) return 0;
  return Math.exp(r) - 1;
}
// 倍增倍数分级
export function continuousBand(multiplier) {
  const m = Number(multiplier);
  if (!Number.isFinite(m)) return "invalid";
  if (m <= 1) return "flat";
  if (m < 2) return "growth";
  if (m < 4) return "strong";
  return "exponential";
}
// 综合视图
export function continuousSummary(inputs = {}) {
  const { principal, annualRate, years } = inputs;
  const p = Number(principal), r = Number(annualRate), t = Number(years);
  const valid = Number.isFinite(p) && Number.isFinite(r) && Number.isFinite(t) && p >= 0;
  const mult = valid ? continuousMultiplier(r, t) : 0;
  const fv = valid ? continuousFV(p, r, t) : 0;
  return {
    principal: p,
    annualRate: r,
    years: t,
    multiplier: mult,
    futureValue: fv,
    interest: valid ? fv - p : 0,
    effectiveRate: valid ? mult - 1 : 0,
    ear: continuousEAR(r),
    band: continuousBand(mult),
    valid,
  };
}
// 预设
export const CONTINUOUS_PRESETS = {
  modest: { id: "modest", label: "稳健 5%/10y", principal: 10000, annualRate: 0.05, years: 10 },
  growth: { id: "growth", label: "成长 8%/20y", principal: 10000, annualRate: 0.08, years: 20 },
  long: { id: "long", label: "长线 7%/30y", principal: 50000, annualRate: 0.07, years: 30 },
  high: { id: "high", label: "高增 15%/15y", principal: 10000, annualRate: 0.15, years: 15 },
  low: { id: "low", label: "低增 2%/5y", principal: 10000, annualRate: 0.02, years: 5 },
};