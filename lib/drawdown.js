// lib/drawdown.js — 回撤恢复计算器（单一事实源，纯函数、可单元测试）
//
// 核心洞见：回撤与恢复不对称。-50% 需要 +100% 才能回到原点，
// -33% 需要 +50%。给定回撤幅度与年化 CAGR，算出「回本所需涨幅」与
// 「预计恢复时间」。全部确定性、无副作用。
//
// 约定：drawdownPct 为正数，表示「跌了百分之几」（如 50 = -50%）。

// 回本所需涨幅（%）。dd 为 0..100 之间的下跌百分比。
// 例：dd=50 -> 100（需 +100%）；dd=20 -> 25。
export function recoveryGainPct(drawdownPct) {
  const d = drawdownPct / 100;
  if (d <= 0) return 0;
  if (d >= 1) return Infinity; // 跌 100% 无法靠增长回本
  return (1 / (1 - d) - 1) * 100;
}

// 预计恢复年数。cagrPct 为年化复利增长率（%，如 10 = 10%）。
// 时间 = ln(回本倍数) / ln(1 + cagr/100)。
// 返回 { years, possible }：cagr<=0 时无法恢复（possible=false）。
export function recoveryTime(drawdownPct, cagrPct) {
  const gain = recoveryGainPct(drawdownPct);
  const growth = 1 + cagrPct / 100;
  if (drawdownPct <= 0) return { years: 0, possible: true };
  if (!Number.isFinite(gain) || growth <= 1) return { years: Infinity, possible: false };
  const years = Math.log(1 + gain / 100) / Math.log(growth);
  return { years, possible: Number.isFinite(years) };
}

// 常见回撤 -> 回本涨幅 速查（教育用）
export const RECOVERY_TABLE = [
  { dd: 10, gain: recoveryGainPct(10) },
  { dd: 20, gain: recoveryGainPct(20) },
  { dd: 30, gain: recoveryGainPct(30) },
  { dd: 40, gain: recoveryGainPct(40) },
  { dd: 50, gain: recoveryGainPct(50) },
  { dd: 60, gain: recoveryGainPct(60) },
  { dd: 75, gain: recoveryGainPct(75) },
];

// 校验输入合理性：dd ∈ (0,100)
export function validDrawdown(drawdownPct) {
  return drawdownPct > 0 && drawdownPct < 100;
}
