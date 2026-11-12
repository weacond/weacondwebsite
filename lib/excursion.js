// lib/excursion.js — 最大有利/不利偏移（MFE/MAE）与捕获率（纯函数，可单元测试）
//
// 用于评估单笔交易的“入场质量”与“出场质量”：
//   MFE（Max Favourable Excursion）= 持仓过程中相对入场的最大浮盈幅度
//   MAE（Max Adverse Excursion）   = 持仓过程中相对入场的最大浮亏幅度
//   捕获率（capture）= 实际盈亏 / MFE，衡量“赚到了过程最大浮盈的几成”
// 全部确定性、零外部依赖，便于 SSR 与单元测试。

export const STORAGE_KEY = "weacond:excursion:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 单笔交易的 MFE / MAE（均为“幅度”，≥0）。
// 多头：MFE=high−entry，MAE=entry−low；空头相反。
export function excursion(side, entry, high, low) {
  const e = num(entry);
  const h = num(high);
  const l = num(low);
  const short = side === "short";
  const mfe = Math.max(0, short ? e - l : h - e);
  const mae = Math.max(0, short ? h - e : e - l);
  return {
    mfe,
    mae,
    mfePct: e > 0 ? mfe / e : NaN,
    maePct: e > 0 ? mae / e : NaN,
    valid: e > 0 && h >= l,
  };
}

// 出场实际盈亏 + 对 MFE 的捕获率。
export function capture(side, entry, exit, high, low) {
  const ex = excursion(side, entry, high, low);
  const e = num(entry);
  const x = num(exit);
  const short = side === "short";
  const pnl = short ? e - x : x - e;
  const ratio = ex.mfe > 0 ? pnl / ex.mfe : NaN;
  return { pnl, mfe: ex.mfe, capture: ratio, valid: ex.valid && Number.isFinite(x) };
}

// 捕获率分级：missed（负/0）、partial（<0.5）、good（0.5–1）、full（≥1）。
export function captureBand(ratio) {
  const r = num(ratio);
  if (!Number.isFinite(ratio)) return "na";
  if (r <= 0) return "missed";
  if (r < 0.5) return "partial";
  if (r < 1) return "good";
  return "full";
}

// 组合视图：MFE/MAE + 捕获。
export function excursionSummary(inputs = {}) {
  const { side, entry, high, low, exit } = inputs;
  const ex = excursion(side, entry, high, low);
  const cap = capture(side, entry, exit, high, low);
  const band = exit != null ? captureBand(cap.capture) : null;
  return { ...ex, cap, band, valid: ex.valid };
}

// 预设：不同偏移形态。
export const EXCURSION_PRESETS = {
  longDay: { id: "longDay", label: "日内多头", side: "long", entry: 100, high: 104, low: 98, exit: 102 },
  shortSwing: { id: "shortSwing", label: "波段空头", side: "short", entry: 200, high: 210, low: 190, exit: 195 },
  bigWin: { id: "bigWin", label: "大盈利", side: "long", entry: 50, high: 60, low: 49, exit: 59 },
  whipsaw: { id: "whipsaw", label: "假突破", side: "long", entry: 100, high: 101, low: 95, exit: 96 },
};
export { num };