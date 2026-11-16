// lib/sortino.js — Sortino 比率（单一事实源，纯函数、可单元测试）
//
// Sortino = (年化收益 − MAR) ÷ 年化下行偏差。与夏普用总波动率不同，
// Sortino 只惩罚「低于可接受收益 MAR」的下行，更贴近投资者真实风险感知，
// 故常用于对冲基金/权益等下行敏感策略。全部确定性、无副作用。
//
// 约定：returns 为「周期收益（小数，如 0.015 = 1.5%）」；freq = 每年周期数
// （1=年、4=季、12=月、52=周、252=交易日）；mar 为「年化最低可接受收益（小数，如 0.02 = 2%）」。
// 收益 ≥ −100%（−1）才有意义。

// 由周期收益（小数）构建财富指数 [1, W1, W2, ...]，Wk = Wk-1 × (1 + rk)。
export function wealthIndex(returns) {
  const out = [1];
  let w = 1;
  for (const r of returns) {
    w *= 1 + r;
    out.push(w);
  }
  return out;
}

// 几何年化收益(CAGR)：start → end 跨 years 年。任一不合法则返回 null。
export function cagr(start, end, years) {
  if (!(years > 0) || !(start > 0) || !(end > 0)) return null;
  return Math.pow(end / start, 1 / years) - 1;
}

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

// 年化下行偏差：仅统计低于「每周期 MAR」的收益。
// per-period downside d_i = max(marPerPeriod − r_i, 0)；
// 方差 = mean(d_i²)；每周期下行 = sqrt(方差)；年化 = ×sqrt(freq)。
// 不足 2 个周期或 freq≤0 → null。
export function downsideDeviation(returns, marPerPeriod, freq) {
  const n = returns.length;
  if (n < 2 || !(Number.isFinite(freq) && freq > 0)) return null;
  let sum = 0;
  for (const r of returns) {
    if (!Number.isFinite(r)) return null;
    const d = marPerPeriod - r;
    if (d > 0) sum += d * d;
  }
  const perPeriod = Math.sqrt(sum / n);
  return perPeriod * Math.sqrt(freq);
}

// 解读：Sortino 越高越好。null/非有限 → "infinite"（无下行）或 "none"。
export function sortinoVerdict(sortino) {
  if (sortino == null || !Number.isFinite(sortino)) return "infinite";
  if (sortino < 0) return "poor";
  if (sortino < 1) return "modest";
  if (sortino < 3) return "good";
  return "excellent";
}

// 主汇总：周期收益数组(小数) + freq + mar → Sortino 视图。
// 非法（<2 个收益 / freq≤0 / 任一收益 ≤ −1 / 终值 ≤ 0）→ { valid:false, reason }。
export function sortinoSummary(input) {
  const o = input || {};
  const returns = Array.isArray(o.returns) ? o.returns : [];
  const freq = Number(o.freq);
  const mar = Number.isFinite(o.mar) ? o.mar : 0;
  const n = returns.length;
  if (n < 2 || !(Number.isFinite(freq) && freq > 0)) {
    return { valid: false, reason: "need at least 2 returns and freq > 0" };
  }
  for (const r of returns) {
    if (!Number.isFinite(r) || r <= -1) {
      return { valid: false, reason: "each return must be finite and > -100%" };
    }
  }
  const we = wealthIndex(returns);
  const end = we[we.length - 1];
  if (!(end > 0)) return { valid: false, reason: "final wealth must be positive" };
  const years = n / freq;
  const annualized = cagr(1, end, years); // 起点财富指数 = 1
  const dd = downsideDeviation(returns, mar / freq, freq); // 年化下行偏差
  // 无下行（所有收益 ≥ 每周期 MAR）时 Sortino 无定义（→∞），以 null 表示。
  const sortino = dd > 0 ? (annualized - mar) / dd : null;
  return {
    valid: true,
    n,
    freq,
    years,
    mar,
    annualized,
    downsideDeviation: dd,
    sortino,
    verdict: sortinoVerdict(sortino),
  };
}

// 输入合法性校验（供页面/表单复用）。
export function validSortino(returns, freq, mar = 0) {
  return sortinoSummary({ returns, freq, mar }).valid;
}

// 示例预设（供 UI 一键填充；returns 为 % 文本，便于直接展示/编辑）。
export const SORTINO_PRESETS = {
  steady: {
    id: "steady",
    label: "稳健权益",
    labelEn: "Steady equity",
    freq: 12,
    mar: 0.02,
    returns: "1.2, 1.0, 0.8, -1.5, 1.1, 1.3, 0.9, 1.0, 1.2, -0.8, 1.1, 1.0",
  },
  hedge: {
    id: "hedge",
    label: "对冲基金",
    labelEn: "Hedge fund",
    freq: 12,
    mar: 0.03,
    returns: "1.5, 0.8, -0.5, 1.2, 0.6, -0.3, 1.0, 0.9, -0.4, 1.1, 0.7, 0.5",
  },
  crypto: {
    id: "crypto",
    label: "高弹高震",
    labelEn: "Crypto-like",
    freq: 12,
    mar: 0.0,
    returns: "12, 8, -15, 14, 10, -20, 16, 11, -12, 15, 9, 7",
  },
  quarter: {
    id: "quarter",
    label: "季度收益",
    labelEn: "Quarterly",
    freq: 4,
    mar: 0.0,
    returns: "10, -5, 10, 10",
  },
};