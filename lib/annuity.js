// lib/annuity.js — 年金给付 / 退休规划（Annuity payout / retirement planning，纯函数）
//
// 给定现值 PV、年化利率 r、年数 n：
// 年金给付额 PMT = PV·r / (1 − (1+r)^(−n))
// 所需储蓄 = PMT·(1 − (1+r)^(−n)) / r
// 给付年数（给定年给付额）= ln(PV·r/PMT + 1) / ln(1+r)
// 充足率 = PV / 所需储蓄
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:annuity:v1";
function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}
// 年金给付额 PMT = PV·r / (1 − (1+r)^(−n))。r=0 时退化为 PV/n。
export function annuityPayment(presentValue, rate, years) {
  const PV = num(presentValue);
  const r = num(rate);
  const n = num(years);
  if (n <= 0) return 0;
  if (r <= 0) return PV / n;
  const denom = 1 - Math.pow(1 + r, -n);
  if (denom <= 0) return 0;
  return (PV * r) / denom;
}
// 所需储蓄 = PMT·(1 − (1+r)^(−n)) / r。
export function savingsRequired(annualPayout, rate, years) {
  const P = num(annualPayout);
  const r = num(rate);
  const n = num(years);
  if (n <= 0) return 0;
  if (r <= 0) return P * n;
  const factor = (1 - Math.pow(1 + r, -n)) / r;
  if (factor <= 0) return 0;
  return P * factor;
}
// 给付年数（给定年给付额 PMT）= −ln(1 − PV·r/PMT) / ln(1+r)。
export function payoutYears(presentValue, rate, annualPayout) {
  const PV = num(presentValue);
  const r = num(rate);
  const P = num(annualPayout);
  if (P <= 0) return 0;
  if (r <= 0) return PV / P;
  const ratio = (PV * r) / P;
  if (ratio <= 0 || ratio >= 1) return 0; // ratio≥1 意味着永不到期
  return -Math.log(1 - ratio) / Math.log(1 + r);
}
// 充足率 = PV / 所需储蓄。
export function sufficiencyRatio(presentValue, rate, annualPayout, years) {
  const req = savingsRequired(annualPayout, rate, years);
  if (req <= 0) return 0;
  return num(presentValue) / req;
}
// 充足率分级。
export function annuityBand(ratio) {
  const r = num(ratio);
  if (r <= 0) return "insufficient";
  if (r < 0.8) return "tight";
  if (r < 1.2) return "adequate";
  return "surplus";
}
// 综合视图。
export function annuitySummary(inputs = {}) {
  const { presentValue = 100000, rate = 0.04, years } = inputs;
  const PV = num(presentValue);
  const r = num(rate);
  const n = num(years);
  const valid = PV > 0 && r > -1 && n > 0;
  if (!valid) return { valid: false };
  const pmt = annuityPayment(PV, r, n);
  const suff = sufficiencyRatio(PV, r, pmt, n); // = 1 by construction
  return {
    presentValue: PV,
    rate: r,
    years: n,
    annualPayment: pmt,
    totalPaid: pmt * n,
    interestPortion: pmt * n - PV,
    sufficiencyRatio: 1,
    band: annuityBand(suff),
    valid: true,
  };
}
// 预设：不同退休情景。
export const ANNUITY_PRESETS = {
  standard: { id: "standard", label: "标准 4%", presentValue: 100000, rate: 0.04, years: 20 },
  lowRate: { id: "lowRate", label: "低利率 2%", presentValue: 100000, rate: 0.02, years: 25 },
  long: { id: "long", label: "长期 30Y", presentValue: 500000, rate: 0.05, years: 30 },
  short: { id: "short", label: "短期 10Y", presentValue: 50000, rate: 0.03, years: 10 },
  highReturn: { id: "highReturn", label: "高收益 7%", presentValue: 200000, rate: 0.07, years: 15 },
};
export { num };
