// lib/probReturn.js — 概率加权期望回报（Probability-weighted expected return，纯函数）
//
// 给定 N 个结果及其概率：
// 期望 E[X] = Σ(p_i × x_i)
// 方差 Var = Σ(p_i × (x_i − E[X])²)
// 标准差 σ = √Var
// 变异系数 CV = σ / |E[X]|
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:probReturn:v1";
// 期望值 E[X] = Σ(p_i × x_i)。
export function weightedReturn(probs, outcomes) {
  if (!Array.isArray(probs) || !Array.isArray(outcomes) || probs.length !== outcomes.length) return 0;
  let sum = 0;
  for (let i = 0; i < probs.length; i++) sum += probs[i] * outcomes[i];
  return sum;
}
// 方差 = Σ(p_i × (x_i − mean)²)。
export function variance(probs, outcomes) {
  if (!Array.isArray(probs) || !Array.isArray(outcomes) || probs.length !== outcomes.length) return 0;
  const mean = weightedReturn(probs, outcomes);
  let v = 0;
  for (let i = 0; i < probs.length; i++) {
    const d = outcomes[i] - mean;
    v += probs[i] * d * d;
  }
  return v;
}
// 标准差 σ = √Var。
export function stdDev(probs, outcomes) {
  const v = variance(probs, outcomes);
  return v > 0 ? Math.sqrt(v) : 0;
}
// 变异系数 CV = σ / |E[X]|。
export function coefficientOfVariation(probs, outcomes) {
  const mean = weightedReturn(probs, outcomes);
  if (Math.abs(mean) < 1e-12) return 0;
  return stdDev(probs, outcomes) / Math.abs(mean);
}
// 期望回报分级。
export function probReturnBand(expected) {
  const e = Number(expected);
  if (!Number.isFinite(e)) return "invalid";
  if (e <= 0) return "negative";
  if (e < 0.02) return "low";
  if (e < 0.05) return "moderate";
  if (e < 0.10) return "good";
  return "excellent";
}
// 综合视图。
export function probReturnSummary(inputs = {}) {
  const { probs, outcomes } = inputs;
  if (!Array.isArray(probs) || !Array.isArray(outcomes) || probs.length !== outcomes.length || probs.length < 2) {
    return { valid: false };
  }
  // 校验概率和为 1
  const pSum = probs.reduce((a, b) => a + b, 0);
  if (Math.abs(pSum - 1) > 0.001) return { valid: false };
  const mean = weightedReturn(probs, outcomes);
  const v = variance(probs, outcomes);
  const sd = stdDev(probs, outcomes);
  const cv = coefficientOfVariation(probs, outcomes);
  return {
    probs,
    outcomes,
    expected: mean,
    variance: v,
    stdDev: sd,
    cv: cv,
    band: probReturnBand(mean),
    valid: true,
  };
}
// 预设：不同概率分布场景。
export const PROB_RETURN_PRESETS = {
  binary: { id: "binary", label: "二元 60/40", probs: [0.6, 0.4], outcomes: [1, -1] },
  trinary: { id: "trinary", label: "三元", probs: [0.3, 0.5, 0.2], outcomes: [2, 0, -3] },
  fourWay: { id: "fourWay", label: "四元", probs: [0.15, 0.35, 0.35, 0.15], outcomes: [3, 1, -1, -3] },
  skewed: { id: "skewed", label: "偏斜", probs: [0.1, 0.7, 0.2], outcomes: [10, -1, 5] },
  uniform: { id: "uniform", label: "均匀", probs: [0.25, 0.25, 0.25, 0.25], outcomes: [1, 2, 3, 4] },
};
