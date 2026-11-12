// lib/portfolioBeta.js — 组合 Beta / 系统性风险分解（Portfolio beta / risk decomposition，纯函数）
//
// 给定个股权重 wᵢ 与 beta βᵢ：
// 组合 beta = Σ wᵢ·βᵢ
// 系统性回报 = β·市场回报
// 非系统波动 = √(max(0, σ_p² − (β·σ_m)²))
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:portfolioBeta:v1";
function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}
// 组合 beta = Σ wᵢ·βᵢ。
export function weightedBeta(weights, betas) {
  const w = Array.isArray(weights) ? weights : [];
  const b = Array.isArray(betas) ? betas : [];
  if (w.length === 0 || w.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < w.length; i++) sum += num(w[i]) * num(b[i]);
  return sum;
}
// 系统性回报 = beta × 市场回报。
export function systematicReturn(beta, marketReturn) {
  return num(beta) * num(marketReturn);
}
// 非系统波动 = √(max(0, σ_p² − (β·σ_m)²))。
export function residualVol(portfolioVol, beta, marketVol) {
  const pv = num(portfolioVol);
  const b = num(beta);
  const mv = num(marketVol);
  const systematic = b * mv;
  const varTotal = pv * pv;
  const varSystematic = systematic * systematic;
  const varResidual = Math.max(0, varTotal - varSystematic);
  return Math.sqrt(varResidual);
}
// beta 分级。
export function betaBand(beta) {
  const b = num(beta);
  if (b < 0.5) return "defensive";
  if (b < 0.8) return "low";
  if (b < 1.2) return "market";
  return "aggressive";
}
// 综合视图。
export function betaSummary(inputs = {}) {
  const { weights, betas, marketReturn = 0.1, marketVol = 0.15 } = inputs;
  const w = Array.isArray(weights) ? weights : [];
  const b = Array.isArray(betas) ? betas : [];
  const valid = w.length > 0 && w.length === b.length && w.every((x) => num(x) >= 0);
  if (!valid) return { valid: false };
  // 归一化权重
  const wSum = w.reduce((s, x) => s + num(x), 0);
  const wNorm = wSum > 0 ? w.map((x) => num(x) / wSum) : w.map((x) => 0);
  const beta = weightedBeta(wNorm, b.map((x) => num(x)));
  const sysRet = systematicReturn(beta, num(marketReturn));
  const resVol = residualVol(num(marketVol) * beta, beta, num(marketVol));
  return {
    weights: wNorm,
    betas: b.map((x) => num(x)),
    beta,
    marketReturn: num(marketReturn),
    marketVol: num(marketVol),
    systematicReturn: sysRet,
    residualVol: resVol,
    band: betaBand(beta),
    valid: true,
  };
}
// 预设：典型组合。
export const BETA_PRESETS = {
  defensive: { id: "defensive", label: "防御组合", weights: [0.5, 0.3, 0.2], betas: [0.6, 0.8, 1.0], marketReturn: 0.1, marketVol: 0.15 },
  balanced: { id: "balanced", label: "均衡组合", weights: [0.4, 0.3, 0.3], betas: [1.0, 1.2, 0.8], marketReturn: 0.1, marketVol: 0.15 },
  aggressive: { id: "aggressive", label: "激进组合", weights: [0.3, 0.4, 0.3], betas: [1.5, 1.8, 1.2], marketReturn: 0.1, marketVol: 0.15 },
  concentrated: { id: "concentrated", label: "集中持股", weights: [0.9, 0.1], betas: [2.0, 0.5], marketReturn: 0.1, marketVol: 0.15 },
  market: { id: "market", label: "市场组合", weights: [1], betas: [1.0], marketReturn: 0.1, marketVol: 0.15 },
};
export { num };
