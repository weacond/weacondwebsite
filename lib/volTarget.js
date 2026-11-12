// 波动率目标配置器 volTarget —— 纯函数，确定性可复现
//
// 目标：把组合/头寸的整体年化波动率控制在 targetVol。
//   单一资产：leverage = targetVol / assetVol；头寸价值 = 资金 × leverage
//   多资产（逆波动权重）：w_i ∝ 1/σ_i，再按组合波动缩放到 targetVol
//
// 与 correlationLab.inverseVolWeights 的分工：那里只产出权重；本模块把权重
// 缩放到「目标波动率」。与 risk 模块（VaR/期望回撤）配合：先定目标波动，再配权。
//
// 口径：波动率 targetVol、assetVol 均为年化（页面以百分比输入后 /100 传入）。
// 多资产组合波动近似用 Σ w_i σ_i（等权近似，忽略相关；相关在 correlationLab 处理）。
// 全部纯函数，给定输入结果唯一。

/**
 * 单资产：为达到目标波动所需的杠杆倍数。
 * @param {number} targetVol 目标年化波动（如 0.10）
 * @param {number} assetVol 资产年化波动（如 0.20）
 * @returns {number|null} leverage = targetVol/assetVol；assetVol≤0 或 targetVol<0 → null
 */
export function leverageForTarget(targetVol, assetVol) {
  if (!Number.isFinite(targetVol) || !Number.isFinite(assetVol) || assetVol <= 0 || targetVol < 0) {
    return null;
  }
  return targetVol / assetVol;
}

/**
 * 单资产：为达到目标波动所需的头寸价值。
 * @param {object} o { capital, targetVol, assetVol }
 * @returns {{ leverage:number|null, position:number, realizedVol:number }}
 *   position = capital × leverage；realizedVol ≈ targetVol（成功时）。
 */
export function positionForTarget(o = {}) {
  const capital = Number.isFinite(o.capital) ? o.capital : 0;
  const lev = leverageForTarget(o.targetVol, o.assetVol);
  if (lev == null) return { leverage: null, position: 0, realizedVol: null };
  return { leverage: lev, position: capital * lev, realizedVol: o.targetVol };
}

/**
 * 多资产逆波动权重：w_i = (1/σ_i) / Σ(1/σ_j)。
 * @param {number[]} vols 各资产年化波动（均 >0）
 * @returns {number[]|null} 权重（和为 1）；含 ≤0 或非有限 → null
 */
export function inverseVolWeights(vols) {
  if (!Array.isArray(vols) || vols.length === 0) return null;
  let sum = 0;
  for (const v of vols) {
    if (!Number.isFinite(v) || v <= 0) return null;
    sum += 1 / v;
  }
  if (sum <= 0) return null;
  return vols.map((v) => (1 / v) / sum);
}

/**
 * 组合等权近似波动：Σ w_i σ_i（忽略相关）。
 * @param {number[]} weights
 * @param {number[]} vols
 * @returns {number}
 */
export function portfolioVolApprox(weights, vols) {
  let s = 0;
  for (let i = 0; i < weights.length; i++) s += weights[i] * (vols[i] || 0);
  return s;
}

/**
 * 多资产：把逆波动权重缩放到目标组合波动。
 *   先算逆波动权重 w，组合波动 σ_p = Σ w_i σ_i；缩放系数 k = targetVol/σ_p；
 *   最终权重 = k·w（可能和不为 1，表示需要杠杆或现金）。
 * @param {number[]} vols
 * @param {number} targetVol
 * @returns {{ weights:number[], leverage:number, realizedVol:number|null, ok:boolean }}
 */
export function volTargetPortfolio(vols, targetVol) {
  const w = inverseVolWeights(vols);
  if (!w || !Number.isFinite(targetVol) || targetVol < 0) {
    return { weights: [], leverage: null, realizedVol: null, ok: false };
  }
  const sigmaP = portfolioVolApprox(w, vols);
  if (sigmaP <= 0) return { weights: w, leverage: null, realizedVol: null, ok: false };
  const k = targetVol / sigmaP;
  const weights = w.map((x) => x * k);
  const leverage = weights.reduce((a, b) => a + b, 0);
  return { weights, leverage, realizedVol: targetVol, ok: true };
}

/**
 * 校验单资产输入。
 * @returns {boolean}
 */
export function validVolTarget(o = {}) {
  return (
    Number.isFinite(o.capital) && o.capital >= 0 &&
    Number.isFinite(o.targetVol) && o.targetVol >= 0 &&
    Number.isFinite(o.assetVol) && o.assetVol > 0
  );
}

/**
 * 由单资产结果派生一句结论。
 * @returns {string}
 */
export function volTargetInsight(r, targetVol, assetVol) {
  if (!r || r.leverage == null) return "资产波动需为正。";
  const lev = r.leverage;
  if (lev >= 1.5) return `杠杆 ${lev.toFixed(2)}× 偏高，放大回撤与破产风险。`;
  if (lev <= 0.5) return `仅需 ${lev.toFixed(2)}× 即可达标，可保留较多现金。`;
  return `杠杆 ${lev.toFixed(2)}× 将波动从 ${(assetVol * 100).toFixed(1)}% 控制到 ${(targetVol * 100).toFixed(1)}%。`;
}

/**
 * 预设：常见目标波动情景。
 */
export const VOL_PRESETS = [
  { id: "balanced", label: "平衡 10%", targetVol: 0.1, assetVol: 0.15, capital: 100000 },
  { id: "lowrisk", label: "低风险 5%", targetVol: 0.05, assetVol: 0.15, capital: 100000 },
  { id: "aggressive", label: "进取 20%", targetVol: 0.2, assetVol: 0.3, capital: 100000 },
];
