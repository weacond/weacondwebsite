// lib/takeProfit.js — 止盈目标 / R:R 目标价（纯函数）
//
// 概念（多头 long：entry > stop；空头 short：entry < stop）：
//   每单位风险 R0 = |entry − stop|
//   止盈价  TP = entry ± targetR × R0（多头 +，空头 −）
//   每单位盈利 = targetR × R0
//   R:R 比  = |TP − entry| / R0 = targetR
//   止盈回报% = 每单位盈利 / entry
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:takeProfit:v1";
// 每单位风险 = |entry − stop|
export function riskPerUnit(entry, stop) {
  const e = Number(entry), s = Number(stop);
  if (!Number.isFinite(e) || !Number.isFinite(s) || e === s) return 0;
  return Math.abs(e - s);
}
// 止盈价 = entry ± targetR × R0
export function takeProfitPrice(entry, stop, targetR, side = "long") {
  const r = riskPerUnit(entry, stop);
  if (r <= 0) return 0;
  const dir = side === "short" ? -1 : 1;
  return Number(entry) + dir * Number(targetR) * r;
}
// 每单位盈利 = targetR × R0
export function rewardPerUnit(targetR, risk) {
  const t = Number(targetR), r = Number(risk);
  if (!Number.isFinite(t) || !Number.isFinite(r) || r <= 0) return 0;
  return t * r;
}
// R:R 比 = |target − entry| / R0
export function rrRatio(entry, stop, target, side = "long") {
  const r = riskPerUnit(entry, stop);
  if (r <= 0) return 0;
  const t = Number(target), e = Number(entry);
  return Math.abs(t - e) / r;
}
// 止盈回报% = 每单位盈利 / entry
export function tpReturnPct(entry, stop, targetR, side = "long") {
  const e = Number(entry);
  if (!Number.isFinite(e) || e === 0) return 0;
  return rewardPerUnit(targetR, riskPerUnit(entry, stop)) / e;
}
// R:R 分级
export function takeProfitBand(rr) {
  const r = Number(rr);
  if (!Number.isFinite(r)) return "invalid";
  if (r <= 0) return "zero";
  if (r < 1) return "poor";
  if (r < 2) return "fair";
  if (r < 3) return "good";
  return "excellent";
}
// 综合视图
export function takeProfitSummary(inputs = {}) {
  const { entry, stop, targetR, side = "long" } = inputs;
  const r = riskPerUnit(entry, stop);
  if (r <= 0) return { valid: false };
  const tp = takeProfitPrice(entry, stop, targetR, side);
  const rr = Number(targetR);
  return {
    riskPerUnit: r,
    takeProfit: tp,
    rewardPerUnit: rewardPerUnit(rr, r),
    rrRatio: rr,
    tpReturnPct: tpReturnPct(entry, stop, rr, side),
    band: takeProfitBand(rr),
    valid: true,
  };
}
// 预设
export const TAKE_PROFIT_PRESETS = {
  rr2: { id: "rr2", label: "2R 止盈", entry: 100, stop: 95, targetR: 2, side: "long" },
  rr3: { id: "rr3", label: "3R 止盈", entry: 100, stop: 97, targetR: 3, side: "long" },
  shortRr2: { id: "shortRr2", label: "空头 2R", entry: 100, stop: 105, targetR: 2, side: "short" },
  rr5: { id: "rr5", label: "5R 波段", entry: 50, stop: 48, targetR: 5, side: "long" },
  rr1: { id: "rr1", label: "1R 短线", entry: 100, stop: 99, targetR: 1, side: "long" },
};