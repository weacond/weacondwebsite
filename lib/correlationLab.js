// lib/correlationLab.js — 相关性 / 分散化实验室（纯函数、确定性、可单元测试）
//
// 在 lib/correlation.js 之上，提供"预设资产篮子 + 配权模式"的一站式分散化分析，
// 供 /correlation 页面（双语）使用：相关性热力图、分散化比率 DR、HHI、逐对强度分类。
//
// 约定：
//   - 预设篮子给出 N×N 相关矩阵 corr（对角=1、对称）与波动率 vols（与行一一对应）。
//   - 配权模式：equal（等权 1/N）或 invVol（逆波动率）。
//   - DR ≥ 1：越大表示分散化越有效；1 = 完全正相关（无分散化收益）。

import { diversificationRatio, correlationMatrix as corrFromSeries } from "./correlation.js";

// HHI（赫芬达尔指数）= Σ wᵢ²。等权 1/N → 1/N（最小）；单资产集中 → 1（最大）。
// 缺省等权。权重非法（非数/长度不符）时按等权。
export function hhi(weights, n) {
  if (!(n > 0)) return 0;
  let w;
  if (Array.isArray(weights) && weights.length === n && weights.every((x) => Number.isFinite(x))) {
    w = weights;
  } else {
    w = new Array(n).fill(1 / n);
  }
  return w.reduce((s, xi) => s + xi * xi, 0);
}

// 逆波动率权重：wᵢ ∝ 1/σᵢ，归一化为和=1；全 0 波动 → 等权。
export function inverseVolWeights(vols) {
  const m = vols.length;
  if (m === 0) return [];
  const inv = vols.map((v) => (Number.isFinite(v) && v > 0 ? 1 / v : 0));
  const sum = inv.reduce((a, b) => a + b, 0);
  if (sum === 0) return new Array(m).fill(1 / m);
  return inv.map((x) => x / sum);
}

// 把单对相关系数 ρ 分类为强度 × 方向
// strength: none/weak/moderate/strong/veryStrong；dir: positive/negative/none
export function classifyPair(rho) {
  const a = Math.abs(rho);
  let strength;
  if (a < 0.1) strength = "none";
  else if (a < 0.3) strength = "weak";
  else if (a < 0.5) strength = "moderate";
  else if (a < 0.7) strength = "strong";
  else strength = "veryStrong";
  const dir = rho > 0.001 ? "positive" : rho < -0.001 ? "negative" : "none";
  return { rho, abs: a, strength, dir };
}

// 预设资产篮子：corr 为 N×N 相关矩阵（对角=1、对称），vols 与之对应
export const CORR_PRESETS = {
  equityBonds: {
    id: "equityBonds",
    name: "股债组合",
    nameEn: "Stock & Bond",
    desc: "经典风险平价思路：股票与债券负相关，分散化收益最高。",
    descEn: "Classic risk parity: equities & bonds negatively correlated → strongest diversification.",
    vols: [15, 6, 12],
    corr: [
      [1, -0.2, 0.1],
      [-0.2, 1, 0.3],
      [0.1, 0.3, 1],
    ],
    assets: [
      { name: "美股", nameEn: "US Equity" },
      { name: "美债", nameEn: "US Bonds" },
      { name: "黄金", nameEn: "Gold" },
    ],
  },
  globalMacro: {
    id: "globalMacro",
    name: "全球宏观",
    nameEn: "Global Macro",
    desc: "股、债、黄金、商品多资产，相关性混合，需配权平衡。",
    descEn: "Equities, bonds, gold, commodities — mixed correlations needing weight balancing.",
    vols: [15, 22, 6, 12, 35],
    corr: [
      [1, 0.6, -0.2, 0.1, -0.1],
      [0.6, 1, 0.1, 0.15, 0.2],
      [-0.2, 0.1, 1, 0.4, -0.05],
      [0.1, 0.15, 0.4, 1, 0.3],
      [-0.1, 0.2, -0.05, 0.3, 1],
    ],
    assets: [
      { name: "美股", nameEn: "US Equity" },
      { name: "新兴市场", nameEn: "EM Equity" },
      { name: "美债", nameEn: "US Bonds" },
      { name: "黄金", nameEn: "Gold" },
      { name: "原油", nameEn: "Oil" },
    ],
  },
  cryptoBasket: {
    id: "cryptoBasket",
    name: "加密篮子",
    nameEn: "Crypto Basket",
    desc: "高波动、高正相关，分散化收益有限（DR 接近 1）。",
    descEn: "High vol, high positive correlation → limited diversification (DR near 1).",
    vols: [60, 70, 90],
    corr: [
      [1, 0.85, 0.75],
      [0.85, 1, 0.88],
      [0.75, 0.88, 1],
    ],
    assets: [
      { name: "BTC", nameEn: "BTC" },
      { name: "ETH", nameEn: "ETH" },
      { name: "SOL", nameEn: "SOL" },
    ],
  },
};

export function getCorrPreset(key) {
  const p = CORR_PRESETS[key];
  if (!p) throw new Error(`Unknown correlation preset: ${key}`);
  return p;
}

// 由预设 + 配权模式（equal | invVol）构建分散化方案
export function diversifyPlan(preset, mode = "equal") {
  const p = getCorrPreset(preset) || preset;
  const m = p.corr.length;
  const vols = p.vols;
  const weights = mode === "invVol" ? inverseVolWeights(vols) : new Array(m).fill(1 / m);
  const dr = diversificationRatio(p.corr, vols, weights);
  const pairs = [];
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      pairs.push({ i, j, ...classifyPair(p.corr[i][j]) });
    }
  }
  return {
    id: p.id,
    name: p.name,
    nameEn: p.nameEn,
    desc: p.desc,
    descEn: p.descEn,
    mode,
    assets: p.assets,
    vols,
    matrix: p.corr,
    weights,
    dr,
    hhi: hhi(weights, m),
    nAssets: m,
    nPairs: pairs.length,
    pairs,
    // 组合波动率（供参考）：DR = Σwᵢσᵢ / σp → σp = Σwᵢσᵢ / DR
    portVol: dr > 0 ? weights.reduce((s, w, i) => s + w * vols[i], 0) / dr : 0,
  };
}

// 便捷：从收益率序列数组构建相关矩阵（包装 correlationMatrix，供"自定义序列"入口）
export function matrixFromSeries(seriesList) {
  return corrFromSeries(seriesList);
}

// 直接对给定相关矩阵 + 波动率 + 权重算 DR（透传，便于测试/页面复用）
export function drFromMatrix(corr, vols, weights) {
  return diversificationRatio(corr, vols, weights);
}

// 暴露底层函数，保持单一口径
export { diversificationRatio, corrFromSeries as correlationMatrix };
