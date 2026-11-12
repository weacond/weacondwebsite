// lib/rPosition.js — R-Multiple 头寸管理（R-based position sizing，纯函数）
//
// 给定 R-multiple R 和账户：
// 风险金额 = account × riskPct
// 预期盈利 = 风险金额 × R
// 最大亏损 = 风险金额
// 期望值 = winRate × 盈利 − (1−winRate) × 亏损
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:rPosition:v1";
function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}
// 风险金额 = account × riskPct。
export function riskAmount(account, riskPct) {
  const A = num(account);
  const r = num(riskPct);
  if (A <= 0 || r <= 0) return 0;
  return A * r;
}
// 预期盈利 = 风险金额 × R。
export function expectedProfit(account, riskPct, rMultiple) {
  const amt = riskAmount(account, riskPct);
  const R = num(rMultiple);
  if (amt <= 0 || R <= 0) return 0;
  return amt * R;
}
// 最大亏损 = 风险金额。
export function maxLoss(account, riskPct) {
  return riskAmount(account, riskPct);
}
// 每笔期望值 = winRate × 盈利 − (1−winRate) × 亏损。
export function perTradeExpectancy(account, riskPct, rMultiple, winRate) {
  const profit = expectedProfit(account, riskPct, rMultiple);
  const loss = maxLoss(account, riskPct);
  const w = num(winRate);
  return w * profit - (1 - w) * loss;
}
// 盈亏比 = 盈利 / 亏损。
export function rewardRiskRatio(rMultiple) {
  const R = num(rMultiple);
  if (R <= 0) return 0;
  return R;
}
// 头寸占比分级（按 riskPct）。
export function rPositionBand(riskPct) {
  const r = num(riskPct);
  if (r <= 0) return "none";
  if (r < 0.005) return "tiny";
  if (r < 0.01) return "small";
  if (r < 0.02) return "moderate";
  if (r < 0.05) return "large";
  return "full";
}
// 综合视图。
export function rPositionSummary(inputs = {}) {
  const { account = 100000, riskPct = 0.01, rMultiple = 2, winRate = 0.5 } = inputs;
  const A = num(account);
  const r = num(riskPct);
  const R = num(rMultiple);
  const valid = A > 0 && r > 0 && R > 0;
  if (!valid) return { valid: false };
  const amt = riskAmount(A, r);
  const profit = expectedProfit(A, r, R);
  const loss = maxLoss(A, r);
  const exp = perTradeExpectancy(A, r, R, num(winRate));
  return {
    account: A,
    riskPct: r,
    rMultiple: R,
    riskAmount: amt,
    expectedProfit: profit,
    maxLoss: loss,
    expectancy: exp,
    rewardRisk: rewardRiskRatio(R),
    band: rPositionBand(r),
    valid: true,
  };
}
// 预设：不同 R 和风控场景。
export const R_POSITION_PRESETS = {
  standard: { id: "standard", label: "标准 R=2", account: 100000, riskPct: 0.01, rMultiple: 2, winRate: 0.5 },
  highR: { id: "highR", label: "高 R=4", account: 100000, riskPct: 0.01, rMultiple: 4, winRate: 0.4 },
  lowR: { id: "lowR", label: "低 R=1", account: 100000, riskPct: 0.01, rMultiple: 1, winRate: 0.6 },
  tight: { id: "tight", label: "紧风控 0.5%", account: 100000, riskPct: 0.005, rMultiple: 3, winRate: 0.55 },
  loose: { id: "loose", label: "宽风控 3%", account: 50000, riskPct: 0.03, rMultiple: 2, winRate: 0.45 },
};
export { num };
