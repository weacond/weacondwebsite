// lib/npvCalc.js — 净现值 NPV 计算器（纯函数）
//
// NPV = Σ CF_t / (1+r)^t，t 从 0 起（CF_0 通常为首期流出，负值）
// 折现因子 DF = 1/(1+r)^n
// 永续 PV = CF / r
// 年金 PV = PMT × [1 − (1+r)^(−n)] / r
// 投资回收率 PIR = (Σ CF_in) / (Σ |CF_out|)
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:npvCalc:v1";
// 净现值 NPV = Σ CF_t / (1+r)^t
export function npvCalc(rate, cashflows) {
  const r = Number(rate);
  if (!Number.isFinite(r) || !Array.isArray(cashflows) || cashflows.length === 0) return 0;
  let sum = 0;
  for (let t = 0; t < cashflows.length; t++) {
    const cf = Number(cashflows[t]);
    if (!Number.isFinite(cf)) return 0;
    sum += cf / Math.pow(1 + r, t);
  }
  return sum;
}
// 折现因子 DF = 1/(1+r)^n
export function discountFactor(rate, n) {
  const r = Number(rate), years = Number(n);
  if (!Number.isFinite(r) || !Number.isFinite(years)) return 0;
  return 1 / Math.pow(1 + r, years);
}
// 永续 PV = CF / r
export function perpetuityPV(cashFlow, rate) {
  const cf = Number(cashFlow), r = Number(rate);
  if (!Number.isFinite(cf) || !Number.isFinite(r) || r === 0) return 0;
  return cf / r;
}
// 年金 PV = PMT × [1 − (1+r)^(−n)] / r
export function annuityPV(payment, rate, n) {
  const pmt = Number(payment), r = Number(rate), years = Number(n);
  if (!Number.isFinite(pmt) || !Number.isFinite(r) || !Number.isFinite(years) || years <= 0) return 0;
  if (r === 0) return pmt * years;
  return pmt * (1 - Math.pow(1 + r, -years)) / r;
}
// 投资回收率 PIR = Σ(正 CF) / Σ(|负 CF|)
export function payoffIndex(cashflows) {
  if (!Array.isArray(cashflows) || cashflows.length === 0) return 0;
  let inflow = 0, outflow = 0;
  for (const cf of cashflows) {
    const v = Number(cf);
    if (!Number.isFinite(v)) return 0;
    if (v > 0) inflow += v;
    else outflow += Math.abs(v);
  }
  return outflow > 0 ? inflow / outflow : 0;
}
// NPV 分级
export function npvBand(npv, initialOutlay) {
  const n = Number(npv);
  if (!Number.isFinite(n)) return "invalid";
  if (n < 0) return "reject";
  if (n === 0) return "break-even";
  const outlay = Math.abs(Number(initialOutlay)) || 1;
  const ratio = n / outlay;
  if (ratio < 0.05) return "low";
  if (ratio < 0.15) return "moderate";
  return "good";
}
// 综合视图
export function npvSummary(inputs = {}) {
  const { rate, cashflows } = inputs;
  if (!Array.isArray(cashflows) || cashflows.length < 2) return { valid: false };
  const r = Number(rate);
  if (!Number.isFinite(r)) return { valid: false };
  const result = npvCalc(r, cashflows);
  const initialOutlay = Math.abs(Number(cashflows[0]) || 0);
  const pIR = payoffIndex(cashflows);
  return {
    npv: result,
    initialOutlay,
    payoffIndex: pIR,
    discountFactor1: discountFactor(r, 1),
    band: npvBand(result, initialOutlay),
    valid: true,
  };
}
// 预设
export const NPV_PRESETS = {
  simple: { id: "simple", label: "简单", rate: 0.1, cashflows: [-10000, 5000, 6000, 7000] },
  even: { id: "even", label: "均匀", rate: 0.08, cashflows: [-50000, 15000, 15000, 15000, 15000] },
  frontLoaded: { id: "front", label: "前重", rate: 0.12, cashflows: [-30000, 25000, 10000, 5000] },
  backLoaded: { id: "back", label: "后重", rate: 0.12, cashflows: [-30000, 5000, 10000, 25000] },
  reject: { id: "reject", label: "负 NPV", rate: 0.15, cashflows: [-20000, 5000, 5000, 5000] },
};
