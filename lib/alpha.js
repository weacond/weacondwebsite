// lib/alpha.js — Jensen's Alpha（单一事实源，纯函数、可单元测试）
//
// Jensen's Alpha = 实际收益 Rp − CAPM 预期收益 [Rf + beta × (Rm − Rf)]。
// 它衡量「跑赢/跑输市场」的纯超额收益：剔除系统性风险（beta）后，
// 剩下的就是经理/策略的「超额能力」。与 Calmar/Sortino 互补：
// 那些看风险调整效率，Alpha 看绝对超额。全部确定性、无副作用。
//
// 约定：rp/rm/rf 为「小数（如 0.12 = 12%）」，与 calmar/sortino 的 *Summary
// 及 MCP 层一致；UI 在调用处把 % 换算为小数。beta 为数值（如 1.2）。

// CAPM 预期收益（小数）= Rf + beta × (Rm − Rf)。
export function capmExpected(rm, rf, beta) {
  const r = Number(rm), f = Number(rf), b = Number(beta);
  return f + b * (r - f);
}

// Jensen's Alpha（小数）= Rp − CAPM 预期。
export function jensenAlpha(rp, rm, rf, beta) {
  return Number(rp) - capmExpected(rm, rf, beta);
}

// 解读：按超额收益分档（小数，1% 为界）。
export function alphaVerdict(alpha) {
  if (!Number.isFinite(alpha)) return "invalid";
  if (alpha > 0.01) return "strong"; // 明显跑赢
  if (alpha > 0) return "outperform"; // 小幅跑赢
  if (alpha > -0.01) return "underperform"; // 小幅跑输
  return "weak"; // 明显跑输
}

// 主汇总：rp/rm/rf 为小数，beta 为数值。rp/rm 缺省或非法 → 无效。
export function alphaSummary(input) {
  const o = input || {};
  const rp = Number(o.rp);
  const rm = Number(o.rm);
  const rf = Number.isFinite(Number(o.rf)) ? Number(o.rf) : 0;
  const beta = Number.isFinite(Number(o.beta)) ? Number(o.beta) : 1;
  if (!Number.isFinite(rp) || !Number.isFinite(rm)) {
    return { valid: false, reason: "rp and rm must be numbers" };
  }
  const marketPremium = rm - rf; // 市场溢价
  const expected = rf + beta * marketPremium; // CAPM 预期
  const alpha = rp - expected;
  return {
    valid: true,
    rp,
    rm,
    rf,
    beta,
    marketPremium,
    expected,
    alpha,
    verdict: alphaVerdict(alpha),
  };
}

// 输入合法性校验（供页面/表单复用）。
export function validAlpha(rp, rm, rf = 0, beta = 1) {
  return alphaSummary({ rp, rm, rf, beta }).valid;
}

// 示例预设（rp/rm/rf 为 % 文本，便于 UI 展示；调用处换算为小数）。
export const ALPHA_PRESETS = {
  beat: { id: "beat", label: "跑赢市场", labelEn: "Outperformer", rp: 18, rm: 10, rf: 2, beta: 1.0 },
  betaPlay: { id: "betaPlay", label: "纯 beta", labelEn: "Beta play", rp: 12, rm: 10, rf: 2, beta: 1.2 },
  under: { id: "under", label: "跑输市场", labelEn: "Underperformer", rp: 6, rm: 10, rf: 2, beta: 1.0 },
  highBeta: { id: "highBeta", label: "高 beta 落后", labelEn: "High-beta lag", rp: 14, rm: 10, rf: 2, beta: 1.8 },
};