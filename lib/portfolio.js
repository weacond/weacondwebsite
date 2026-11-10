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

/**
 * 波动率目标缩放：把现有权重整体乘以 scale 使组合波动率 = targetVol。
 * scale = targetVol / 当前组合波动率；用于 vol targeting。
 * @param {number[]} vols
 * @param {number[][]} correlationMatrix
 * @param {number[]} [weights] 当前权重（缺省等权）
 * @param {number} targetVol 目标波动率（须 > 0）
 * @returns {number} 缩放系数；targetVol≤0 或当前 σ_p≤0 → 0（无法放大）
 */
export function volTargetScale(vols, correlationMatrix, weights, targetVol) {
  if (!(targetVol > 0)) return 0;
  const cur = portfolioVolatility(vols, correlationMatrix, weights);
  if (!(cur > 0)) return 0;
  return targetVol / cur;
}

/**
 * 逆波动率权重：w_i ∝ 1/σ_i（归一化，和=1）。波动率越高权重越低，
 * 使各资产对组合波动的边际贡献更均衡（不相关时即风险平价近似）。
 * 仅 σ>0 的资产计入；全 ≤0/非有限 或 空 → 退回等权 1/N。
 * @param {number[]} vols 各资产波动率
 * @returns {number[]} 归一化权重（和=1）；空 → []
 */
export function inverseVolWeights(vols) {
  const arr = Array.isArray(vols) ? vols : [];
  const n = arr.length;
  if (n === 0) return [];
  const w = arr.map((v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? 1 / v : 0));
  const sum = w.reduce((a, b) => a + b, 0);
  if (sum === 0) return Array.from({ length: n }, () => 1 / n);
  return w.map((x) => x / sum);
}

/**
 * 各资产对组合波动的风险贡献 RC_i = w_i·(Σw)_i / σ_p。
 * 不变式：Σ RC_i = σ_p（Σᵢ w_i(Σw)_i = wᵀΣw = σ_p²）。风险平价即令各 RC_i 相等。
 * 复用 portfolioVolatility 求 σ_p 与同一归一化权重。
 * @param {number[]} vols 各序列波动率（长度 N）
 * @param {number[][]} correlationMatrix N×N 相关矩阵
 * @param {number[]} [weights] 权重（缺省等权）
 * @returns {number[]} 长度 N 的风险贡献数组；维度不匹配 → []；σ_p≤0 → 全 0
 */
export function riskContribution(vols, correlationMatrix, weights) {
  const m = Array.isArray(correlationMatrix) ? correlationMatrix.length : 0;
  if (m === 0 || !Array.isArray(vols) || vols.length !== m) return [];
  const w = normalizeWeights(weights, m);
  // 边际风险贡献 mrv_i = (Σw)_i = Σ_j Σ_ij·w_j
  const mrv = [];
  for (let i = 0; i < m; i++) {
    let s = 0;
    for (let j = 0; j < m; j++) {
      const cij = correlationMatrix[i]?.[j];
      const val = typeof cij === "number" && Number.isFinite(cij) ? cij : 0;
      s += val * (vols[i] || 0) * (vols[j] || 0) * w[j];
    }
    mrv[i] = s;
  }
  const pv = portfolioVolatility(vols, correlationMatrix, weights);
  if (!(pv > 0)) return Array.from({ length: m }, () => 0);
  return mrv.map((mv, i) => (w[i] * mv) / pv);
}

/**
 * 风险平价权重：迭代求解使各资产风险贡献 RC_i 相等（RC_i = σ_p/N）。
 * 采用阻尼 RC 归一化：w_i ← w_i·(RC_i/target)^(−0.5) 后归一化，从逆波动权重起步，
 * 收敛快且稳定。不相关情形解析解即 inverseVolWeights。
 *
 * 不变式：返回权重和=1、全 ≥0；N=2 时 w_i ∝ σ_j（与相关系数 ρ 无关，交叉项相消）。
 * 仅 σ>0 资产参与；全 ≤0/非有限 → 等权 1/N；维度不匹配或空 → []。
 * @param {number[]} vols 各资产波动率（长度 N）
 * @param {number[][]} correlationMatrix N×N 相关矩阵
 * @param {{tol?: number, maxIter?: number}} [opts] 收敛容差与最大迭代数
 * @returns {number[]} 长度 N 的风险平价权重（和=1）；空 → []
 */
export function riskParityWeights(vols, correlationMatrix, opts = {}) {
  const m = Array.isArray(correlationMatrix) ? correlationMatrix.length : 0;
  if (m === 0 || !Array.isArray(vols) || vols.length !== m) return [];
  const tol = typeof opts?.tol === "number" && Number.isFinite(opts.tol) && opts.tol > 0 ? opts.tol : 1e-8;
  const maxIter = typeof opts?.maxIter === "number" && opts.maxIter > 0 ? Math.floor(opts.maxIter) : 100;

  // 全 ≤0/非有限 波动 → 等权
  const volsClean = vols.map((v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0));
  if (volsClean.every((v) => v === 0)) return Array.from({ length: m }, () => 1 / m);

  // mrv_i = (Σw)_i，沿用 riskContribution 的求和口径
  const mrvOf = (w) => {
    const mrv = new Array(m);
    for (let i = 0; i < m; i++) {
      let s = 0;
      for (let j = 0; j < m; j++) {
        const cij = correlationMatrix[i]?.[j];
        const val = typeof cij === "number" && Number.isFinite(cij) ? cij : 0;
        s += val * volsClean[i] * volsClean[j] * w[j];
      }
      mrv[i] = s;
    }
    return mrv;
  };

  // 起点：逆波动权重，非正兜底为小正数保证收敛
  let w = inverseVolWeights(volsClean);
  for (let i = 0; i < m; i++) if (!(w[i] > 0)) w[i] = 1e-8;

  for (let iter = 0; iter < maxIter; iter++) {
    const pv = portfolioVolatility(volsClean, correlationMatrix, w);
    if (!(pv > 0)) break;
    const mrv = mrvOf(w);
    const target = pv / m;
    let maxRel = 0;
    const nw = new Array(m);
    for (let i = 0; i < m; i++) {
      const rc = (w[i] * mrv[i]) / pv;
      const ratio = target > 0 ? rc / target : 1;
      nw[i] = w[i] * Math.pow(ratio > 0 ? ratio : 1, -0.5);
      const rel = target > 0 ? Math.abs(rc / target - 1) : 0;
      if (rel > maxRel) maxRel = rel;
    }
    const sum = nw.reduce((a, b) => a + b, 0);
    if (!(sum > 0) || !Number.isFinite(sum)) break;
    w = nw.map((x) => x / sum);
    if (maxRel < tol) break;
  }
  return w;
}

/**
 * 最优（切点）组合权重：在"全正、和=1"的长头寸权重空间内，搜索使组合夏普
 * portfolioSharpe 最大的权重（经典 tangency / 有效前沿切点组合）。
 * 采用坐标上升法（coordinate ascent）：从逆波动权重起步，逐坐标在 [0,1] 上
 * 网格扫描，其余坐标保持当前相对比例并归一化，仅取改进步，故结果夏普单调
 * 不减、≥ 起点（逆波动）夏普。无杠杆（long-only）。
 *
 * 不变式：返回权重和=1、全 ≥0、长度 N；空/维度不匹配 → []。
 * @param {number[][]} returnsList N 个等长收益率序列
 * @param {number[]} vols 各序列波动率（长度 N）
 * @param {number[][]} correlationMatrix N×N 相关矩阵
 * @param {{rf?:number, periods?:number, grid?:number, maxIter?:number}} [opts]
 * @returns {number[]} 最优权重（和=1）；空 → []
 */
export function maxSharpeWeights(returnsList, vols, correlationMatrix, opts = {}) {
  const n = Array.isArray(returnsList) ? returnsList.length : 0;
  const m = Array.isArray(correlationMatrix) ? correlationMatrix.length : 0;
  if (n === 0 || m === 0 || !Array.isArray(vols) || vols.length !== n || vols.length !== m) return [];
  const rf = typeof opts.rf === "number" && Number.isFinite(opts.rf) ? opts.rf : 0;
  const periods =
    typeof opts.periods === "number" && Number.isFinite(opts.periods) && opts.periods > 0 ? opts.periods : 252;
  const grid = typeof opts.grid === "number" && opts.grid > 0 ? Math.floor(opts.grid) : 20;
  const maxIter = typeof opts.maxIter === "number" && opts.maxIter > 0 ? Math.floor(opts.maxIter) : 20;

  const sharpeOf = (w) => portfolioSharpe(returnsList, vols, correlationMatrix, w, rf, periods);

  // 起点：逆波动权重（已归一、全 ≥0）；全 0 波动时退回等权，保证有合法起点。
  let bestW = inverseVolWeights(vols);
  if (bestW.length !== n || bestW.every((x) => !(x > 0))) bestW = Array.from({ length: n }, () => 1 / n);
  let bestS = sharpeOf(bestW);

  for (let iter = 0; iter < maxIter; iter++) {
    let improved = false;
    for (let i = 0; i < n; i++) {
      const othersSum = bestW.reduce((a, wj, j) => (j === i ? a : a + wj), 0);
      for (let g = 0; g <= grid; g++) {
        const wi = g / grid;
        const cand = new Array(n).fill(0);
        cand[i] = wi;
        if (othersSum > 0) {
          for (let j = 0; j < n; j++) if (j !== i) cand[j] = (bestW[j] / othersSum) * (1 - wi);
        }
        const s = sharpeOf(cand);
        if (s > bestS) {
          bestS = s;
          bestW = cand;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  // 收尾归一化，消除浮点累积误差，保证和=1。
  const sum = bestW.reduce((a, b) => a + b, 0);
  return sum > 0 && Number.isFinite(sum) ? bestW.map((x) => x / sum) : Array.from({ length: n }, () => 1 / n);
}

/**
 * 最小方差组合权重：在"全正、和=1"的长头寸空间内，搜索使组合方差
 * (portfolioVolatility²) 最小的权重（global minimum-variance portfolio）。
 * 坐标下降法：从逆波动权重起步，逐坐标在 [0,1] 网格扫描，仅取改进步，故结果
 * 方差不增、≤ 起点（逆波动）方差。无杠杆。与 maxSharpeWeights（追求夏普）互补：
 * 本函数纯粹追求波动最小，常把权重压向低波动、低相关资产。
 *
 * 不变式：返回权重和=1、全 ≥0、长度 N；空/维度不匹配 → []。
 * @param {number[]} vols 各资产波动率（长度 N）
 * @param {number[][]} correlationMatrix N×N 相关矩阵
 * @param {{grid?:number, maxIter?:number}} [opts] 网格点数与最大迭代数
 * @returns {number[]} 最小方差权重（和=1）；空 → []
 */
export function minimumVarianceWeights(vols, correlationMatrix, opts = {}) {
  const n = Array.isArray(vols) ? vols.length : 0;
  const m = Array.isArray(correlationMatrix) ? correlationMatrix.length : 0;
  if (n === 0 || m === 0 || vols.length !== n || vols.length !== m) return [];
  const grid = typeof opts.grid === "number" && opts.grid > 0 ? Math.floor(opts.grid) : 20;
  const maxIter = typeof opts.maxIter === "number" && opts.maxIter > 0 ? Math.floor(opts.maxIter) : 20;

  const vol2Of = (w) => {
    const pv = portfolioVolatility(vols, correlationMatrix, w);
    return pv * pv;
  };

  // 起点：逆波动权重（已归一、全 ≥0）；全 0 波动时退回等权。
  let bestW = inverseVolWeights(vols);
  if (bestW.length !== n || bestW.every((x) => !(x > 0))) bestW = Array.from({ length: n }, () => 1 / n);
  let best = vol2Of(bestW);

  for (let iter = 0; iter < maxIter; iter++) {
    let improved = false;
    for (let i = 0; i < n; i++) {
      const othersSum = bestW.reduce((a, wj, j) => (j === i ? a : a + wj), 0);
      for (let g = 0; g <= grid; g++) {
        const wi = g / grid;
        const cand = new Array(n).fill(0);
        cand[i] = wi;
        if (othersSum > 0) {
          for (let j = 0; j < n; j++) if (j !== i) cand[j] = (bestW[j] / othersSum) * (1 - wi);
        }
        const v = vol2Of(cand);
        if (v < best) {
          best = v;
          bestW = cand;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  // 收尾归一化，消除浮点累积误差，保证和=1。
  const sum = bestW.reduce((a, b) => a + b, 0);
  return sum > 0 && Number.isFinite(sum) ? bestW.map((x) => x / sum) : Array.from({ length: n }, () => 1 / n);
}

/**
 * 风险-收益点：给定若干权重方案，返回各自的（年化波动率%、组合夏普）。
 * 用于 /compare 的"风险-收益散点 / 有效前沿"，直观对比各权重方案的性价比。
 * vol/sharpe 口径与 portfolioVolatility / portfolioSharpe 完全一致（vols 由调用方传入，
 * 通常已年化；periods 仅作用于夏普的 √periods 年化）。
 * @param {number[][]} returnsList N 个等长收益率序列
 * @param {number[]} vols 各资产波动率（同口径）
 * @param {number[][]} correlationMatrix N×N 相关矩阵
 * @param {(string|{label?:string, weights?:number[]})[]} weightings 权重方案列表
 * @param {number} [periods=252] 年化期数（仅夏普）
 * @returns {{label:string, vol:number, sharpe:number}[]} 各方案点；空 weightings → []
 */
export function riskRewardPoints(returnsList, vols, correlationMatrix, weightings, periods = 252) {
  if (!Array.isArray(weightings) || weightings.length === 0) return [];
  return weightings.map((wg) => {
    const isArr = Array.isArray(wg);
    const label = !isArr && wg && typeof wg === "object" ? wg.label || "" : "";
    const w = isArr ? wg : wg && typeof wg === "object" ? wg.weights : wg;
    const vol = portfolioVolatility(vols, correlationMatrix, w) * 100;
    const sharpe = portfolioSharpe(returnsList, vols, correlationMatrix, w, 0, periods);
    return { label, vol, sharpe };
  });
}

/**
 * Herfindahl 指数 HHI = Σwᵢ²（基于归一化权重）∈ [1/N, 1]。
 * 1 = 全集中（单一资产）；1/N = 全分散（等权 N 个）。衡量组合集中度。
 * 权重自动归一化（忽略非有限）；空权重 → 0。
 * @param {number[]} weights 权重（自动归一化；忽略非有限）
 * @returns {number} HHI；空 → 0
 */
export function herfindahlIndex(weights) {
  const n = Array.isArray(weights) ? weights.length : 0;
  if (n === 0) return 0;
  const w = normalizeWeights(weights, n);
  return w.reduce((a, x) => a + x * x, 0);
}

/**
 * 等效资产数 = 1/HHI（Herfindahl 的倒数）。比 HHI 更直观：
 *   HHI=0.25 → 4 个等效标的；=1（全集中）→ 1；=1/N（全分散）→ N。
 * 空权重或 HHI=0 → 0。
 * @param {number[]} weights 权重（自动归一化；忽略非有限）
 * @returns {number} 等效资产数；空或 HHI=0 → 0
 */
export function effectiveNumAssets(weights) {
  const hhi = herfindahlIndex(weights);
  return hhi > 0 ? 1 / hhi : 0;
}
