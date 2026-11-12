// lib/volDrag.js — 波动拖累 / 几何 vs 算术收益（纯函数，可单元测试）
//
// 算术均值高估长期复合收益；几何均值（复合）才是真实的增长率。
// 二者之差即「波动拖累」：波动越大，拖累越大。
// 全部确定性、零外部依赖，便于 SSR 与单元测试。

export const STORAGE_KEY = "weacond:volDrag:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 清洗后的每周期收益率（过滤非法，(1+r)>0 才能复合）。
function cleanReturns(series) {
  const xs = (Array.isArray(series) ? series : []).map((v) => num(v));
  return xs.filter((r) => 1 + r > 0); // 亏损 > 100% 无法复合，剔除
}

// 算术均值收益（%）。
export function arithmeticMean(series) {
  const xs = cleanReturns(series);
  const n = xs.length;
  if (n === 0) return { mean: NaN, valid: false, n: 0 };
  const mean = xs.reduce((s, r) => s + r, 0) / n;
  return { mean, valid: true, n };
}

// 几何均值收益（%）：(∏(1+r))^(1/n) − 1。
export function geometricMean(series) {
  const xs = cleanReturns(series);
  const n = xs.length;
  if (n === 0) return { mean: NaN, valid: false, n: 0 };
  const product = xs.reduce((s, r) => s * (1 + r), 1);
  const growth = product > 0 ? product ** (1 / n) : 0;
  return { mean: growth - 1, valid: product > 0, product, n };
}

// 波动拖累：算术 − 几何（百分点，>=0）。
export function volatilityDrag(series) {
  const a = arithmeticMean(series);
  const g = geometricMean(series);
  if (!a.valid || !g.valid) return { drag: NaN, valid: false };
  return { drag: a.mean - g.mean, valid: true };
}

// 组合视图：算术/几何/拖累 + 终值对比。
export function dragSummary(series, initial = 100) {
  const xs = cleanReturns(series);
  const n = xs.length;
  const a = arithmeticMean(series);
  const g = geometricMean(series);
  if (!a.valid || !g.valid) return { valid: false, n: 0, initial: num(initial) };
  const drag = a.mean - g.mean;
  const fvGeom = num(initial) * g.product; // 真实复合终值
  const fvArith = num(initial) * (1 + a.mean) ** n; // 若按算术复合（虚高）
  const overstatePct = fvGeom > 0 ? (fvArith - fvGeom) / fvGeom * 100 : NaN;
  return {
    valid: true,
    n,
    initial: num(initial),
    arith: a.mean,
    geom: g.mean,
    drag,
    fvGeom,
    fvArith,
    overstatePct,
  };
}

// 拖累分级：相对算术收益的拖累幅度。
export function dragBand(series) {
  const a = arithmeticMean(series);
  const d = volatilityDrag(series);
  if (!a.valid || !d.valid) return "invalid";
  const rel = a.mean !== 0 ? d.drag / Math.abs(a.mean) : 0;
  if (rel >= 0.25) return "high";
  if (rel >= 0.1) return "moderate";
  return "low";
}

// 预设：不同波动场景。
export const VOL_DRAG_PRESETS = {
  steady: { id: "steady", label: "稳健上涨", returns: [0.05, 0.05, 0.05, 0.05], initial: 100 },
  choppy: { id: "choppy", label: "高波动", returns: [0.3, -0.3, 0.3, -0.3], initial: 100 },
  crashRecover: { id: "crashRecover", label: "先崩后涨", returns: [-0.5, 1, 0.0, 0.0], initial: 100 },
  real: { id: "real", label: "混合", returns: [0.1, -0.2, 0.15, 0.08, -0.1], initial: 1000 },
};
export { num };