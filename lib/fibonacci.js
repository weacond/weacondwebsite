// lib/fibonacci.js — 斐波那契回撤与扩展（趋势交易）
// 纯函数、确定性，便于单元测试与前端实时计算。
// 概念：给定一段趋势的 高/低（波段 swing），
//   回撤（retracement）= 反向回调的潜在支撑/阻力，按 0.236~1.0 比例；
//   扩展（extension）   = 突破后顺势的潜在目标，按 0.382/0.618/1.0/1.618。
// 回撤/扩展的「档位集合」与方向无关（对称），方向只影响解读（涨/跌势）。

const RET_RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
const EXT_RATIOS = [0.382, 0.618, 1.0, 1.618];

const isFiniteNum = (v) => Number.isFinite(Number(v));

function swing(high, low) {
  const h = Number(high), l = Number(low);
  if (!isFiniteNum(high) || !isFiniteNum(low)) return null;
  const min = Math.min(h, l);
  const max = Math.max(h, l);
  return { high: h, low: l, min, max, range: Math.abs(h - l) };
}

/**
 * 斐波那契回撤档位：level = min + ratio·range。
 * @param {number} high 波段高
 * @param {number} low  波段低
 * @returns {{min:number, max:number, range:number, levels:{ratio:number, level:number}[]}|null}
 *   入参非有限数 → null；range=0（high===low）→ levels 全部等于 min。
 */
export function retracementLevels(high, low) {
  const s = swing(high, low);
  if (!s) return null;
  return {
    min: s.min,
    max: s.max,
    range: s.range,
    levels: RET_RATIOS.map((ratio) => ({ ratio, level: s.min + ratio * s.range })),
  };
}

/**
 * 斐波那契扩展档位：以突破方向向外延伸。
 *   direction="up"   → level = max + ratio·range（涨势目标）
 *   direction="down" → level = min − ratio·range（跌势目标）
 * @param {number} high
 * @param {number} low
 * @param {("up"|"down")} [direction="up"]
 * @returns {{min:number, max:number, range:number, levels:{ratio:number, level:number}[]}|null}
 */
export function extensionLevels(high, low, direction = "up") {
  const s = swing(high, low);
  if (!s) return null;
  const base = direction === "down" ? s.min : s.max;
  const sign = direction === "down" ? -1 : 1;
  return {
    min: s.min,
    max: s.max,
    range: s.range,
    levels: EXT_RATIOS.map((ratio) => ({ ratio, level: base + sign * ratio * s.range })),
  };
}
