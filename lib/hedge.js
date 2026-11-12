// 最小方差对冲比率 / 相关性对冲 —— 纯函数，确定性可复现
//
// 给定两资产 A、B 的收益相关 ρ 与波动 σ_a、σ_b：
//   对冲比率  h* = ρ · σ_a / σ_b   （为对冲 1 单位 A 所需 B 的数量）
//   完全对冲后残余方差  σ_hedged² = σ_a² · (1 − ρ²)
//   最小方差组合权重  w_a* = (σ_b² − ρσ_aσ_b) / (σ_a² + σ_b² − 2ρσ_aσ_b)
// 同时对比「朴素 50/50」与「最小方差组合」的风险。
//
// 与 correlationLab 的分工：correlationLab 算分散化比 DR / HHI / 逆波动权重；
// 本模块给出「最小方差对冲比率」的闭式解 + 残余风险 + 权重对比。
//
// 口径：σ_a、σ_b > 0；ρ ∈ [−1, 1]。全部纯函数，给定输入结果唯一。

/**
 * 校验对冲输入。
 * @returns {boolean}
 */
export function validHedge(o = {}) {
  return (
    o != null &&
    Number.isFinite(o.rho) && o.rho >= -1 && o.rho <= 1 &&
    Number.isFinite(o.volA) && o.volA > 0 &&
    Number.isFinite(o.volB) && o.volB > 0
  );
}

/**
 * 计算对冲比率、残余方差、最小方差组合权重与朴素 50/50 对比。
 * @param {object} o { rho, volA, volB }
 * @returns {{ hedgeRatio:number, residualVar:number, residualVol:number,
 *   naiveVol:number, wA:number, wB:number, minVol:number, reductionPct:number }}
 *   非法输入 → 抛错。
 */
export function hedgeRatio(o = {}) {
  if (!validHedge(o)) throw new Error("invalid hedge inputs");
  const { rho, volA, volB } = o;

  // 最小方差对冲比率
  const h = (rho * volA) / volB;
  // 完全对冲后残余方差 = σ_a²(1−ρ²)
  const residualVar = volA * volA * (1 - rho * rho);
  const residualVol = Math.sqrt(residualVar);

  // 朴素 50/50 组合方差
  const naiveVar = 0.25 * (volA * volA + volB * volB + 2 * rho * volA * volB);

  // 最小方差组合权重
  const denom = volA * volA + volB * volB - 2 * rho * volA * volB;
  let wA = 0.5;
  let wB = 0.5;
  if (Math.abs(denom) > 1e-12) {
    wA = (volB * volB - rho * volA * volB) / denom;
    wB = 1 - wA;
  }
  const minVar = wA * wA * volA * volA + wB * wB * volB * volB + 2 * rho * volA * volB * wA * wB;

  return {
    hedgeRatio: h,
    residualVar,
    residualVol,
    naiveVol: Math.sqrt(naiveVar),
    wA,
    wB,
    minVol: Math.sqrt(minVar),
    reductionPct: naiveVar > 0 ? (1 - minVar / naiveVar) * 100 : 0,
  };
}

/**
 * 由结果派生一句对冲结论。
 * @returns {string}
 */
export function hedgeInsight(r, rho) {
  if (rho <= 0) return "ρ≤0：两资产负/无相关，分散化天然有效，无需方向性对冲。";
  const h = r.hedgeRatio;
  if (Math.abs(h - 1) < 0.01) return "ρ 高且波动相近：约 1:1 即可对冲 A，残余风险最低。";
  if (h > 1) return `σ_a 相对较大：每 1 单位 A 需约 ${h.toFixed(2)} 单位 B 对冲。`;
  return `σ_b 相对较大：每 1 单位 A 仅需约 ${h.toFixed(2)} 单位 B 对冲。`;
}

/**
 * 常见情景速查（点击套用）。
 */
export const HEDGE_PRESETS = [
  { id: "equityBond", label: "股债低相关", rho: 0.1, volA: 15, volB: 5 },
  { id: "goldHedge", label: "黄金避险", rho: -0.2, volA: 15, volB: 18 },
  { id: "highCorr", label: "高相关", rho: 0.9, volA: 20, volB: 22 },
];
