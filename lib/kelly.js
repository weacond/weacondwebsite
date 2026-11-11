// lib/kelly.js — Kelly 公式（最优下注/仓位比例）
// 纯函数、确定性，便于单元测试与前端实时计算。
// 概念：在胜率 p、净赔率 b（每单位风险赚 b 单位）下，使长期几何增长率最大的仓位比例为
//   f* = p − (1−p)/b      （等价于 (b·p − q)/b，q=1−p）
// f*≤0 表示无正期望（应不下注）。实战常用 1/2 Kelly、1/4 Kelly 以降低波动。
// 注意：Kelly 假设可无限重复、已知真实 p 与 b，现实会高估，故给「分数 Kelly」。

const isProb = (p) => {
  const v = Number(p);
  return Number.isFinite(v) && v >= 0 && v <= 1;
};

/**
 * 计算 Kelly 最优仓位比例及分数 Kelly。
 * @param {number} winRate 胜率 p∈[0,1]
 * @param {number} odds    净赔率 b（每押 1 单位赢 b 单位；b>0）
 * @returns {{valid:boolean, reason?:string, fStar?:number, half?:number, quarter?:number, edge?:number, expectation?:number}}
 *   入参非法（p∉[0,1] 或 b≤0 或非有限）→ { valid:false, reason }。
 *   fStar 可为负（负期望），调用方据 fStar≤0 判定「不下注」。
 *   expectation = p·b − (1−p)（每单位期望收益，>0 为正期望）。
 */
export function kellyFraction(winRate, odds) {
  const p = Number(winRate), b = Number(odds);
  if (!isProb(p)) return { valid: false, reason: "invalid_winrate" };
  if (!Number.isFinite(b) || b <= 0) return { valid: false, reason: "invalid_odds" };
  const q = 1 - p;
  const fStar = p - q / b;
  const expectation = p * b - q;
  return {
    valid: true,
    fStar,
    half: fStar / 2,
    quarter: fStar / 4,
    edge: fStar,
    expectation,
  };
}
