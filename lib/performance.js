// lib/performance.js — 交易日志 / 业绩报告（纯函数、确定性、可单元测试）
//
// 把一串"每笔交易收益率"（小数，如 0.05 = +5%、-0.02 = -2%）映射为完整业绩记分卡，
// 复用 lib/risk.js 的连亏/连盈、期望、盈亏比、夏普/索提诺、破产概率。
// 与 lib/backtest.js 的区别：这里是"手填/导入交易结果"的输入模态，而非"策略跑行情"。
//
// 约定：
//   - win = r > 0，loss = r < 0，scratch = r === 0。
//   - 损失/盈亏以绝对幅度返回；比率按 lib/risk.js 口径（无分母时封顶 999）。

import {
  maxLosingStreak,
  maxWinStreak,
  expectancyPerTrade,
  payoffRatio,
  sharpeRatio,
  sortinoRatio,
  probabilityOfRuin,
} from "./risk.js";

function clean(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((x) => (typeof x === "number" ? x : parseFloat(x)))
    .filter((x) => Number.isFinite(x));
}

// 交易记分卡。opts: { periods, rf }
export function tradeScorecard(trades, opts = {}) {
  const returns = clean(trades);
  const n = returns.length;
  if (n === 0) {
    return { n: 0, empty: true };
  }
  const periods = opts.periods && opts.periods > 0 ? opts.periods : 252;
  const rf = typeof opts.rf === "number" && Number.isFinite(opts.rf) ? opts.rf : 0;

  let wins = 0;
  let losses = 0;
  let scratch = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let sumWin = 0;
  let sumLoss = 0;
  let geo = 1;
  for (const r of returns) {
    if (r > 0) {
      wins++;
      grossProfit += r;
      sumWin += r;
    } else if (r < 0) {
      losses++;
      grossLoss += r; // 负数
      sumLoss += r;
    } else {
      scratch++;
    }
    geo *= 1 + r;
  }
  const nonzero = wins + losses;
  const winRate = nonzero > 0 ? wins / nonzero : 0;
  const avgWin = wins > 0 ? sumWin / wins : 0;
  const avgLoss = losses > 0 ? Math.abs(sumLoss / losses) : 0;
  const payoff = payoffRatio(avgWin, avgLoss);
  const profitFactor = grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : grossProfit > 0 ? 999 : 0;
  const expectancy = expectancyPerTrade(winRate, avgWin, avgLoss);
  const totalReturn = geo - 1; // 几何复合净收益
  const edge = expectancy; // 每笔期望收益
  const probRuin = probabilityOfRuin(edge, 100);
  const cagr =
    periods > 0 && n > 0 ? Math.pow(Math.max(1e-9, geo), periods / n) - 1 : 0;

  return {
    n,
    empty: false,
    wins,
    losses,
    scratch,
    winRate,
    avgWin,
    avgLoss,
    payoff,
    profitFactor,
    expectancy,
    grossProfit,
    grossLoss: Math.abs(grossLoss),
    totalReturn,
    cagr,
    sharpe: sharpeRatio(returns, periods, rf),
    sortino: sortinoRatio(returns, periods, rf),
    maxLosingStreak: maxLosingStreak(returns),
    maxWinStreak: maxWinStreak(returns),
    probRuin,
  };
}

// 业绩评级：综合盈利因子、胜率、期望、破产概率
// 返回 { grade, label, labelEn, color }
export function gradePerformance(sc) {
  if (!sc || sc.empty) return { grade: 0, label: "—", labelEn: "—", color: "slate" };
  let s = 0;
  if (sc.profitFactor >= 2) s += 3;
  else if (sc.profitFactor >= 1.5) s += 2;
  else if (sc.profitFactor >= 1) s += 1;
  if (sc.winRate >= 0.55) s += 1;
  if (sc.expectancy > 0) s += 2;
  if (sc.probRuin < 0.3) s += 1;
  if (s >= 6) return { grade: 5, label: "优秀", labelEn: "Excellent", color: "emerald" };
  if (s >= 4) return { grade: 4, label: "良好", labelEn: "Good", color: "emerald" };
  if (s >= 2) return { grade: 3, label: "一般", labelEn: "Fair", color: "amber" };
  if (s >= 1) return { grade: 2, label: "较弱", labelEn: "Weak", color: "orange" };
  return { grade: 1, label: "亏损", labelEn: "Losing", color: "rose" };
}

// 示例交易日志（每笔收益率）
export const TRADE_PRESETS = {
  edge: {
    id: "edge",
    name: "有优势",
    nameEn: "Edge",
    desc: "正期望：盈利因子 >1、期望 >0。",
    descEn: "Positive edge: profit factor >1, expectancy >0.",
    trades: [0.05, -0.02, 0.04, -0.02, 0.06, 0.03, -0.02, 0.05, 0.04, -0.02, 0.03, 0.05],
  },
  highWinLowPayoff: {
    id: "highWinLowPayoff",
    name: "高胜率小赔率",
    nameEn: "High Win / Low Payoff",
    desc: "胜率高但单次盈利小，一次大亏可抹平多次盈利。",
    descEn: "High win rate but small wins; one big loss can wipe many wins.",
    trades: [0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, -0.15, 0.02, 0.02, -0.18, 0.02],
  },
  losing: {
    id: "losing",
    name: "亏损趋势",
    nameEn: "Losing Trend",
    desc: "负期望：长期必亏，破产概率趋 1。",
    descEn: "Negative edge: long-term loss, ruin → 1.",
    trades: [-0.03, -0.02, 0.02, -0.04, -0.02, -0.03, 0.01, -0.05, -0.02, -0.03],
  },
};

export function getTradePreset(key) {
  const p = TRADE_PRESETS[key];
  if (!p) throw new Error(`Unknown trade preset: ${key}`);
  return p;
}

// 便捷：预设 → 记分卡
export function scorecardForPreset(key, opts = {}) {
  return tradeScorecard(getTradePreset(key).trades, opts);
}
