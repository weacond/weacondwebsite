// lib/goalSolver.js — 目标储蓄 / 复利逆解器（Goal solver / compound-interest inverse，纯函数）
//
// compound.js 正向：给定利率 → FV
// 本模块逆向：给定目标 FV → 反解利率 / 年数 / 定投额
// 所需利率 r = (FV/PV)^(1/n) − 1
// 所需年数 n = ln(FV/PV) / ln(1+r)
// 所需定投 PMT = (FV − PV·(1+r)^n) / [((1+r)^n − 1)/r]
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:goalSolver:v1";
function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}
// 所需年化利率 r = (FV/PV)^(1/n) − 1。
export function requiredRate(pv, fv, years) {
  const P = num(pv);
  const F = num(fv);
  const n = num(years);
  if (P <= 0 || F <= 0 || n <= 0) return 0;
  if (F <= P) return 0; // 目标不超过本金 → 不需要正收益
  return Math.pow(F / P, 1 / n) - 1;
}
// 所需年数 n = ln(FV/PV) / ln(1+r)。
export function requiredYears(pv, fv, rate) {
  const P = num(pv);
  const F = num(fv);
  const r = num(rate);
  if (P <= 0 || F <= 0 || r <= 0) return 0;
  if (F <= P) return 0;
  return Math.log(F / P) / Math.log(1 + r);
}
// 所需定投额 PMT = (FV − PV·(1+r)^n) / [((1+r)^n − 1)/r]。
// 若 PV 复利后已超过 FV，返回 0（不需要额外定投）。
export function requiredContribution(pv, fv, rate, years) {
  const P = num(pv);
  const F = num(fv);
  const r = num(rate);
  const n = num(years);
  if (F <= 0 || n <= 0) return 0;
  const fvPv = P * Math.pow(1 + r, n); // PV 复利到 n 年
  if (fvPv >= F) return 0; // 本金已够
  if (r <= 0) return (F - P * n) / n; // r=0 时退化为线性
  const annuityFactor = (Math.pow(1 + r, n) - 1) / r;
  if (annuityFactor <= 0) return 0;
  return (F - fvPv) / annuityFactor;
}
// 充足率：给定定投额，算 FV 是否达标。
export function sufficiency(pv, fv, rate, years, contribution) {
  const P = num(pv);
  const F = num(fv);
  const r = num(rate);
  const n = num(years);
  if (F <= 0 || n <= 0) return 0;
  const fvPv = P * Math.pow(1 + r, n);
  const fvContrib = num(contribution) * ((Math.pow(1 + r, n) - 1) / r);
  const total = fvPv + fvContrib;
  return F > 0 ? total / F : 0;
}
// 充足率分级。
export function goalBand(ratio) {
  const r = num(ratio);
  if (r <= 0) return "insufficient";
  if (r < 0.8) return "behind";
  if (r < 1.2) return "onTrack";
  return "ahead";
}
// 综合视图。
export function goalSolverSummary(inputs = {}) {
  const { pv = 50000, fv = 1000000, years = 20, rate = 0.05 } = inputs;
  const P = num(pv);
  const F = num(fv);
  const n = num(years);
  const r = num(rate);
  const valid = F > 0 && n > 0;
  if (!valid) return { valid: false };
  const reqRate = requiredRate(P, F, n);
  const reqYears = requiredYears(P, F, r);
  const reqPMT = requiredContribution(P, F, r, n);
  const gap = F - P * Math.pow(1 + r, n);
  const pctGap = gap / F;
  return {
    pv: P,
    fv: F,
    years: n,
    rate: r,
    requiredRate: reqRate,
    requiredYears: reqYears,
    requiredContribution: reqPMT,
    gap: gap,
    gapPct: pctGap,
    band: goalBand(sufficiency(P, F, r, n, reqPMT)), // = 1 by construction
    valid: true,
  };
}
// 预设：不同目标情景。
export const GOAL_PRESETS = {
  retirement: { id: "retirement", label: "退休 100万", pv: 50000, fv: 1000000, years: 20, rate: 0.05 },
  house: { id: "house", label: "购房 50万", pv: 100000, fv: 500000, years: 10, rate: 0.06 },
  education: { id: "education", label: "教育 30万", pv: 20000, fv: 300000, years: 15, rate: 0.04 },
  quick: { id: "quick", label: "快速翻倍", pv: 100000, fv: 200000, years: 5, rate: 0.08 },
  aggressive: { id: "aggressive", label: "激进 200万", pv: 100000, fv: 2000000, years: 15, rate: 0.10 },
};
export { num };
