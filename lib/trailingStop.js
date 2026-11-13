// lib/trailingStop.js — 移动止损 / 保本止损 / R 倍数（纯函数）
//
// 概念（多头 long：entry > stop；空头 short：entry < stop）：
//   每单位风险 R = |entry − stop|
//   已实现 R  = 当前盈亏 / R
//   移动止损  = 多头 max(stop, price−trail) / 空头 min(stop, price+trail)
//   保本触发  = 已实现 R ≥ 触发 R（默认 1R）时止损移到成本
//   锁定 R    = 若现按移动止损平仓能锁定的 R
// 确定性、零外部依赖。教育性参考，非投资建议。
export const STORAGE_KEY = "weacond:trailingStop:v1";
// 每单位风险 = |entry − stop|
export function riskPerUnit(entry, stop) {
  const e = Number(entry), s = Number(stop);
  if (!Number.isFinite(e) || !Number.isFinite(s) || e === s) return 0;
  return Math.abs(e - s);
}
// 止损距离占入场价比例
export function trailingStopPct(entry, stop) {
  const e = Number(entry), s = Number(stop);
  if (!Number.isFinite(e) || !Number.isFinite(s) || e === 0) return 0;
  return Math.abs(e - s) / e;
}
// 当前盈亏（多头 price−entry；空头 entry−price）
export function currentProfit(entry, price, side = "long") {
  const e = Number(entry), p = Number(price);
  if (!Number.isFinite(e) || !Number.isFinite(p)) return 0;
  return side === "short" ? e - p : p - e;
}
// 已实现 R = 当前盈亏 / 每单位风险
export function rAchieved(entry, stop, price, side = "long") {
  const r = riskPerUnit(entry, stop);
  if (r <= 0) return 0;
  return currentProfit(entry, price, side) / r;
}
// 移动止损位
export function trailingStopLevel(entry, initialStop, price, trailDistance, side = "long") {
  const s = Number(initialStop), p = Number(price), t = Number(trailDistance);
  if (!Number.isFinite(s) || !Number.isFinite(p) || !Number.isFinite(t) || t < 0) return s;
  return side === "short" ? Math.min(s, p + t) : Math.max(s, p - t);
}
// 保本是否触发（已实现 R ≥ 触发 R）
export function breakEvenTriggered(entry, stop, price, side = "long", triggerR = 1) {
  return rAchieved(entry, stop, price, side) >= Number(triggerR);
}
// 若现按移动止损平仓能锁定的 R
export function lockInR(entry, stop, trailStop, side = "long") {
  const r = riskPerUnit(entry, stop);
  if (r <= 0) return 0;
  return currentProfit(entry, trailStop, side) / r;
}
// 综合视图
export function trailingStopSummary(inputs = {}) {
  const { entry, stop, price, trailDistance, side = "long", triggerR = 1 } = inputs;
  const r = riskPerUnit(entry, stop);
  if (r <= 0) return { valid: false };
  const level = trailingStopLevel(entry, stop, price, trailDistance, side);
  const ra = rAchieved(entry, stop, price, side);
  const be = breakEvenTriggered(entry, stop, price, side, triggerR);
  const lock = lockInR(entry, stop, level, side);
  return {
    riskPerUnit: r,
    stopPct: trailingStopPct(entry, stop),
    rAchieved: ra,
    trailingStop: level,
    breakEvenTriggered: be,
    lockInR: lock,
    profit: currentProfit(entry, price, side),
    valid: true,
  };
}
// 预设
export const TRAILING_STOP_PRESETS = {
  long5: { id: "long5", label: "多头 5% 止损", entry: 100, stop: 95, price: 108, trailDistance: 5, side: "long" },
  longBreakeven: { id: "longBreakeven", label: "多头 1R 保本", entry: 100, stop: 90, price: 112, trailDistance: 10, side: "long", triggerR: 1 },
  short5: { id: "short5", label: "空头 5% 止损", entry: 100, stop: 105, price: 92, trailDistance: 5, side: "short" },
  longTight: { id: "longTight", label: "多头紧止损", entry: 100, stop: 98, price: 103, trailDistance: 2, side: "long" },
  swing: { id: "swing", label: "波段 10% 止损", entry: 50, stop: 45, price: 56, trailDistance: 8, side: "long" },
};