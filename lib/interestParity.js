// lib/interestParity.js — 利率平价 / 远期汇率（纯函数）
//
// 概念（covered interest parity, CIP）：
//   理论远期 F = 即期 S × (1 + r_d)^t / (1 + r_f)^t
//   远期升贴水（carry）= (1 + r_d)^t / (1 + r_f)^t − 1 ≈ r_d − r_f
//   本币利率高于外币 → 本币远期贴水（F < S）
//   市场远期与理论远期之差 = 套利基差 mispricing
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:interestParity:v1";
// 理论远期汇率 F = S × (1+r_d)^t / (1+r_f)^t
export function forwardRate(spot, domRate, forRate, years = 1) {
  const s = Number(spot), d = Number(domRate), f = Number(forRate), y = Number(years);
  if (![s, d, f, y].every(Number.isFinite)) return 0;
  if (1 + d === 0 || 1 + f === 0) return 0;
  return (s * Math.pow(1 + d, y)) / Math.pow(1 + f, y);
}
// 远期升贴水（carry 收益）= (1+r_d)^t/(1+r_f)^t − 1
export function forwardPremium(domRate, forRate, years = 1) {
  const d = Number(domRate), f = Number(forRate), y = Number(years);
  if (![d, f, y].every(Number.isFinite)) return 0;
  if (1 + f === 0) return 0;
  return Math.pow(1 + d, y) / Math.pow(1 + f, y) - 1;
}
// 由远期反推本币利率（给定 F,S,r_f,t 求 r_d）
export function impliedDomesticRate(spot, forward, forRate, years = 1) {
  const s = Number(spot), F = Number(forward), f = Number(forRate), y = Number(years);
  if (![s, F, f, y].every(Number.isFinite) || s <= 0 || 1 + f <= 0) return null;
  const base = (F / s) * Math.pow(1 + f, y); // (1+r_d)^y
  const rd = y === 0 ? 0 : Math.pow(base, 1 / y) - 1;
  return Number.isFinite(rd) ? rd : null;
}
// 市场远期 vs 理论远期 基差 = 市场/理论 − 1
export function parityMispricing(theoretical, market) {
  const t = Number(theoretical), m = Number(market);
  if (![t, m].every(Number.isFinite) || t === 0) return 0;
  return m / t - 1;
}
// 升贴水分级
export function parityBand(premium) {
  const p = Number(premium);
  if (!Number.isFinite(p)) return "invalid";
  const a = Math.abs(p);
  if (a < 0.005) return "flat";
  if (a < 0.02) return "small";
  if (a < 0.05) return "moderate";
  return "large";
}
// 综合视图
export function interestParitySummary(inputs = {}) {
  const { spot, domRatePct, forRatePct, years, marketForward } = inputs;
  const d = Number(domRatePct) / 100, f = Number(forRatePct) / 100, y = Number(years);
  const valid =
    Number.isFinite(spot) && spot > 0 &&
    Number.isFinite(d) && Number.isFinite(f) &&
    Number.isFinite(y) && y >= 0;
  const forward = valid ? forwardRate(spot, d, f, y) : 0;
  const premium = valid ? forwardPremium(d, f, y) : 0;
  const mispricing =
    valid && Number.isFinite(marketForward) && marketForward > 0
      ? parityMispricing(forward, marketForward)
      : 0;
  return {
    spot: Number(spot) || 0,
    domRate: d,
    forRate: f,
    years: y,
    forward,
    premium,
    mispricing,
    band: parityBand(premium),
    valid,
  };
}
// 预设
export const INTEREST_PARITY_PRESETS = {
  domHigher: { id: "domHigher", label: "本币 5% vs 外币 1% · 1y", spot: 1, domRatePct: 5, forRatePct: 1, years: 1 },
  domLower: { id: "domLower", label: "本币 1% vs 外币 5% · 1y", spot: 1, domRatePct: 1, forRatePct: 5, years: 1 },
  equal: { id: "equal", label: "利率相等 3% · 2y", spot: 1.1, domRatePct: 3, forRatePct: 3, years: 2 },
  longTerm: { id: "longTerm", label: "5% vs 2% · 5y", spot: 1, domRatePct: 5, forRatePct: 2, years: 5 },
  halfYear: { id: "halfYear", label: "6% vs 3% · 0.5y", spot: 1, domRatePct: 6, forRatePct: 3, years: 0.5 },
};