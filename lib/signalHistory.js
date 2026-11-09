// lib/signalHistory.js — 信号历史（确定性 mock，SSR/CSR 一致、可复现）
//
// 用途：给 /signals 提供「最近 N 日信号历史」时间线 + 命中统计。
// 生成过去 days 日触发过的信号记录（触发日/类型/强度/标的/事后收益/是否命中）。
// 确定性：基于 LCG 种子，保证服务端与客户端渲染一致、刷新可复现。
// 这是演示数据；生产可换为真实历史信号库。

import { PRESET_MARKETS } from "./marketdata.js";

// 线性同余随机数（确定性）
function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const TYPES = ["PUT", "CALL", "SPREAD", "HEGEL"];

/**
 * 生成最近 days 日的信号历史（新→旧）。
 * @param {number} days  回溯天数
 * @param {number} seed  随机种子（确定性）
 * @returns {Array}
 */
export function buildSignalHistory(days = 30, seed = 42) {
  const rnd = lcg(seed);
  // PRESET_MARKETS 是对象（按 preset 名键控）；取值为数组，排除无真实 symbol 的 CUSTOM
  const markets = Object.values(PRESET_MARKETS).filter((m) => m && m.symbol && m.symbol !== "CUSTOM");
  const out = [];
  const now = Date.now();
  for (let d = days; d >= 1; d--) {
    // 约每 2 日触发一次信号（30 日内约 12-15 条）
    if (rnd() < 0.45) continue;
    const m = markets[Math.floor(rnd() * markets.length)];
    if (!m) continue;
    const type = TYPES[Math.floor(rnd() * TYPES.length)];
    const dir = type === "PUT" ? "PUT" : type === "CALL" ? "CALL" : "NEUTRAL";
    const strength = Math.round(50 + rnd() * 48); // 50-98
    const ret = Math.round((rnd() * 22 - 7) * 10) / 10; // -7% .. +15%
    const win = ret > 0;
    const date = new Date(now - d * 86400000).toISOString().slice(0, 10);
    out.push({ id: "sig-" + d + "-" + m.symbol + "-" + type, date, symbol: m.symbol, name: m.name, type, dir, strength, ret, win, holdDays: 14 });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1)); // 新→旧
}

/** 统计：数量 / 命中率 / 平均收益 / 最佳一笔 */
export function summarizeHistory(history) {
  if (!history.length) return { count: 0, hitRate: 0, avgRet: 0, best: null };
  const wins = history.filter((h) => h.win).length;
  const avgRet = history.reduce((s, h) => s + h.ret, 0) / history.length;
  const best = [...history].sort((a, b) => b.ret - a.ret)[0];
  return { count: history.length, hitRate: wins / history.length, avgRet, best };
}
