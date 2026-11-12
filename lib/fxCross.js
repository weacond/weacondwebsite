// lib/fxCross.js — FX 交叉汇率 / 货币换算（Cross-rate / currency conversion，纯函数）
//
// 交叉汇率：已知 A/B 与 B/C（共享中间货币 B），A/C = (A/B)/(B/C)。
// 货币换算：amount_A × rate_AC = amount_C。
// 倒数汇率：1/rate（买/卖、报价/反报价）。
// 交叉对点值：pipValue = pipSize × notional / crossRate。
// 确定性、零外部依赖。教育性参考，非交易建议。
export const STORAGE_KEY = "weacond:fxCross:v1";
function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}
// 交叉汇率：A/C = (A/B)/(B/C)，B 为中间货币。
export function crossRate(rateAB, rateBC) {
  const A = num(rateAB);
  const B = num(rateBC);
  if (B <= 0) return 0;
  return A / B;
}
// 货币换算：amount × rate。
export function convert(amount, rate) {
  return num(amount) * num(rate);
}
// 倒数汇率（反报价）。
export function invertedRate(rate) {
  const r = num(rate);
  if (r <= 0) return 0;
  return 1 / r;
}
// 交叉对每点价值 = pipSize × notional / crossRate。
export function pipValueCross(pipSize, notional, rate) {
  const P = num(pipSize);
  const N = num(notional);
  const R = num(rate);
  if (R <= 0) return 0;
  return (P * N) / R;
}
// 点值分级（按 每点价值/100000 单位）。
export function crossBand(pipValue) {
  const v = num(pipValue);
  if (v <= 0) return "none";
  if (v < 5) return "low";
  if (v < 10) return "moderate";
  return "high";
}
// 综合视图。
export function fxCrossSummary(inputs = {}) {
  const { rateAB = 1.085, rateBC = 1.27, amount = 1000, pipSize = 0.0001, notional = 100000 } = inputs;
  const A = num(rateAB);
  const B = num(rateBC);
  const amt = num(amount);
  const P = num(pipSize);
  const N = num(notional);
  const valid = A > 0 && B > 0 && P > 0 && N > 0;
  if (!valid) return { valid: false };
  const xrate = crossRate(A, B);
  const converted = convert(amt, xrate);
  const inv = invertedRate(xrate);
  const pv = pipValueCross(P, N, xrate);
  return {
    rateAB: A,
    rateBC: B,
    amount: amt,
    crossRate: xrate,
    converted,
    invertedRate: inv,
    pipValue: pv,
    band: crossBand(pv),
    valid: true,
  };
}
// 预设：主流交叉对。
export const FXCROSS_PRESETS = {
  eurGbp: { id: "eurGbp", label: "EUR/GBP", rateAB: 1.085, rateBC: 1.27, amount: 1000, pipSize: 0.0001, notional: 100000 },
  eurJpy: { id: "eurJpy", label: "EUR/JPY", rateAB: 157.5, rateBC: 150, amount: 10000, pipSize: 0.01, notional: 100000 },
  gbpJpy: { id: "gbpJpy", label: "GBP/JPY", rateAB: 190.5, rateBC: 150, amount: 10000, pipSize: 0.01, notional: 100000 },
  audUsd: { id: "audUsd", label: "AUD/USD", rateAB: 0.65, rateBC: 0.52, amount: 5000, pipSize: 0.0001, notional: 50000 },
  usdChf: { id: "usdChf", label: "USD/CHF", rateAB: 1.085, rateBC: 1.11, amount: 5000, pipSize: 0.0001, notional: 100000 },
};
export { num };
