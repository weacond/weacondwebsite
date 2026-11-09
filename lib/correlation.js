// lib/correlation.js — 相关性 / 分散化分析（纯函数、确定性、可单元测试）
//
// 约定：
//   - series：等长（或不等长，取较短）的收益率/价格序列。
//   - 相关系数 ρ ∈ [-1,1]；+1 完全正相关，−1 完全负相关，0 线性无关。
//   - 缺失值（NaN/非数）按"逐对"方式跳过：仅计入两序列该位置均为有限数的样本；
//     有效样本 <2 或退化为常数 → 0。
//
// 这些是多资产/多策略风险分散化度量，非投资建议；
// 用于组合层面的相关性 / 分散化收益评估（与 lib/risk.js 的单序列度量互补）。

/**
 * Pearson 相关系数 ρ(x, y) ∈ [-1,1]。
 * 取两序列较短长度内的"逐对有限"样本（NaN/非数在该位置跳过）；
 * 有效样本 <2 或任一序列退化为常数（标准差 0）→ 0。
 * @param {number[]} x
 * @param {number[]} y
 * @returns {number} 相关系数，∈[-1,1]；退化 → 0。
 */
export function pearsonCorrelation(x, y) {
  const n = Math.min(
    Array.isArray(x) ? x.length : 0,
    Array.isArray(y) ? y.length : 0
  );
  const xs = [];
  const ys = [];
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    if (typeof xi !== "number" || !Number.isFinite(xi)) continue;
    if (typeof yi !== "number" || !Number.isFinite(yi)) continue;
    xs.push(xi);
    ys.push(yi);
    sumX += xi;
    sumY += yi;
  }
  const cnt = xs.length;
  if (cnt < 2) return 0;
  const mx = sumX / cnt;
  const my = sumY / cnt;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < cnt; i++) {
    const u = xs[i] - mx;
    const v = ys[i] - my;
    num += u * v;
    dx += u * u;
    dy += v * v;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

/**
 * N×N 相关矩阵。seriesList 为返回序列数组。
 * 对称；对角线恒为 1（自相关）；i≠j 处用 pearsonCorrelation，截断到 4 位小数。
 * @param {number[][]} seriesList
 * @returns {number[][]} 对称相关矩阵；空输入 → []。
 */
export function correlationMatrix(seriesList) {
  const series = Array.isArray(seriesList) ? seriesList : [];
  const m = series.length;
  const mat = Array.from({ length: m }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = i; j < m; j++) {
      const c = i === j ? 1 : pearsonCorrelation(series[i], series[j]);
      mat[i][j] = +c.toFixed(4);
      mat[j][i] = mat[i][j];
    }
  }
  return mat;
}

/**
 * 分散化比率 DR = (Σ wᵢ σᵢ) / σ_portfolio。
 * σ_portfolio = sqrt(wᵀ Σ w)，其中 Σ_ij = ρ_ij · σ_i · σ_j。
 * DR = 1 表示完全正相关（无分散化收益）；DR > 1 越大表示分散化越有效。
 * @param {number[][]} correlationMatrix N×N 相关矩阵
 * @param {number[]} vols 各资产波动率（与矩阵行一一对应）
 * @param {number[]} [weights] 权重（缺省等权 1/N）
 * @returns {number} DR ≥ 1（退化/分母为 0 → 0）。
 */
export function diversificationRatio(correlationMatrix, vols, weights) {
  const m = correlationMatrix.length;
  if (m === 0 || vols.length !== m) return 0;
  const w = Array.isArray(weights) && weights.length === m ? weights : new Array(m).fill(1 / m);
  // 未分散化：加权个体波动
  const wSumVol = w.reduce((s, wi, i) => s + wi * vols[i], 0);
  // 组合方差 wᵀ Σ w
  let portVar = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      portVar += w[i] * w[j] * correlationMatrix[i][j] * vols[i] * vols[j];
    }
  }
  const portVol = Math.sqrt(Math.max(0, portVar));
  return portVol === 0 ? 0 : wSumVol / portVol;
}
