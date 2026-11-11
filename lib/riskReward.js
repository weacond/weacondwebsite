// lib/riskReward.js — 单笔交易的 风险:收益（R:R）与盈亏平衡胜率
// 纯函数、确定性，便于单元测试与前端实时计算。
// 概念：一笔交易先定 入场/止损/目标，得到
//   risk   = |entry − stop|
//   reward = |target − entry|
//   R:R    = reward / risk
//   盈亏平衡胜率 = 1 / (1 + R:R)  —— 达到此胜率即期望收益为 0
// 方向：target 在 entry 上方为多头（long），下方为空头（short）。

/**
 * 计算单笔交易的风险/收益/盈亏平衡胜率。
 * @param {number} entry  入场价
 * @param {number} stop   止损价
 * @param {number} target 目标价
 * @returns {{valid:boolean, reason?:string, direction?:("long"|"short"), risk?:number, reward?:number, rr?:number, breakevenWinRate?:number, edge?:number}|null}
 *   入参非有限数或 risk≤0（stop===entry）→ { valid:false, reason }。
 *   edge 为「期望每单位风险收益」= R:R − 1（>0 表示风险收益比有利）。
 */
export function riskReward(entry, stop, target) {
  const e = Number(entry), s = Number(stop), t = Number(target);
  if (![e, s, t].every(Number.isFinite)) return { valid: false, reason: "invalid" };
  const risk = Math.abs(e - s);
  const reward = Math.abs(t - e);
  if (risk <= 0) return { valid: false, reason: "no_risk" };
  const direction = t > e ? "long" : t < e ? "short" : "flat";
  const rr = reward / risk;
  const breakevenWinRate = 1 / (1 + rr);
  return {
    valid: true,
    direction,
    risk,
    reward,
    rr,
    breakevenWinRate,
    edge: rr - 1,
  };
}

/**
 * 给定目标胜率，反推「盈亏平衡所需的最小 R:R」。
 *   期望 > 0 ⇔ wr·reward > (1−wr)·risk ⇔ R:R > (1−wr)/wr
 * @param {number} winRate 胜率（0~1，如 0.5 = 50%）
 * @returns {number|null} 所需最小 R:R；winRate∉(0,1) → null
 */
export function requiredReward(winRate) {
  const w = Number(winRate);
  if (!Number.isFinite(w) || w <= 0 || w >= 1) return null;
  return (1 - w) / w;
}
