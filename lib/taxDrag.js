// lib/taxDrag.js — 税后复利 / 税收拖累（After-tax compounding / tax drag，纯函数）
//
// 简化模型：每年收益按税率 t 计税（t 作用于收益），税后年化 r' = r·(1−t)。
//   名义终值   FV_nom = P·(1+r)^n
//   税后终值   FV_tax = P·(1+r')^n
//   税收拖累   taxDrag = (FV_nom − FV_tax) / FV_nom
// 确定性、零外部依赖。教育性参考，非税务建议。

export const STORAGE_KEY = "weacond:taxDrag:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 税后年化收益率 = r·(1−t)。
export function afterTaxRate(rate, taxRate) {
  return num(rate) * (1 - num(taxRate));
}

// 名义终值 P·(1+r)^n。
export function nominalFuture(principal, rate, years) {
  const P = num(principal);
  const r = num(rate);
  const n = num(years);
  return P * Math.pow(1 + r, n);
}

// 税后终值 P·(1+r')^n。
export function afterTaxFuture(principal, rate, taxRate, years) {
  const P = num(principal);
  const r = afterTaxRate(rate, taxRate);
  const n = num(years);
  return P * Math.pow(1 + r, n);
}

// 税收拖累 = (名义终值 − 税后终值) / 名义终值。
export function taxDrag(nominalFV, afterTaxFV) {
  const N = num(nominalFV);
  const T = num(afterTaxFV);
  if (N <= 0) return 0;
  return (N - T) / N;
}

// 拖累分级。
export function dragBand(drag) {
  const d = num(drag);
  if (d <= 0) return "none";
  if (d < 0.05) return "low";
  if (d < 0.15) return "moderate";
  return "high";
}

// 综合视图。
export function taxDragSummary(inputs = {}) {
  const { principal = 10000, rate = 0, taxRate = 0, years } = inputs;
  const P = num(principal);
  const r = num(rate);
  const t = num(taxRate);
  const n = num(years);
  const valid = P > 0 && n >= 0 && t >= 0 && t <= 1;
  if (!valid) return { valid: false };
  const nom = nominalFuture(P, r, n);
  const aft = afterTaxFuture(P, r, t, n);
  const drag = taxDrag(nom, aft);
  return {
    principal: P,
    rate: r,
    taxRate: t,
    years: n,
    afterTaxRate: afterTaxRate(r, t),
    nominalFuture: nom,
    afterTaxFuture: aft,
    taxDrag: drag,
    band: dragBand(drag),
    valid: true,
  };
}

// 预设：不同税率/周期情景。
export const TAXDRAG_PRESETS = {
  noTax:   { id: "noTax",   label: "免税",     principal: 10000, rate: 0.1,  taxRate: 0,    years: 10 },
  lowTax:  { id: "lowTax",  label: "低税 5%",  principal: 10000, rate: 0.1,  taxRate: 0.05, years: 10 },
  midTax:  { id: "midTax",  label: "中税 15%", principal: 10000, rate: 0.1,  taxRate: 0.15, years: 10 },
  highTax: { id: "highTax", label: "高税 30%", principal: 10000, rate: 0.1,  taxRate: 0.3,  years: 10 },
  longRun: { id: "longRun", label: "长周期 30Y",principal: 10000, rate: 0.08, taxRate: 0.15, years: 30 },
};
export { num };
