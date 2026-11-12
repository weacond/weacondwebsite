// lib/realAfterTax.js — 税后实际复利（Real after-tax compound，纯函数）
//
// 结合 taxDrag + realReturn 的复合公式：
// FV_nominal = PV × (1+r)^n
// FV_afterTax = FV_nominal × (1 − taxRate)
// FV_real = FV_afterTax / (1+inflation)^n
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:realAfterTax:v1";
function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}
// 税后实际年化 = nominal × (1−tax) − inflation（线性近似）。
export function afterTaxRealRate(nominal, taxRate, inflation) {
  const r = num(nominal);
  const t = num(taxRate);
  const inf = num(inflation);
  return r * (1 - t) - inf;
}
// 名义终值 = PV × (1+r)^n。
export function nominalFV(pv, rate, years) {
  const P = num(pv);
  const r = num(rate);
  const n = num(years);
  if (P <= 0 || n <= 0) return 0;
  return P * Math.pow(1 + r, n);
}
// 税后终值 = 名义终值 × (1−taxRate)。
export function afterTaxFV(pv, rate, taxRate, years) {
  const fv = nominalFV(pv, rate, years);
  return fv * (1 - num(taxRate));
}
// 实际终值 = 税后终值 / (1+inflation)^n。
export function realFV(pv, rate, taxRate, inflation, years) {
  const atfv = afterTaxFV(pv, rate, taxRate, years);
  const inf = num(inflation);
  const n = num(years);
  if (inf <= 0) return atfv;
  return atfv / Math.pow(1 + inf, n);
}
// 总损耗 = 1 − realFV / nominalFV。
export function totalDrag(pv, rate, taxRate, inflation, years) {
  const nom = nominalFV(pv, rate, years);
  if (nom <= 0) return 0;
  const real = realFV(pv, rate, taxRate, inflation, years);
  return 1 - real / nom;
}
// 实际年化分级。
export function realAfterTaxBand(realRate) {
  const r = num(realRate);
  if (r <= 0) return "negative";
  if (r < 0.02) return "low";
  if (r < 0.04) return "moderate";
  if (r < 0.06) return "good";
  return "excellent";
}
// 综合视图。
export function realAfterTaxSummary(inputs = {}) {
  const { pv = 100000, rate = 0.08, taxRate = 0.15, inflation = 0.03, years } = inputs;
  const P = num(pv);
  const r = num(rate);
  const t = num(taxRate);
  const inf = num(inflation);
  const n = num(years);
  const valid = P > 0 && n > 0 && r > -1 && t >= 0 && t <= 1 && inf >= 0;
  if (!valid) return { valid: false };
  const nom = nominalFV(P, r, n);
  const atfv = afterTaxFV(P, r, t, n);
  const real = realFV(P, r, t, inf, n);
  const drag = totalDrag(P, r, t, inf, n);
  const realRate = afterTaxRealRate(r, t, inf);
  return {
    pv: P, rate: r, taxRate: t, inflation: inf, years: n,
    nominalFV: nom,
    afterTaxFV: atfv,
    realFV: real,
    totalDrag: drag,
    afterTaxRealRate: realRate,
    band: realAfterTaxBand(realRate),
    valid: true,
  };
}
// 预设：不同税务/通胀场景。
export const REAL_AFTER_TAX_PRESETS = {
  standard: { id: "standard", label: "标准 8%/15%/3%", pv: 100000, rate: 0.08, taxRate: 0.15, inflation: 0.03, years: 20 },
  highTax: { id: "highTax", label: "高税 30%", pv: 100000, rate: 0.08, taxRate: 0.30, inflation: 0.03, years: 20 },
  highInfl: { id: "highInfl", label: "高通胀 6%", pv: 100000, rate: 0.08, taxRate: 0.15, inflation: 0.06, years: 20 },
  taxFree: { id: "taxFree", label: "免税", pv: 100000, rate: 0.08, taxRate: 0, inflation: 0.03, years: 20 },
  shortTerm: { id: "shortTerm", label: "短期 5Y", pv: 50000, rate: 0.06, taxRate: 0.20, inflation: 0.04, years: 5 },
};
export { num };
