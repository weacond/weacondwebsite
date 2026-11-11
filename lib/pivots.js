// lib/pivots.js — 经典日内支点（Pivot Points）
// 纯函数、确定性，便于单元测试与前端实时计算。
// 输入：前一交易日（或周期）的 最高/最低/收盘 high/low/close（可选前一日收盘 prevClose）。
// 支持三种主流算法：经典(Floor/CEA)、斐波那契(Fibonacci)、卡马拉拉(Camarilla)，
// 外加伍迪(Woodie，需 prevClose)。任一入参非有限数 → 返回 null（调用方据此隐藏）。

const isFiniteNum = (v) => Number.isFinite(Number(v));

/**
 * 经典支点（Floor / CEA 公式）。
 * P   = (H + L + C) / 3
 * R1 = 2P − L      S1 = 2P − H
 * R2 = P + (H−L)   S2 = P − (H−L)
 * R3 = H + (H−L)   S3 = L − (H−L)
 * @param {number} high  前周期最高
 * @param {number} low   前周期最低
 * @param {number} close 前周期收盘
 * @returns {{pivot:number, r1:number, s1:number, r2:number, s2:number, r3:number, s3:number, range:number}|null}
 */
export function classicPivots(high, low, close) {
  if (!isFiniteNum(high) || !isFiniteNum(low) || !isFiniteNum(close)) return null;
  const h = Number(high), l = Number(low), c = Number(close);
  const pivot = (h + l + c) / 3;
  const range = h - l;
  return {
    pivot,
    r1: 2 * pivot - l,
    s1: 2 * pivot - h,
    r2: pivot + range,
    s2: pivot - range,
    r3: h + range,
    s3: l - range,
    range,
  };
}

/**
 * 伍迪支点（Woodie）——含前一日收盘 prevClose，对隔夜跳空更敏感。
 * P   = (H + L + 2C + prevClose) / 4
 * R1 = P + 0.5·(H−L)   S1 = P − 0.5·(H−L)
 * R2 = P + 1.0·(H−L)   S2 = P − 1.0·(H−L)
 * @returns {{pivot:number, r1:number, s1:number, r2:number, s2:number, range:number}|null}
 */
export function woodiePivots(high, low, close, prevClose) {
  if (!isFiniteNum(high) || !isFiniteNum(low) || !isFiniteNum(close) || !isFiniteNum(prevClose)) return null;
  const h = Number(high), l = Number(low), c = Number(close), pc = Number(prevClose);
  const pivot = (h + l + 2 * c + pc) / 4;
  const range = h - l;
  return {
    pivot,
    r1: pivot + 0.5 * range,
    s1: pivot - 0.5 * range,
    r2: pivot + range,
    s2: pivot - range,
    range,
  };
}

/**
 * 卡马拉拉支点（Camarilla）——日内交易者常用的 1~4 档支撑/阻力。
 * P = (H + L + C) / 3；分母 12 / 6 / 4 / 2 对应 R1..R4。
 * @returns {{pivot:number, r1:number, r2:number, r3:number, r4:number, s1:number, s2:number, s3:number, s4:number, range:number}|null}
 */
export function camarillaPivots(high, low, close) {
  const base = classicPivots(high, low, close);
  if (!base) return null;
  const { pivot, range } = base;
  return {
    pivot,
    r1: pivot + range / 12,
    r2: pivot + range / 6,
    r3: pivot + range / 4,
    r4: pivot + range / 2,
    s1: pivot - range / 12,
    s2: pivot - range / 6,
    s3: pivot - range / 4,
    s4: pivot - range / 2,
    range,
  };
}

/**
 * 斐波那契支点——以 P 为锚，对前周期振幅做 0.382 / 0.618 / 1.0 回撤。
 * @returns {{pivot:number, rF1:number, sF1:number, rF2:number, sF2:number, rF3:number, sF3:number, range:number}|null}
 */
export function fibonacciPivots(high, low, close) {
  const base = classicPivots(high, low, close);
  if (!base) return null;
  const { pivot, range } = base;
  return {
    pivot,
    rF1: pivot + 0.382 * range,
    sF1: pivot - 0.382 * range,
    rF2: pivot + 0.618 * range,
    sF2: pivot - 0.618 * range,
    rF3: pivot + range,
    sF3: pivot - range,
    range,
  };
}

/**
 * 按名称取某一类支点（classic / woodie / camarilla / fibonacci）。
 * @param {string} variant
 * @returns {object|null}
 */
export function pivotLevels(variant, high, low, close, prevClose) {
  switch (variant) {
    case "woodie":
      return woodiePivots(high, low, close, prevClose);
    case "camarilla":
      return camarillaPivots(high, low, close);
    case "fibonacci":
      return fibonacciPivots(high, low, close);
    case "classic":
    default:
      return classicPivots(high, low, close);
  }
}

/**
 * 依据当前价 relative 经典支点的强弱解读。
 *   ≥ R1 → 偏多(bullish)；S1 ≤ 价 < R1 → 中性(neutral)；< S1 → 偏空(bearish)
 * 仅使用经典支点（R1/S1）做区间判断，与所选 variant 无关。
 * @param {number} price 当前价
 * @param {{r1:number, s1:number}} levels 经典支点（含 r1/s1）
 * @returns {string} "bullish" | "neutral" | "bearish" | "unknown"
 */
export function pivotTrend(price, levels) {
  if (!Number.isFinite(Number(price)) || !levels || !Number.isFinite(levels.r1) || !Number.isFinite(levels.s1)) {
    return "unknown";
  }
  const p = Number(price);
  if (p >= levels.r1) return "bullish";
  if (p < levels.s1) return "bearish";
  return "neutral";
}
