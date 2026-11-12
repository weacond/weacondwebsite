// lib/zscore.js — Z 分数 / 标准化（纯函数，可单元测试）
//
// Z 分数把任意数值映射到「相对均值有几个标准差」：z = (x − μ) / σ。
// 常用于均值回归信号（|z| 越大越极端）与异常值检测。
// 配合正态 CDF（经 erf 近似）给出概率与百分位。
// 全部确定性、零外部依赖，便于 SSR 与单元测试。

export const STORAGE_KEY = "weacond:zscore:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 误差函数 erf 的 Abramowitz & Stegun 7.1.26 近似（最大误差 1.5e-7）。
export function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

// 标准正态分布 CDF：Φ(z) = 0.5·(1 + erf(z/√2))。
export function normalCdf(z) {
  return 0.5 * (1 + erf(num(z) / Math.SQRT2));
}

// Z 分数：(x − mean) / std。std ≤ 0 时无效。
export function zScore(x, mean, std) {
  const s = num(std);
  if (s <= 0) return { z: NaN, valid: false };
  const z = (num(x) - num(mean)) / s;
  return { z, valid: Number.isFinite(z) };
}

// 百分位（0~100）：正态下 P(Z < z)。
export function percentileFromZ(z) {
  return normalCdf(num(z)) * 100;
}

// Z 分数分级：越远离 0 越极端。
export function zBand(z) {
  const a = Math.abs(num(z));
  if (a >= 3) return "extreme";
  if (a >= 2) return "rare";
  if (a >= 1) return "notable";
  return "neutral";
}

// 由一组数值算样本均值与样本标准差（n−1 分母），并给出 z 分数序列。
export function standardize(series) {
  const xs = (Array.isArray(series) ? series : []).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  const n = xs.length;
  if (n < 2) return { mean: NaN, std: NaN, scores: [], valid: false };
  const mean = xs.reduce((s, v) => s + v, 0) / n;
  const variance = xs.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);
  const scores = std > 0 ? xs.map((v) => (v - mean) / std) : xs.map(() => 0);
  return { mean, std, scores, valid: std > 0 };
}

// 单点视图：z 分数 + 百分位 + 分级。
export function zView(x, mean, std) {
  const r = zScore(x, mean, std);
  if (!r.valid) return { ...r, pctile: NaN, band: "invalid" };
  return { z: r.z, valid: true, pctile: percentileFromZ(r.z), band: zBand(r.z) };
}

// 预设：不同 z 分数场景。
export const ZSCORE_PRESETS = {
  oversold: { id: "oversold", label: "超卖", x: 10, mean: 20, std: 2 },
  neutral: { id: "neutral", label: "中性", x: 20, mean: 20, std: 2 },
  outlier: { id: "outlier", label: "极端离群", x: 30, mean: 20, std: 2 },
  return: { id: "return", label: "收益率离群", x: 0.15, mean: 0.05, std: 0.02 },
};
export { num };