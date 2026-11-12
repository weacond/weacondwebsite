// lib/monteCarlo.js — 蒙特卡洛风险模拟器（纯函数、确定性、可单元测试）
//
// 在 lib/risk.js 的 monteCarloDrawdown 之上，提供"预设资产 + 参数"的一站式模拟，
// 供 /montecarlo 页面（双语）使用：终端财富分布、回撤分位、破产概率、扇形图。
//
// 约定：
//   - 预设给出日度 μ/σ（小数）与样本长度 n（≈ 年×252）；用合成正态收益率驱动模拟。
//   - horizon 以"年"输入，内部转换为期数（年×252）。
//   - 所有随机性由 mulberry32(seed) 决定，给定 seed 完全可复现。

import {
  mulberry32,
  normalRandom,
  quantile,
} from "./risk.js";

// 生成 N(μ,σ) 合成收益率序列（确定性：由 seed 决定）
export function syntheticReturns(mu, sigma, n, seed = 1) {
  const rng = mulberry32(seed);
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = mu + sigma * normalRandom(rng);
  return out;
}

// 分位数工具（内部排序副本，不改动入参）
function quantileOf(arr, q) {
  return quantile(arr.slice().sort((a, b) => a - b), q);
}

// 比例辅助：arr 中 ≥ / ≤ level 的元素占比
export function fracAbove(arr, level) {
  if (arr.length === 0) return 0;
  return arr.filter((x) => x > level).length / arr.length;
}
export function fracBelow(arr, level) {
  if (arr.length === 0) return 0;
  return arr.filter((x) => x < level).length / arr.length;
}

// 预设资产（日度 μ/σ，示意性）
export const MC_PRESETS = {
  equity: {
    id: "equity",
    name: "美股",
    nameEn: "US Equity",
    mu: 0.00058,
    sigma: 0.011,
    n: 252 * 10,
    desc: "长期年化 ~8% / 波动 ~18%，有正漂移。",
    descEn: "~8% annualized / ~18% vol, positive drift.",
  },
  bonds: {
    id: "bonds",
    name: "美债",
    nameEn: "US Bonds",
    mu: 0.0003,
    sigma: 0.004,
    n: 252 * 10,
    desc: "低波动、低收益，回撤浅。",
    descEn: "Low vol, low return, shallow drawdowns.",
  },
  crypto: {
    id: "crypto",
    name: "加密",
    nameEn: "Crypto",
    mu: 0.0015,
    sigma: 0.045,
    n: 252 * 5,
    desc: "高波动、高收益，深回撤与破产风险并存。",
    descEn: "High vol, high return — deep drawdowns & ruin risk coexist.",
  },
  balanced: {
    id: "balanced",
    name: "平衡组合",
    nameEn: "Balanced",
    mu: 0.00045,
    sigma: 0.008,
    n: 252 * 10,
    desc: "股债混合，中等波动。",
    descEn: "Stock/bond blend, moderate vol.",
  },
};

export function getMCPreset(key) {
  const p = MC_PRESETS[key];
  if (!p) throw new Error(`Unknown Monte Carlo preset: ${key}`);
  return p;
}

/**
 * 运行一次模拟。opts: { horizonYears, nPaths, seed, paths, percentiles }
 * horizonYears → 期数 = years×252。返回终端财富分位、回撤分位、概率与扇形图数据。
 */
export function runSimulation(presetKey, opts = {}) {
  const p = getMCPreset(presetKey);
  const nPaths = Math.max(1, Math.floor(opts.nPaths || 1000));
  const seed = Number.isFinite(opts.seed) ? opts.seed : 1;
  const horizonYears = opts.horizonYears && opts.horizonYears > 0 ? opts.horizonYears : 5;
  const horizon = Math.max(1, Math.round(horizonYears * 252));
  const showPaths = opts.paths && opts.paths > 0 ? Math.floor(opts.paths) : 12;

  // 自包含模拟：几何步进 wealth ← (1 + μ + σ·Z)，Z ~ N(0,1)；确定性由 seed 决定
  const rng = mulberry32(seed);
  const terminals = new Array(nPaths);
  const dds = new Array(nPaths);
  const wealthByTime = Array.from({ length: horizon + 1 }, () => new Array(nPaths).fill(1));
  for (let pr = 0; pr < nPaths; pr++) {
    let wealth = 1;
    let peak = 1;
    let maxDD = 0;
    for (let t = 0; t < horizon; t++) {
      const z = normalRandom(rng);
      const growth = 1 + p.mu + p.sigma * z;
      wealth = wealth > 0 ? wealth * growth : 0;
      if (wealth > peak) peak = wealth;
      const dd = peak > 0 ? (peak - wealth) / peak : 0;
      if (dd > maxDD) maxDD = dd;
      wealthByTime[t + 1][pr] = wealth;
    }
    terminals[pr] = wealth;
    dds[pr] = maxDD;
  }

  // 分位带（逐时步 p5/p50/p95）
  const band = { p5: new Array(horizon + 1), p50: new Array(horizon + 1), p95: new Array(horizon + 1) };
  for (let t = 0; t <= horizon; t++) {
    const col = wealthByTime[t].slice().sort((a, b) => a - b);
    band.p5[t] = quantile(col, 0.05);
    band.p50[t] = quantile(col, 0.5);
    band.p95[t] = quantile(col, 0.95);
  }
  // 扇形路径：按终端财富排序等距抽取
  const order = terminals.map((v, i) => i).sort((a, b) => terminals[a] - terminals[b]);
  const k = Math.min(showPaths, order.length);
  const samplePaths = [];
  for (let j = 0; j < k; j++) {
    const pr = order[Math.floor((j * order.length) / k)];
    samplePaths.push(wealthByTime.map((row) => row[pr]));
  }
  // 回撤分位分布
  const ddDist = [0.05, 0.5, 0.9, 0.95, 0.99].map((q) => ({
    label: `${Math.round(q * 100)}%`,
    value: quantileOf(dds, q),
  }));

  return {
    preset: p,
    mu: p.mu,
    sigma: p.sigma,
    horizonYears,
    horizon,
    nPaths,
    // 终端财富分布
    terminal: {
      p10: quantileOf(terminals, 0.1),
      p50: quantileOf(terminals, 0.5),
      p90: quantileOf(terminals, 0.9),
      mean: terminals.reduce((a, b) => a + b, 0) / terminals.length,
      min: Math.min(...terminals),
      max: Math.max(...terminals),
    },
    // 概率
    probGain: fracAbove(terminals, 1), // 终端财富 > 1（盈利）
    probLoss: fracBelow(terminals, 1), // 终端财富 < 1（亏损）
    probHalved: fracBelow(terminals, 0.5), // 财富腰斩
    probRuin: fracBelow(terminals, 0.05), // 几乎归零
    // 最大回撤分位分布
    ddDist,
    maxDD: quantileOf(dds, 0.99),
    // 扇形图
    band,
    samplePaths,
  };
}
