// lib/lotSize.js — 手数 / 合约乘数（纯函数）
//
// 概念：
//   名义价值 = 手数 × 价格 × 合约乘数
//   每手风险 = |价格 − 止损| × 合约乘数
//   由风险定手数 = 风险金额 / 每手风险
//   所需保证金 = 名义价值 / 杠杆
//   占账户比 = 名义价值 / 账户
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:lotSize:v1";
// 名义价值 = 手数 × 价格 × 乘数
export function notional(units, price, multiplier = 1) {
  const u = Number(units), p = Number(price), m = Number(multiplier);
  if (!Number.isFinite(u) || !Number.isFinite(p) || !Number.isFinite(m)) return 0;
  return Math.abs(u) * Math.abs(p) * Math.abs(m);
}
// 每手风险 = |价格 − 止损| × 乘数
export function riskPerLot(price, stop, multiplier = 1) {
  const p = Number(price), s = Number(stop), m = Number(multiplier);
  if (!Number.isFinite(p) || !Number.isFinite(s) || !Number.isFinite(m) || p === s) return 0;
  return Math.abs(p - s) * Math.abs(m);
}
// 由风险金额定手数 = 风险金额 / 每手风险
export function unitsFromRisk(riskAmount, price, stop, multiplier = 1) {
  const rpl = riskPerLot(price, stop, multiplier);
  if (rpl <= 0) return 0;
  const ra = Number(riskAmount);
  if (!Number.isFinite(ra) || ra < 0) return 0;
  return ra / rpl;
}
// 由手数反推风险 = 手数 × 每手风险
export function riskFromUnits(units, price, stop, multiplier = 1) {
  const u = Number(units);
  if (!Number.isFinite(u)) return 0;
  return Math.abs(u) * riskPerLot(price, stop, multiplier);
}
// 所需保证金 = 名义价值 / 杠杆
export function marginRequired(notional, leverage) {
  const n = Number(notional), lv = Number(leverage);
  if (!Number.isFinite(n) || !Number.isFinite(lv) || lv <= 0) return 0;
  return n / lv;
}
// 占账户比 = 名义价值 / 账户
export function accountExposure(notional, account) {
  const n = Number(notional), a = Number(account);
  if (!Number.isFinite(n) || !Number.isFinite(a) || a <= 0) return 0;
  return n / a;
}
// 账户暴露分级
export function lotSizeBand(exposurePct) {
  const e = Number(exposurePct);
  if (!Number.isFinite(e)) return "invalid";
  if (e <= 0) return "none";
  if (e < 0.25) return "light";
  if (e < 0.5) return "moderate";
  if (e < 1) return "heavy";
  return "over-leveraged";
}
// 综合视图
export function lotSizeSummary(inputs = {}) {
  const { account, riskPct, price, stop, multiplier = 1, leverage = 1 } = inputs;
  const ra = riskPct > 0 && account > 0 ? account * Number(riskPct) : 0;
  const units = unitsFromRisk(ra, price, stop, multiplier);
  const n = notional(units, price, multiplier);
  const margin = marginRequired(n, leverage);
  const exposure = accountExposure(n, account);
  return {
    riskAmount: ra,
    riskPerLot: riskPerLot(price, stop, multiplier),
    units,
    notional: n,
    margin,
    exposure,
    band: lotSizeBand(exposure),
    valid: ra > 0 && Number.isFinite(units),
  };
}
// 预设
export const LOT_SIZE_PRESETS = {
  stock: { id: "stock", label: "股票 1%", account: 100000, riskPct: 0.01, price: 100, stop: 95, multiplier: 1, leverage: 1 },
  futures: { id: "futures", label: "期货 10×", account: 100000, riskPct: 0.01, price: 10000, stop: 9900, multiplier: 10, leverage: 10 },
  crypto: { id: "crypto", label: "合约 20×", account: 50000, riskPct: 0.02, price: 30000, stop: 29500, multiplier: 1, leverage: 20 },
  forex: { id: "forex", label: "外汇 100×", account: 10000, riskPct: 0.01, price: 1.1, stop: 1.09, multiplier: 100000, leverage: 100 },
  conservative: { id: "conservative", label: "保守 0.5%", account: 100000, riskPct: 0.005, price: 50, stop: 49, multiplier: 1, leverage: 1 },
};