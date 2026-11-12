// lib/drip.js — 红利再投资 / 总收入（Dividend Reinvestment / Total Income，纯函数）
//
// 给定本金 P、年化红利收益率 y、年度红利增长率 g、持有年数 n：
// 第 t 年红利 = P·y·(1+g)^(t−1)
// 累计红利 = Σ_{t=1..n} P·y·(1+g)^(t−1)
// 收入倍数 = 累计红利 / P
// 末年红利 = P·y·(1+g)^(n−1)
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:drip:v1";
function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}
// 第 t 年红利 = P·y·(1+g)^(t−1)。t<1 → 0。
export function yearlyDividend(principal, yieldRate, growthRate, year) {
  const P = num(principal);
  const y = num(yieldRate);
  const g = num(growthRate);
  const t = Math.floor(num(year));
  if (t < 1) return 0;
  return P * y * Math.pow(1 + g, t - 1);
}
// 累计红利 = Σ_{t=1..n} P·y·(1+g)^(t−1)。
export function totalDividends(principal, yieldRate, growthRate, years) {
  const P = num(principal);
  const y = num(yieldRate);
  const g = num(growthRate);
  const n = Math.floor(num(years));
  if (n < 1) return 0;
  let sum = 0;
  for (let t = 1; t <= n; t++) sum += P * y * Math.pow(1 + g, t - 1);
  return sum;
}
// 收入倍数 = 累计红利 / 本金。
export function incomeMultiplier(total, principal) {
  const P = num(principal);
  if (P <= 0) return 0;
  return num(total) / P;
}
// 末年红利。
export function finalDividend(principal, yieldRate, growthRate, years) {
  const n = Math.floor(num(years));
  if (n < 1) return 0;
  return yearlyDividend(principal, yieldRate, growthRate, n);
}
// 收入倍数分级。
export function dripBand(mult) {
  const m = num(mult);
  if (m <= 0) return "none";
  if (m < 0.5) return "low";
  if (m < 1) return "moderate";
  return "high";
}
// 综合视图。
export function dripSummary(inputs = {}) {
  const { principal = 10000, yieldRate = 0.04, growthRate = 0.05, years } = inputs;
  const P = num(principal);
  const y = num(yieldRate);
  const g = num(growthRate);
  const n = Math.floor(num(years));
  const valid = P > 0 && y >= 0 && g > -1 && n >= 1;
  if (!valid) return { valid: false };
  const first = yearlyDividend(P, y, g, 1);
  const total = totalDividends(P, y, g, n);
  const last = finalDividend(P, y, g, n);
  const mult = incomeMultiplier(total, P);
  return {
    principal: P,
    yieldRate: y,
    growthRate: g,
    years: n,
    firstYearDividend: first,
    totalDividends: total,
    finalYearDividend: last,
    incomeMultiplier: mult,
    band: dripBand(mult),
    valid: true,
  };
}
// 预设：不同红利/增长情景。
export const DRIP_PRESETS = {
  modest: { id: "modest", label: "稳健红利", principal: 10000, yieldRate: 0.04, growthRate: 0.05, years: 10 },
  highGrowth: { id: "highGrowth", label: "高增长红利", principal: 10000, yieldRate: 0.03, growthRate: 0.08, years: 10 },
  value: { id: "value", label: "价值股", principal: 10000, yieldRate: 0.05, growthRate: 0.02, years: 10 },
  aggressive: { id: "aggressive", label: "长期激进", principal: 50000, yieldRate: 0.04, growthRate: 0.06, years: 20 },
  conservative: { id: "conservative", label: "保守 30Y", principal: 20000, yieldRate: 0.01, growthRate: 0.01, years: 30 },
};
export { num };
