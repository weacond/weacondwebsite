// lib/expectancy.js — 交易期望 / 盈亏因子 / 盈亏平衡胜率（Trade expectancy / profit factor，纯函数）
//
// 经典资金管理（与 rMultiple.js 的 R 口径互补，此处用 金额/百分比 口径）：
//   每笔期望  EV = p·avgWin − (1−p)·avgLoss        （p = 胜率）
//   盈亏比    RR = avgWin / avgLoss
//   盈亏因子  PF = (p·avgWin) / ((1−p)·avgLoss)
//   平衡胜率  p* = avgLoss / (avgWin + avgLoss)
// 确定性、零外部依赖。教育性参考，非投资建议。

export const STORAGE_KEY = "weacond:expectancy:v1";

function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

// 每笔期望 = p·avgWin − (1−p)·avgLoss。
export function expectedValue(winRate, avgWin, avgLoss) {
  const p = num(winRate);
  const w = num(avgWin);
  const l = num(avgLoss);
  return p * w - (1 - p) * l;
}

// 盈亏比 RR = avgWin / avgLoss。
export function rewardRiskRatio(avgWin, avgLoss) {
  const l = num(avgLoss);
  if (l <= 0) return 0;
  return num(avgWin) / l;
}

// 盈亏因子 PF = (p·avgWin)/((1−p)·avgLoss)；无亏损时封顶 999。
export function profitFactor(winRate, avgWin, avgLoss) {
  const p = num(winRate);
  const w = num(avgWin);
  const l = num(avgLoss);
  const grossProfit = p * w;
  const grossLoss = (1 - p) * l;
  if (grossLoss <= 0) return grossProfit > 0 ? 999 : 0;
  return grossProfit / grossLoss;
}

// 盈亏平衡胜率 = avgLoss / (avgWin + avgLoss)。
export function breakEvenWinRate(avgWin, avgLoss) {
  const w = num(avgWin);
  const l = num(avgLoss);
  const denom = w + l;
  if (denom <= 0) return 0;
  return l / denom;
}

// 期望分级：按盈亏因子。
export function expectancyBand(pf) {
  const f = num(pf);
  if (f < 1) return "negative";
  if (f < 1.5) return "marginal";
  return "strong";
}

// 综合视图。
export function expectancySummary(inputs = {}) {
  const { winRate = 0.5, avgWin = 100, avgLoss = 100, trades = 100 } = inputs;
  const p = num(winRate);
  const w = num(avgWin);
  const l = num(avgLoss);
  const n = num(trades);
  const valid = p >= 0 && p <= 1 && w > 0 && l > 0 && n >= 0;
  if (!valid) return { valid: false };
  const ev = expectedValue(p, w, l);
  const pf = profitFactor(p, w, l);
  const rr = rewardRiskRatio(w, l);
  const be = breakEvenWinRate(w, l);
  return {
    winRate: p,
    avgWin: w,
    avgLoss: l,
    trades: n,
    expectedValue: ev,
    profitFactor: pf,
    rewardRiskRatio: rr,
    breakEvenWinRate: be,
    totalExpectancy: ev * n,
    band: expectancyBand(pf),
    valid: true,
  };
}

// 预设：典型交易情境。
export const EXPECTANCY_PRESETS = {
  positive:  { id: "positive",  label: "正期望",   winRate: 0.5, avgWin: 200, avgLoss: 100, trades: 100 },
  breakeven: { id: "breakeven", label: "盈亏平衡", winRate: 0.5, avgWin: 100, avgLoss: 100, trades: 100 },
  highWin:   { id: "highWin",   label: "高胜率",   winRate: 0.7, avgWin: 100, avgLoss: 200, trades: 100 },
  scalper:   { id: "scalper",   label: "高频小盈", winRate: 0.6, avgWin: 50,  avgLoss: 30,  trades: 500 },
  negative:  { id: "negative",  label: "负期望",   winRate: 0.4, avgWin: 100, avgLoss: 150, trades: 100 },
};
export { num };
