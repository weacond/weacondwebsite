// lib/bond.js — 固定收益债券：价格 / 当前收益率 / 久期（纯函数，可单元测试）
//
// 给定面值 F、票面利率 c（年，小数）、到期年数 n（取整）、到期收益率 y（年，小数），
// 按「年付息」计算：
//   价格         P = Σ_{t=1..n} C/(1+y)^t  +  F/(1+y)^n，其中 C = c·F
//   当前收益率   CY = C / P
//   麦凯久期     D = Σ t·CF_t/(1+y)^t / P（CF_n 含面值 F）
//   修正久期     MD = D / (1+y)
// 性质：当 c = y 时价格 = 面值（平价）；零息券久期 = 到期年数。
// 确定性、零外部依赖。教育性参考。

export const STORAGE_KEY = "weacond:bond:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 债券价格（年付息）。n 取整；n≤0 视为已到期，返回面值。
export function bondPrice(face, couponRate, years, yieldRate) {
  const F = num(face);
  const c = num(couponRate);
  const n = Math.floor(num(years));
  const y = num(yieldRate);
  if (n <= 0) return F;
  const C = c * F;
  let price = 0;
  for (let t = 1; t <= n; t++) price += C / Math.pow(1 + y, t);
  price += F / Math.pow(1 + y, n);
  return price;
}

// 当前收益率 = 年息 / 价格。
export function currentYield(coupon, price) {
  const C = num(coupon);
  const P = num(price);
  if (P <= 0) return 0;
  return C / P;
}

// 麦凯久期（年）。n≤0 → 0。
export function macaulayDuration(face, couponRate, years, yieldRate) {
  const F = num(face);
  const c = num(couponRate);
  const n = Math.floor(num(years));
  const y = num(yieldRate);
  if (n <= 0) return 0;
  const C = c * F;
  let price = 0;
  let weighted = 0;
  for (let t = 1; t <= n; t++) {
    const pv = C / Math.pow(1 + y, t);
    price += pv;
    weighted += t * pv;
  }
  const pvFace = F / Math.pow(1 + y, n);
  price += pvFace;
  weighted += n * pvFace;
  if (price <= 0) return 0;
  return weighted / price;
}

// 修正久期 = 麦凯久期 / (1 + y)。
export function modifiedDuration(macaulay, yieldRate) {
  const D = num(macaulay);
  const y = num(yieldRate);
  if (1 + y <= 0) return 0;
  return D / (1 + y);
}

// 价格相对面值分级：par / discount / premium。
export function priceBand(price, face) {
  const P = num(price);
  const F = num(face);
  if (F <= 0) return "na";
  const ratio = P / F;
  if (Math.abs(ratio - 1) <= 0.001) return "par";
  if (ratio < 1) return "discount";
  return "premium";
}

// 综合视图。
export function bondSummary(inputs = {}) {
  const { face = 100, couponRate = 0, years, yieldRate = 0 } = inputs;
  const F = num(face);
  const c = num(couponRate);
  const n = Math.floor(num(years));
  const y = num(yieldRate);
  const valid = F > 0 && n >= 1 && y > -1;
  if (!valid) return { valid: false };
  const price = bondPrice(F, c, n, y);
  const C = c * F;
  const mac = macaulayDuration(F, c, n, y);
  return {
    face: F,
    couponRate: c,
    years: n,
    yieldRate: y,
    price,
    currentYield: currentYield(C, price),
    macaulayDuration: mac,
    modifiedDuration: modifiedDuration(mac, y),
    band: priceBand(price, F),
    valid: true,
  };
}

// 预设：不同债券情景。
export const BOND_PRESETS = {
  par:     { id: "par",     label: "平价 5%",     face: 100, couponRate: 0.05, years: 5,  yieldRate: 0.05 },
  premium: { id: "premium", label: "溢价 8%",     face: 100, couponRate: 0.08, years: 3,  yieldRate: 0.05 },
  discount:{ id: "discount",label: "折价 3%",     face: 100, couponRate: 0.03, years: 5,  yieldRate: 0.05 },
  zero:    { id: "zero",    label: "零息 10Y",    face: 100, couponRate: 0,    years: 10, yieldRate: 0.05 },
  longTerm:{ id: "longTerm",label: "长久期 20Y",  face: 100, couponRate: 0.06, years: 20, yieldRate: 0.04 },
};
export { num };
