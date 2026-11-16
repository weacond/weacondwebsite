// lib/treynor.js — Treynor 比率（单一事实源，纯函数、可单元测试）
//
// Treynor 比率 = (组合年化收益 Rp − 无风险利率 Rf) ÷ beta。
// 它衡量「每承担一单位系统性风险(beta)换来多少超额收益」，与 Sharpe 互补：
// Sharpe 以总波动率(标准差)为分母（总风险），Treynor 以 beta 为分母（系统风险）。
// beta 越高，单位风险成本越大；Treynor 越高，风险调整收益越好。
// 与 Calmar/Sortino/Alpha 同属风险调整家族，全部确定性、无副作用。
//
// 约定：rp/rf 为「小数（如 0.12 = 12%）」，与 alpha 的 *Summary 及 MCP 层一致；
// UI 在调用处把 % 换算为小数。beta 为数值（如 1.2）。

// 超额收益（小数）= Rp − Rf。
export function excessReturn(rp, rf) {
  return Number(rp) - Number(rf);
}

// Treynor 比率 = (Rp − Rf) ÷ beta。beta 为 0 或非有限 → null。
export function treynor(rp, rf, beta) {
  const r = Number(rp), f = Number(rf), b = Number(beta);
  if (!Number.isFinite(r) || !Number.isFinite(b) || b === 0) return null;
  return (r - f) / b;
}

// 解读：Treynor 越高，单位系统风险换来的超额越多。null/非有限 → "invalid"。
// 分档按「超额/beta」的十进制量级（如 0.05 = 每单位 beta 5% 超额）。
export function treynorVerdict(t) {
  if (t == null || !Number.isFinite(t)) return "invalid";
  if (t < 0) return "poor";
  if (t < 0.05) return "modest";
  if (t < 0.1) return "good";
  return "excellent";
}

// 主汇总：rp/rf 为小数，beta 为数值。rp 非有限 / beta 为 0 → 无效。
export function treynorSummary(input) {
  const o = input || {};
  const rp = Number(o.rp);
  const rf = Number.isFinite(Number(o.rf)) ? Number(o.rf) : 0;
  const beta = Number.isFinite(Number(o.beta)) ? Number(o.beta) : 1;
  if (!Number.isFinite(rp)) {
    return { valid: false, reason: "rp must be a number" };
  }
  if (beta === 0) {
    return { valid: false, reason: "beta must be non-zero" };
  }
  const excess = excessReturn(rp, rf);
  const t = excess / beta;
  return {
    valid: true,
    rp,
    rf,
    beta,
    excessReturn: excess,
    treynor: t,
    verdict: treynorVerdict(t),
  };
}

// 输入合法性校验（供页面/表单复用）。
export function validTreynor(rp, rf = 0, beta = 1) {
  return treynorSummary({ rp, rf, beta }).valid;
}

// 示例预设（rp/rf 为 % 文本，便于 UI 展示；调用处换算为小数）。
export const TREYNOR_PRESETS = {
  beat: { id: "beat", label: "高效超配", labelEn: "High efficiency", rp: 18, rf: 2, beta: 1.0 },
  betaPlay: { id: "betaPlay", label: "高 beta 一般", labelEn: "High-beta modest", rp: 14, rf: 2, beta: 1.8 },
  under: { id: "under", label: "低效落后", labelEn: "Low efficiency", rp: 6, rf: 2, beta: 1.0 },
  def: { id: "def", label: "防御稳健", labelEn: "Defensive", rp: 7, rf: 2, beta: 0.7 },
};
