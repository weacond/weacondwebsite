// lib/sterling.js — 斯特林比率 Sterling（单一事实源，纯函数、可单元测试）
//
// Sterling = 总收益 ÷ 最长连续亏损交易数。把收益按「最坏连亏」归一，
// 与 Calmar（对最大回撤归一）互补——Sterling 从「连亏次数」维度衡量抗回撤韧性，
// 值越大说明单位连亏对应的收益越高。与 lib/risk.js 的 sterlingRatio 同口径，
// 以保证 /risk、/backtest 仪表盘与本计算器数字一致（单一事实源）。
// 约定：totalReturn 为「百分数（带符号，如 60 表示 60%）」，maxLosingStreak 为「≥0 整数」。
// 无连亏(0)时按惯例封顶 999；非有限输入 → 0。全部确定性、无副作用。

// 斯特林比率 sterling = totalReturn / maxLosingStreak（与 lib/risk.js sterlingRatio 同口径）。
// 非有限输入 → 0；无连亏(≤0)时：totalReturn>0 → 封顶 999，否则 0。
export function sterlingRatio(totalReturn, maxLosingStreak) {
  if (!Number.isFinite(totalReturn) || !Number.isFinite(maxLosingStreak)) return 0;
  if (maxLosingStreak <= 0) return totalReturn > 0 ? 999 : 0;
  return totalReturn / maxLosingStreak;
}

// 解读：Sterling 越高越好。999（无连亏）→ "infinite"；<1 为负向。
// 经验分档（启发式）：<1 poor、[1,3) modest、[3,6) good、≥6 excellent。
export function sterlingVerdict(sterling) {
  if (sterling == null || !Number.isFinite(sterling)) return "invalid";
  if (sterling >= 999) return "infinite";
  if (sterling < 1) return "poor";
  if (sterling < 3) return "modest";
  if (sterling < 6) return "good";
  return "excellent";
}

// 主汇总：{ totalReturn, maxLosingStreak } → Sterling 视图。
// 非法（任一非有限 / maxLosingStreak<0 / 两者皆 0）→ { valid:false, reason }。
export function sterlingSummary(input) {
  const o = input || {};
  const totalReturn = Number(o.totalReturn);
  const maxLosingStreak = Number(o.maxLosingStreak);
  if (!Number.isFinite(totalReturn) || !Number.isFinite(maxLosingStreak)) {
    return { valid: false, reason: "totalReturn and maxLosingStreak must be finite" };
  }
  if (maxLosingStreak < 0) {
    return { valid: false, reason: "maxLosingStreak must be a non-negative integer" };
  }
  if (totalReturn === 0 && maxLosingStreak === 0) {
    return { valid: false, reason: "need a non-zero total return or losing streak" };
  }
  const sterling = sterlingRatio(totalReturn, maxLosingStreak);
  return {
    valid: true,
    totalReturn,
    maxLosingStreak,
    sterling,
    verdict: sterlingVerdict(sterling),
  };
}

// 输入合法性校验（供页面/表单复用）。
export function validSterling(totalReturn, maxLosingStreak) {
  return sterlingSummary({ totalReturn, maxLosingStreak }).valid;
}

// 示例预设（供 UI 一键填充；totalReturn 为 %，maxLosingStreak 为整数）。
export const STERLING_PRESETS = {
  strong: {
    id: "strong",
    label: "高抗回撤",
    labelEn: "High resilience",
    totalReturn: 60,
    maxLosingStreak: 3,
  },
  good: {
    id: "good",
    label: "良好",
    labelEn: "Good",
    totalReturn: 20,
    maxLosingStreak: 4,
  },
  modest: {
    id: "modest",
    label: "一般",
    labelEn: "Modest",
    totalReturn: 12,
    maxLosingStreak: 6,
  },
  poor: {
    id: "poor",
    label: "低收益/高连亏",
    labelEn: "Low return / long streak",
    totalReturn: 3,
    maxLosingStreak: 5,
  },
};
