// lib/ear.js — 有效年利率 EAR / APY（纯函数）
//
// 概念：
//   有效年利率 EAR = (1 + r/m)^m − 1，m 为每年复利次数
//   连续复利有效利率 = e^r − 1
//   年化收益比（EAR 与连续差）= EAR − 连续有效利率（衡量复利频率带来的差异）
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:ear:v1";
// 有效年利率 EAR = (1 + r/m)^m − 1；m≤0 退化为单利 EAR = r
// 其中 r 为年名义利率，m 为每年复利次数，期利率 = r/m
export function effectiveAnnualRate(nominal, periods = 1) {
  const r = Number(nominal), m = Number(periods);
  if (!Number.isFinite(r) || !Number.isFinite(m)) return 0;
  if (m <= 0) return r;
  return Math.pow(1 + r / m, m) - 1;
}
// 连续复利有效利率 = e^r − 1
export function continuousEAR(nominal) {
  const r = Number(nominal);
  if (!Number.isFinite(r)) return 0;
  return Math.exp(r) - 1;
}
// 年化收益比（EAR 与连续复利的差异）
export function compoundingGap(nominal, periods = 1) {
  const r = Number(nominal), m = Number(periods);
  if (!Number.isFinite(r) || !Number.isFinite(m)) return 0;
  return continuousEAR(r) - effectiveAnnualRate(r, m);
}
// 有效利率分级
export function earBand(ear) {
  const e = Number(ear);
  if (!Number.isFinite(e)) return "invalid";
  if (e <= 0) return "none";
  if (e < 0.03) return "low";
  if (e < 0.06) return "moderate";
  if (e < 0.1) return "high";
  return "very-high";
}
// 综合视图
export function earSummary(inputs = {}) {
  const { nominal, periods } = inputs;
  const r = Number(nominal);
  const m = Number(periods);
  const valid = Number.isFinite(r) && Number.isFinite(m) && m >= 1;
  const ear = valid ? effectiveAnnualRate(r, m) : 0;
  const cont = Number.isFinite(r) ? continuousEAR(r) : 0;
  return {
    nominal: r,
    periods: m,
    ear,
    continuousEar: cont,
    gap: valid ? compoundingGap(r, m) : 0,
    band: earBand(ear),
    valid,
  };
}
// 预设
export const EAR_PRESETS = {
  annual: { id: "annual", label: "按年 12%", nominal: 0.12, periods: 1 },
  semiannual: { id: "semiannual", label: "半年 12%", nominal: 0.12, periods: 2 },
  quarterly: { id: "quarterly", label: "按季 12%", nominal: 0.12, periods: 4 },
  monthly: { id: "monthly", label: "按月 6%", nominal: 0.06, periods: 12 },
  daily: { id: "daily", label: "按日 8%", nominal: 0.08, periods: 365 },
};