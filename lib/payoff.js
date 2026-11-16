// lib/payoff.js — 盈亏比 Payoff Ratio（单一事实源，纯函数、可单元测试）
//
// Payoff = 平均每笔盈利 ÷ 平均每笔亏损（两者均为正幅）。>1 表示平均盈利 > 平均亏损，
// 是交易系统的经典绩效指标。与期望值 Expectancy 互补：期望值还把盈亏比乘以胜率，
// 盈亏比只看「单笔盈/亏幅度」之比。与 lib/risk.js 的 payoffRatio 同口径，
// 以保证 /risk 等仪表盘与本计算器数字一致（单一事实源）。
// 约定：avgWin / avgLoss 为「正幅」（同单位，比率无量纲）；avgLoss ≤ 0 时按惯例封顶 999；
// avgWin ≤ 0 → 0。全部确定性、无副作用。

// 盈亏比 payoff = avgWin / avgLoss（与 lib/risk.js payoffRatio 同口径）。
// 非有限 → 0；avgLoss ≤ 0 时封顶 999（无亏损）；avgWin ≤ 0 → 0。
export function payoffRatio(avgWin, avgLoss) {
  if (!Number.isFinite(avgWin) || !Number.isFinite(avgLoss)) return 0;
  if (avgLoss > 0) return avgWin / avgLoss;
  return avgWin > 0 ? 999 : 0;
}

// 解读：Payoff 越高越好。999（无亏损）→ "infinite"；<1 为负向（平均亏 > 平均盈）。
export function payoffVerdict(payoff) {
  if (payoff == null || !Number.isFinite(payoff)) return "invalid";
  if (payoff >= 999) return "infinite";
  if (payoff < 1) return "poor";
  if (payoff < 2) return "modest";
  if (payoff < 3) return "good";
  return "excellent";
}

// 主汇总：{ avgWin, avgLoss } → Payoff 视图。
// 非法（任一非有限 / 任一为负 / 两者皆 0）→ { valid:false, reason }。
export function payoffSummary(input) {
  const o = input || {};
  const avgWin = Number(o.avgWin);
  const avgLoss = Number(o.avgLoss);
  if (!Number.isFinite(avgWin) || !Number.isFinite(avgLoss)) {
    return { valid: false, reason: "avgWin and avgLoss must be finite" };
  }
  if (avgWin < 0 || avgLoss < 0) {
    return { valid: false, reason: "avgWin and avgLoss must be non-negative magnitudes" };
  }
  if (avgWin === 0 && avgLoss === 0) {
    return { valid: false, reason: "need at least one positive magnitude" };
  }
  const payoff = payoffRatio(avgWin, avgLoss);
  return {
    valid: true,
    avgWin,
    avgLoss,
    payoff,
    verdict: payoffVerdict(payoff),
  };
}

// 输入合法性校验（供页面/表单复用）。
export function validPayoff(avgWin, avgLoss) {
  return payoffSummary({ avgWin, avgLoss }).valid;
}

// 示例预设（供 UI 一键填充；avgWin / avgLoss 为同单位正幅，比率无量纲）。
export const PAYOFF_PRESETS = {
  strong: {
    id: "strong",
    label: "高盈亏比",
    labelEn: "High payoff",
    avgWin: 3,
    avgLoss: 1,
  },
  good: {
    id: "good",
    label: "良好",
    labelEn: "Good",
    avgWin: 2,
    avgLoss: 1,
  },
  modest: {
    id: "modest",
    label: "一般",
    labelEn: "Modest",
    avgWin: 1.5,
    avgLoss: 1,
  },
  poor: {
    id: "poor",
    label: "亏大于盈",
    labelEn: "Losses > wins",
    avgWin: 0.5,
    avgLoss: 1,
  },
};
