// ============================================================================
// portfolio.js — 组合层面度量（纯函数、确定性）
//
// 在 lib/risk.js（单标的）与 lib/correlation.js（相关/分散化）之上，
// 提供组合收益、组合波动率（√(wᵀΣw)）与组合夏普。
//
// 约定：
//   - returnsList        为 N 个收益率序列（等长），元素为小数收益（如 0.01 = 1%）。
//   - vols               为各序列波动率（同口径）。
//   - correlationMatrix  为 N×N 相关矩阵（对角=1）。
//   - weights            缺省等权 1/N；给定则按权重归一化（忽略非有限权重）。
//
// 该模块仅依赖标准库，不 import lib/risk.js 或 lib/correlation.js，保持解耦。
// ============================================================================

// 权重归一化：等权 1/N，或按给定权重归一化；N=0 → []；全 0/非有限 → 退回等权。
function normalizeWeights(weights, n) {
  if (!n) return [];
  if (!Array.isArray(weights) || weights.length !== n) {
    return Array.from({ length: n }, () => 1 / n);
  }
  const ws = weights.map((w) => (typeof w === "number" && Number.isFinite(w) ? w : 0));
  const sum = ws.reduce((a, b) => a + b, 0);
  if (sum === 0) return Array.from({ length: n }, () => 1 / n);
  return ws.map((w) => w / sum);
}

// 单序列均值（忽略非有限）；空 → 0
function seriesMean(r) {
  if (!Array.isArray(r) || r.length === 0) return 0;
  const clean = r.filter((x) => typeof x === "number" && Number.isFinite(x));
  if (clean.length === 0) return 0;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

/**
 * 组合加权平均收益。
 * @param {number[][]} returnsList N 个等长收益率序列
 * @param {number[]} [weights] 权重（缺省等权）
 * @returns {number} 加权平均收益；空 → 0
 */
export function portfolioReturn(returnsList, weights) {
  if (!Array.isArray(returnsList) || returnsList.length === 0) return 0;
  const means = returnsList.map(seriesMean);
  const w = normalizeWeights(weights, returnsList.length);
  return w.reduce((s, wi, i) => s + wi * means[i], 0);
}

/**
 * 组合波动率 σ_p = √(wᵀΣw)，其中 Σᵢⱼ = corrᵢⱼ·σᵢ·σⱼ。
 * @param {number[]} vols 各序列波动率（长度 N）
 * @param {number[][]} correlationMatrix N×N 相关矩阵
 * @param {number[]} [weights] 权重（缺省等权）
 * @returns {number} 组合波动率；维度不匹配或无资产 → 0
 */
export function portfolioVolatility(vols, correlationMatrix, weights) {
  const m = Array.isArray(correlationMatrix) ? correlationMatrix.length : 0;
  if (m === 0 || !Array.isArray(vols) || vols.length !== m) return 0;
  const w = normalizeWeights(weights, m);
  let v = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      const cij = correlationMatrix[i]?.[j];
      const val = typeof cij === "number" && Number.isFinite(cij) ? cij : 0;
      v += w[i] * w[j] * val * (vols[i] || 0) * (vols[j] || 0);
    }
  }
  return Math.sqrt(Math.max(0, v));
}

/**
 * 组合夏普 = (rp − rf)/σ_p × √periods。
 * @param {number[][]} returnsList N 个等长收益率序列
 * @param {number[]} vols 各序列波动率（长度 N，同口径）
 * @param {number[][]} correlationMatrix N×N 相关矩阵
 * @param {number[]} [weights] 权重（缺省等权）
 * @param {number} [rf=0] 无风险利率（同口径，小数）
 * @param {number} [periods=252] 年化期数
 * @returns {number} 组合夏普；σ_p≤0 → 0
 */
export function portfolioSharpe(returnsList, vols, correlationMatrix, weights, rf = 0, periods = 252) {
  const pr = portfolioReturn(returnsList, weights);
  const pv = portfolioVolatility(vols, correlationMatrix, weights);
  if (!(pv > 0)) return 0;
  return ((pr - rf) / pv) * Math.sqrt(periods);
}
