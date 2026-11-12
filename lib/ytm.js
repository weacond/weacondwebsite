// lib/ytm.js — 到期收益率 YTM（Yield to Maturity，迭代二分求解，纯函数）
//
// YTM = 使债券价格等于当前价格的折现率 r（年付息）：
//   Σ_{t=1..n} C/(1+r)^t + F/(1+r)^n = price
// 价格随 r 单调递减 → 用二分法在 [lo, hi] 求根。
// 确定性、零外部依赖。教育性参考，非投资建议。

export const STORAGE_KEY = "weacond:ytm:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 给定折现率 r，年付息债券价格。
export function priceAtRate(face, couponRate, years, r) {
  const F = num(face);
  const c = F * num(couponRate); // 每年票息
  const n = num(years);
  if (n <= 0) return F;
  let pv = 0;
  for (let t = 1; t <= n; t++) {
    pv += c / Math.pow(1 + r, t);
  }
  pv += F / Math.pow(1 + r, n);
  return pv;
}

// 二分法求 YTM：使 priceAtRate = 目标价格。
// 价格随 r 递减：r 越大价格越低。无解（越界）返回 null。
export function yieldToMaturity(face, couponRate, price, years, opts = {}) {
  const F = num(face);
  const target = num(price);
  const n = num(years);
  const { lo = -0.9, hi = 1.0, tol = 1e-8, maxIter = 200 } = opts;
  if (F <= 0 || target <= 0 || n <= 0) return null;
  const priceLo = priceAtRate(F, couponRate, n, lo); // r=lo → 高价
  const priceHi = priceAtRate(F, couponRate, n, hi); // r=hi → 低价
  if (target > priceLo || target < priceHi) return null; // 无解
  let a = lo;
  let b = hi;
  for (let i = 0; i < maxIter; i++) {
    const mid = (a + b) / 2;
    const pMid = priceAtRate(F, couponRate, n, mid);
    if (Math.abs(pMid - target) < tol) return mid;
    if (pMid > target) a = mid; // 价格偏高 → 需更大 r
    else b = mid;
  }
  return (a + b) / 2;
}

// YTM 分级（按收益率）。
export function yieldBand(y) {
  if (y == null) return "na";
  const v = num(y);
  if (v < 0) return "negative";
  if (v < 0.03) return "low";
  if (v < 0.06) return "moderate";
  return "high";
}

// 综合视图。
export function ytmSummary(inputs = {}) {
  const { face = 100, couponRate = 0.05, price = 100, years } = inputs;
  const F = num(face);
  const cr = num(couponRate);
  const target = num(price);
  const n = num(years);
  const valid = F > 0 && target > 0 && n > 0 && cr >= 0;
  if (!valid) return { valid: false };
  const y = yieldToMaturity(F, cr, target, n);
  return {
    face: F,
    couponRate: cr,
    price: target,
    years: n,
    ytm: y,
    band: yieldBand(y),
    // 平价：价格=面值 → YTM≈票息。
    fair: Math.abs(target - F) < 1e-9,
    valid: true,
  };
}

// 预设：典型债券情景。
export const YTM_PRESETS = {
  low:       { id: "low",       label: "低收益", face: 100, couponRate: 0.02, price: 105, years: 10 },
  par:       { id: "par",       label: "平价",   face: 100, couponRate: 0.05, price: 100, years: 10 },
  premium:   { id: "premium",   label: "溢价",   face: 100, couponRate: 0.06, price: 110, years: 10 },
  discount:  { id: "discount",  label: "折价",   face: 100, couponRate: 0.04, price: 90,  years: 10 },
  highYield: { id: "highYield", label: "高收益", face: 100, couponRate: 0.08, price: 95,  years: 5 },
};
export { num };
