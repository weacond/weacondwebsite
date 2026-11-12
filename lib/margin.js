// lib/margin.js — 杠杆融资成本 / 保证金利息（Leverage financing / margin interest，纯函数）
//
// 以杠杆 L 操作本金 P：借入 P·(L−1)，融资利息在借入额上按年利率计息。
//   借入金额  borrowed    = P·(L−1)
//   头寸价值  position    = P·L
//   融资成本  finCost     = borrowed·rate·(days/365)
//   占本金比  costRatio   = finCost / P
// 确定性、零外部依赖。教育性参考，非投资/融资建议。

export const STORAGE_KEY = "weacond:margin:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 借入金额 = P·(L−1)。L=1 → 0。
export function borrowed(principal, leverage) {
  return num(principal) * (num(leverage) - 1);
}

// 头寸价值 = P·L。
export function positionValue(principal, leverage) {
  return num(principal) * num(leverage);
}

// 融资成本 = 借入·利率·(天/365)。
export function financingCost(borrowedAmt, annualRate, days) {
  const B = num(borrowedAmt);
  const r = num(annualRate);
  const d = num(days);
  return B * r * (d / 365);
}

// 占本金比 = 融资成本 / 本金。
export function costRatio(finCost, principal) {
  const P = num(principal);
  if (P <= 0) return 0;
  return num(finCost) / P;
}

// 分级：按占本金比。
export function costBand(ratio) {
  const r = num(ratio);
  if (r <= 0) return "none";
  if (r < 0.01) return "low";
  if (r < 0.05) return "moderate";
  return "high";
}

// 综合视图。
export function marginSummary(inputs = {}) {
  const { principal = 10000, leverage = 1, annualInterest = 0, days } = inputs;
  const P = num(principal);
  const L = num(leverage);
  const r = num(annualInterest);
  const d = num(days);
  const valid = P > 0 && L >= 1 && r >= 0 && d >= 0;
  if (!valid) return { valid: false };
  const b = borrowed(P, L);
  const pos = positionValue(P, L);
  const fc = financingCost(b, r, d);
  const cr = costRatio(fc, P);
  return {
    principal: P,
    leverage: L,
    annualInterest: r,
    days: d,
    borrowed: b,
    positionValue: pos,
    financingCost: fc,
    costRatio: cr,
    band: costBand(cr),
    valid: true,
  };
}

// 预设：不同杠杆/持有期/利率情景。
export const MARGIN_PRESETS = {
  noLev:   { id: "noLev",    label: "无杠杆",   principal: 10000, leverage: 1,  annualInterest: 0.08, days: 30 },
  dayTrade:{ id: "dayTrade", label: "日内",     principal: 10000, leverage: 2,  annualInterest: 0.08, days: 1 },
  swing:   { id: "swing",    label: "波段",     principal: 10000, leverage: 3,  annualInterest: 0.08, days: 50 },
  long:    { id: "long",     label: "长期持有", principal: 10000, leverage: 3,  annualInterest: 0.10, days: 180 },
  highLev: { id: "highLev",  label: "高杠杆",   principal: 10000, leverage: 10, annualInterest: 0.10, days: 60 },
};
export { num };
