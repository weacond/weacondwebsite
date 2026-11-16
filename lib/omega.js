// lib/omega.js — 欧米伽比率 Omega（单一事实源，纯函数、可单元测试）
//
// Omega = Σ(r > τ) / |Σ(r < τ)|，即「阈值 τ 以上的累计上行 / 以下累计下行」。
// 它是 Sharpe/Sortino 的推广：不假设收益正态，直接比较分布的上行与下行总量。
// >1 表示上行收益整体大于下行损失；越高越好。与 lib/risk.js 的 omegaRatio 同口径，
// 以保证 /risk、/backtest 仪表盘与本计算器数字一致（单一事实源）。
// 约定：returns 为「周期收益（小数，如 0.015 = 1.5%）」，τ 为「阈值（小数，如 0.02 = 2%）」；
// 收益 ≥ −100%（−1）才有意义。无下行且存在上行时按惯例封顶 999；既无上行也无下行 → 0。
// UI 用 %（parseReturns 除以 100），MCP/agent 用小数（parseFractions 不除以 100）。

// 把一串 % 文本解析为小数收益数组（逗号/分号/空白/换行分隔）。
// 任一 token 非有限数即拒绝整串（返回 null），避免脏数据进入计算。
export function parseReturns(raw) {
  if (raw == null) return null;
  const parts = String(raw).trim().split(/[\s,;]+/).filter(Boolean);
  if (parts.length === 0) return null;
  const out = [];
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isFinite(v)) return null;
    out.push(v / 100); // % → 小数
  }
  return out;
}

// MCP/agent 约定：收益序列以「小数」给出（如 0.01 = 1%），不除以 100。
// 与 parseReturns（UI 用 %）区分；接受数组或逗号/分号/空白分隔的字符串。
export function parseFractions(raw) {
  if (Array.isArray(raw)) return raw.map(Number).filter((x) => Number.isFinite(x));
  if (raw == null) return null;
  const parts = String(raw).trim().split(/[\s,;]+/).filter(Boolean);
  if (parts.length === 0) return null;
  const out = [];
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isFinite(v)) return null;
    out.push(v); // 小数，不除以 100
  }
  return out;
}

// 欧米伽比率 Ω = up / down（与 lib/risk.js omegaRatio 同口径）。
// up = Σ_{r>τ}(r−τ)，down = Σ_{r<τ}(τ−r)；无下行且存在上行 → 999；均无 → 0。
export function omegaRatio(returns, threshold = 0) {
  const arr = Array.isArray(returns) ? returns : [];
  let up = 0;
  let down = 0;
  for (const r of arr) {
    if (r > threshold) up += r - threshold;
    else if (r < threshold) down += threshold - r;
  }
  if (down === 0) return up > 0 ? 999 : 0;
  return up / down;
}

// 解读：Omega 越高越好。999（无下行）→ "infinite"；<1 为负向（损失压过收益）。
export function omegaVerdict(omega) {
  if (omega == null || !Number.isFinite(omega)) return "invalid";
  if (omega >= 999) return "infinite";
  if (omega < 1) return "poor";
  if (omega < 2) return "modest";
  if (omega < 4) return "good";
  return "excellent";
}

// 主汇总：周期收益数组(小数) + threshold → Omega 视图。
// 非法（<2 个收益 / 任一收益 ≤ −1 / 全等于阈值）→ { valid:false, reason }。
export function omegaSummary(input) {
  const o = input || {};
  const returns = Array.isArray(o.returns) ? o.returns : [];
  const threshold = Number.isFinite(o.threshold) ? o.threshold : 0;
  const n = returns.length;
  if (n < 2) return { valid: false, reason: "need at least 2 returns" };
  for (const r of returns) {
    if (!Number.isFinite(r) || r <= -1) {
      return { valid: false, reason: "each return must be finite and > -100%" };
    }
  }
  let up = 0;
  let down = 0;
  for (const r of returns) {
    if (r > threshold) up += r - threshold;
    else if (r < threshold) down += threshold - r;
  }
  if (up === 0 && down === 0) {
    return { valid: false, reason: "all returns equal the threshold" };
  }
  const omega = down === 0 ? (up > 0 ? 999 : 0) : up / down;
  return {
    valid: true,
    n,
    threshold,
    up, // 累计上行(小数)
    down, // 累计下行(小数)
    omega,
    verdict: omegaVerdict(omega),
  };
}

// 输入合法性校验（供页面/表单复用）。
export function validOmega(returns, threshold = 0) {
  return omegaSummary({ returns, threshold }).valid;
}

// 示例预设（供 UI 一键填充；returns 为 % 文本，threshold 为 % 文本，便于直接展示/编辑）。
export const OMEGA_PRESETS = {
  strong: {
    id: "strong",
    label: "强势上行",
    labelEn: "Strong up",
    threshold: 0,
    returns: "1.5, 1.2, -0.3, 1.0, 1.3, 1.1, 0.9, 1.2, 1.0, 1.4",
  },
  volatile: {
    id: "volatile",
    label: "高波动",
    labelEn: "Volatile",
    threshold: 0,
    returns: "2.5, -1.0, 3.0, -1.5, 2.0, -0.5, 2.5, -1.0, 3.0, -1.2",
  },
  balanced: {
    id: "balanced",
    label: "均衡震荡",
    labelEn: "Balanced",
    threshold: 0,
    returns: "1.2, -0.9, 0.8, -0.6, 1.0, -0.7, 0.9, -0.5, 1.1, -0.8",
  },
  heavy: {
    id: "heavy",
    label: "重亏下行",
    labelEn: "Heavy losses",
    threshold: 0,
    returns: "0.5, -5.0, 0.3, -6.0, 0.4, -4.0, 0.3, -5.5, 0.2, -3.0",
  },
};
