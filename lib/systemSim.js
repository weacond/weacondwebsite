// 交易系统模拟器（Trading System Simulator）—— 纯函数，确定性可复现
//
// 给定「胜率 / 盈亏比 R / 每笔下注比例 / 交易次数」，用确定性 PRNG 模拟 N 笔
// 离散交易，输出净值曲线与统计：最终收益、最大回撤、实现胜率、盈亏比、
// 破产概率、每笔期望。回答交易者最常问的"我这个优势在 N 笔、这个下注比例下
// 净值会怎么走、会爆仓吗"。
//
// 与相邻模块的分工：
//   - performance：喂「实际交易日志」→ 记分卡（事后复盘）；
//   - monteCarlo ：连续财富过程（μ/σ 几何步进，事前风险分布）；
//   - 本模块    ：从「期望特征」模拟离散交易（事前压力/演示优势）。
//
// 口径：每笔相对净值的收益 = f·R（赢）或 −f（亏），其中 f = betPct/100，
// R = 盈亏比（平均盈利/平均亏损）。净值按 1.0 起，乘性复合。
// 所有随机性由 mulberry32(seed) 决定，给定 seed 完全可复现。

import { mulberry32, probabilityOfRuin, expectancyPerTrade } from "./risk.js";

/**
 * 校验模拟输入。winRate∈(0,1)，R>0，betPct>0，trades≥1。
 * @param {object} o
 * @returns {boolean}
 */
export function validSim(o) {
  return (
    o != null &&
    Number.isFinite(o.winRate) && o.winRate > 0 && o.winRate < 1 &&
    Number.isFinite(o.rewardRisk) && o.rewardRisk > 0 &&
    Number.isFinite(o.betPct) && o.betPct > 0 &&
    Number.isFinite(o.trades) && o.trades >= 1
  );
}

/**
 * 系统原型（便于页面一键套用 + 测试稳定输入）。
 * winRate∈(0,1)；R=盈亏比；betPct=每笔下注%；trades=笔数。
 */
export const SIM_PRESETS = [
  { id: "scalper", label: "高频小赚", winRate: 0.6, rewardRisk: 0.8, betPct: 2, trades: 500 },
  { id: "swing", label: "波段趋势", winRate: 0.45, rewardRisk: 2, betPct: 5, trades: 200 },
  { id: "swingTight", label: "紧下注波段", winRate: 0.45, rewardRisk: 2, betPct: 1, trades: 200 },
  { id: "grid", label: "网格套利", winRate: 0.55, rewardRisk: 1, betPct: 3, trades: 300 },
];

/**
 * 模拟 N 笔离散交易，返回净值曲线与统计。
 * @param {object} o { winRate, rewardRisk, betPct, trades }
 * @param {number} [seed=7] 确定性种子
 * @returns {{ curve: number[], finalReturnPct: number, maxDrawdownPct: number,
 *   winRateAchieved: number, profitFactor: number, expectancyR: number,
 *   expectancyPctPerTrade: number, probRuin: number, trades: number, seed: number }}
 *   非法输入 → 抛错；确定性：同 seed 同输入结果一致。
 */
export function simulateSystem(o, seed = 7) {
  if (!validSim(o)) throw new Error("invalid sim inputs");
  if (!(seed >= 0)) throw new Error("invalid seed");

  const trades = Math.floor(o.trades);
  const f = o.betPct / 100;
  const rng = mulberry32(seed);

  const curve = [1];
  let eq = 1;
  let wins = 0;
  let grossProfit = 0;
  let grossLoss = 0;

  for (let i = 0; i < trades; i++) {
    const win = rng() < o.winRate;
    const chg = win ? f * o.rewardRisk : -f; // 相对净值的变化（小数）
    eq *= 1 + chg;
    curve.push(eq);
    const chgPct = chg * 100;
    if (chgPct >= 0) {
      wins++;
      grossProfit += chgPct;
    } else {
      grossLoss += -chgPct;
    }
  }

  // 最大回撤（净值曲线口径）
  let peak = 1;
  let maxDD = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }

  // 每笔期望以 R 为单位（亏损=1R），正=有优势
  const expectancyR = expectancyPerTrade(o.winRate, o.rewardRisk, 1);
  // 破产概率用每注期望的赌徒破产近似
  const probRuin = probabilityOfRuin(expectancyR, trades);

  return {
    curve,
    finalReturnPct: (eq - 1) * 100,
    maxDrawdownPct: maxDD * 100,
    winRateAchieved: trades > 0 ? wins / trades : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0),
    expectancyR,
    expectancyPctPerTrade: expectancyR * f * 100,
    probRuin,
    trades,
    seed,
  };
}

/**
 * 由结果派生一句风险/优势结论。
 * @returns {string}
 */
export function simInsight(r) {
  if (!Number.isFinite(r.expectancyR)) return "参数异常。";
  if (r.expectancyR <= 0) return "每笔期望 ≤ 0：长期无优势，越久越亏。";
  if (r.probRuin > 0.5) return "破产概率偏高：降下注比例或加大 R 以增强优势。";
  return `每笔期望 +${r.expectancyR.toFixed(2)}R（有优势），破产概率 ${(r.probRuin * 100).toFixed(1)}%；` +
    `最大回撤 ${(r.maxDrawdownPct).toFixed(1)}%。`;
}
