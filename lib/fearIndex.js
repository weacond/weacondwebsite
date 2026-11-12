// lib/fearIndex.js — 市场恐惧指数（VIX 风格，确定性示例数据）
//
// 真实 VIX 需外部数据源 + 合规边界；本模块用确定性合成序列（均值回归）
// 提供「教育性、可复现」的恐惧仪表：
//   - syntheticVix(seed, n)：均值回归的 VIX 风格序列
//   - fearScore(vix)：把 VIX 水平映射到 0~100 恐惧分 + 标签
// 明确标注为示例数据，非实时行情。
//
// 复用 lib/risk.js 的 mulberry32 确定性 PRNG。全部纯函数，给定 seed 结果唯一。

import { mulberry32 } from "./risk.js";

/**
 * 恐惧分：把 VIX 水平映射到 0~100 并给出标签。
 * 近似：score = clamp((vix − 10) / 2.0, 0, 100)（VIX 10→0，30→100）。
 * @param {number} vix
 * @returns {{ score:number, label:string, labelEn:string }}
 */
export function fearScore(vix) {
  // score = clamp((vix − 10) / 0.2, 0, 100)：VIX 10→0，30→100
  const v = Number.isFinite(vix) ? vix : 0;
  const score = Math.max(0, Math.min(100, (v - 10) / 0.2));
  let label, labelEn;
  if (v < 15) { label = "平静"; labelEn = "Calm"; }
  else if (v < 22) { label = "谨慎"; labelEn = "Uneasy"; }
  else if (v < 30) { label = "担忧"; labelEn = "Nervous"; }
  else if (v < 45) { label = "恐惧"; labelEn = "Fear"; }
  else { label = "恐慌"; labelEn = "Panic"; }
  return { score, label, labelEn };
}

/**
 * 合成 VIX 风格序列（均值回归 Orstein-Uhlenbeck 离散化），确定性。
 * @param {number} seed
 * @param {number} n 点数
 * @param {object} [opts]
 * @param {number} [opts.mean=15] 均值
 * @param {number} [opts.sigma=3] 波动
 * @param {number} [opts.kappa=0.2] 回归速度
 * @returns {number[]} 长度 n 的 VIX 近似序列（≥0）
 */
export function syntheticVix(seed, n, opts = {}) {
  const m = Number.isFinite(opts.mean) ? opts.mean : 15;
  const sigma = Number.isFinite(opts.sigma) ? opts.sigma : 3;
  const kappa = Number.isFinite(opts.kappa) ? opts.kappa : 0.2;
  const count = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  const out = [];
  if (count === 0) return out;
  const rnd = mulberry32(seed);
  let x = m;
  for (let i = 0; i < count; i++) {
    // OU 离散化：x_{t+1} = x_t + kappa*(m - x_t) + sigma*z
    const z = gaussian(rnd);
    x = x + kappa * (m - x) + sigma * z;
    out.push(Math.max(2, x)); // VIX 近似下限
  }
  return out;
}

// 标准正态（Box-Muller），由 [0,1) 随机数生成
function gaussian(rnd) {
  let u1 = rnd();
  let u2 = rnd();
  if (u1 < 1e-12) u1 = 1e-12;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * 取序列末端当前值 + 恐惧分。
 * @returns {{ vix:number, score:number, label:string, labelEn:string, series:number[] }}
 */
export function fearGauge(seed, n, opts = {}) {
  const series = syntheticVix(seed, n, opts);
  const vix = series.length ? series[series.length - 1] : 0;
  const s = fearScore(vix);
  return { vix, series, ...s };
}

/**
 * 校验。
 * @returns {boolean}
 */
export function validFear(o = {}) {
  return Number.isFinite(o.seed) && Number.isFinite(o.n) && o.n >= 0;
}

/**
 * 预设情景（不同 seed 产生不同情绪）。
 */
export const FEAR_PRESETS = [
  { id: "calm", label: "平静市", seed: 7, n: 60 },
  { id: "volatile", label: "波动市", seed: 42, n: 60 },
  { id: "crisis", label: "危机市", seed: 999, n: 60, opts: { mean: 35, sigma: 8 } },
];
