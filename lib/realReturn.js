// lib/realReturn.js — 实际（剔除通胀后）回报（Real return，纯函数，可单元测试）
//
// 名义回报 ≠ 实际回报。经典 Fisher 方程：
//   实际年化 = (1 + 名义) / (1 + 通胀) − 1
// Bogle「魔数」近似：magic = 名义 − 通胀 + 2（%）
// 购买力：1 元货币 N 年后值 1 / (1 + 通胀)^N（未来货币计）
// 未来实际价值 = 本金 · ((1 + 名义)/(1 + 通胀))^N
// 确定性、零外部依赖。

export const STORAGE_KEY = "weacond:realReturn:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 单期 Fisher 实际利率：real = (1 + nominal)/(1 + inflation) − 1。
export function realRate(nominal, inflation) {
  const N = num(nominal);
  const I = num(inflation);
  if (1 + I <= 0) return NaN;
  return (1 + N) / (1 + I) - 1;
}

// Bogle 魔数：nominal − inflation + 2（近似实际增长率，%）。
export function magicNumber(nominal, inflation) {
  return num(nominal) - num(inflation) + 2;
}

// 购买力：1 元货币 N 年后的现值（未来货币计）。
export function purchasingPower(inflation, years) {
  const I = num(inflation);
  if (1 + I <= 0) return NaN;
  return 1 / Math.pow(1 + I, num(years));
}

// 实际年化分级。
export function realBand(realCAGR) {
  if (!Number.isFinite(realCAGR)) return "na";
  const r = num(realCAGR);
  if (r < 0) return "losing";
  if (r < 0.03) return "low";
  return "good";
}

// 综合视图：名义/通胀/年限/本金 → 实际年化、魔数、购买力、未来名义/实际价值。
export function realReturnSummary(inputs = {}) {
  const { nominal, inflation, years, principal } = inputs;
  const I = num(inflation);
  if (1 + I <= 0) return { valid: false };
  const N = num(nominal);
  const Y = num(years);
  const P = num(principal) || 1000;
  const real = realRate(N, I);
  const magic = magicNumber(N, I);
  const pp = purchasingPower(I, Y);
  const futureNominal = P * Math.pow(1 + N, Y);
  const futureReal = futureNominal * pp;
  const band = realBand(real);
  return { real, magic, purchasingPower: pp, futureNominal, futureReal, band, valid: true };
}

// 预设：不同通胀/回报情景。
export const REAL_PRESETS = {
  lowInflation: { id: "lowInflation", label: "低通胀", nominal: 0.08, inflation: 0.02, years: 20, principal: 10000 },
  highInflation: { id: "highInflation", label: "高通胀", nominal: 0.06, inflation: 0.07, years: 20, principal: 10000 },
  bogle: { id: "bogle", label: "Bogle 魔数", nominal: 0.07, inflation: 0.03, years: 30, principal: 10000 },
  erode: { id: "erode", label: "通胀侵蚀", nominal: 0, inflation: 0.05, years: 30, principal: 10000 },
};
export { num };