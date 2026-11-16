// lib/martin.js — 马丁比率 Martin（单一事实源，纯函数、可单元测试）
//
// Martin = (算术平均收益 − 每周期无风险) ÷ 年化下行偏差 × √freq。与 Sortino 同族
// （下行偏差为分母），区别：Martin 的下行偏差以「绝对 0」为阈值（仅惩罚亏损），
// 而 Sortino 以「可接受收益 MAR」为阈值。与 lib/risk.js 的 martinRatio 同口径，
// 以保证 /risk、/backtest 仪表盘与本计算器数字一致（单一事实源）。
// 约定：returns 为「周期收益（小数，如 0.015 = 1.5%）」；freq = 每年周期数
// （1=年、4=季、12=月、52=周、252=交易日）；rf = 年化无风险收益（小数）。
// 收益 ≥ −100%（−1）才有意义；无下行（全非负）时 Martin 无定义 → null。

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
export function parseFractions(raw) {
  if (Array.isArray(raw)) return raw.map(Number).filter((x) => Number.isFinite(x));
  if (raw == null) return null;
  const parts = String(raw).trim().split(/[\s,;]+/).filter(Boolean);
  if (parts.length === 0) return null;
  const out = [];
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isFinite(v)) return null;
    out.push(v);
  }
  return out;
}

// 每周期下行偏差（阈值固定为 0，仅惩罚亏损，与 lib/risk.js downsideDeviation 同口径）：
// 方差 = mean(min(r,0)²)；每周期下行 = sqrt(方差)。年化在 martinRatio 内 ×√freq 完成。n<2 → 0。
export function downsideDeviation(returns) {
  const n = returns.length;
  if (n < 2) return 0;
  let sum = 0;
  for (const r of returns) {
    if (!Number.isFinite(r)) return 0;
    sum += Math.min(r, 0) ** 2; // 仅统计低于 0 的亏损（平方其负部）
  }
  return Math.sqrt(sum / n);
}

// 马丁比率 = (mean − rf/freq) ÷ 每周期下行偏差 × √freq（与 lib/risk.js martinRatio 同口径，阈值 0）。
// 非有限输入或无下行 → 0。
export function martinRatio(returns, freq = 252, rf = 0) {
  const arr = returns;
  const n = arr.length;
  if (n < 2 || !(Number.isFinite(freq) && freq > 0)) return 0;
  let mean = 0;
  for (const r of arr) {
    if (!Number.isFinite(r)) return 0;
    mean += r;
  }
  mean = mean / n;
  const dd = downsideDeviation(arr);
  if (dd === 0) return 0;
  return ((mean - rf / freq) / dd) * Math.sqrt(freq);
}

// 解读：Martin 越高越好。null/非有限 → "infinite"（无下行）；<0 为负向。
// 经验分档（与 Sortino 同族）：<0 poor、[0,1) modest、[1,3) good、≥3 excellent。
export function martinVerdict(martin) {
  if (martin == null || !Number.isFinite(martin)) return "infinite";
  if (martin < 0) return "poor";
  if (martin < 1) return "modest";
  if (martin < 3) return "good";
  return "excellent";
}

// 主汇总：周期收益数组(小数) + freq + rf → Martin 视图。
// 非法（<2 个收益 / freq≤0 / 任一收益 ≤ −1）→ { valid:false, reason }。
export function martinSummary(input) {
  const o = input || {};
  const returns = Array.isArray(o.returns) ? o.returns : [];
  const freq = Number(o.freq);
  const rf = Number.isFinite(o.rf) ? o.rf : 0;
  const n = returns.length;
  if (n < 2 || !(Number.isFinite(freq) && freq > 0)) {
    return { valid: false, reason: "need at least 2 returns and freq > 0" };
  }
  for (const r of returns) {
    if (!Number.isFinite(r) || r <= -1) {
      return { valid: false, reason: "each return must be finite and > -100%" };
    }
  }
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const dd = downsideDeviation(returns); // 每周期下行偏差（阈值 0）
  // 无下行（全非负）时 Martin 无定义（→∞），以 null 表示。
  const martin = dd > 0 ? ((mean - rf / freq) / dd) * Math.sqrt(freq) : null;
  return {
    valid: true,
    n,
    freq,
    rf,
    mean,
    downsideDeviation: dd,
    martin,
    verdict: martinVerdict(martin),
  };
}

// 输入合法性校验（供页面/表单复用）。
export function validMartin(returns, freq, rf = 0) {
  return martinSummary({ returns, freq, rf }).valid;
}

// 示例预设（供 UI 一键填充；returns 为 % 文本，便于直接展示/编辑）。
export const MARTIN_PRESETS = {
  excellent: {
    id: "excellent",
    label: "高下行调整收益",
    labelEn: "High risk-adjusted",
    freq: 12,
    rf: 0.02,
    returns: "1.5, 1.3, 1.1, 1.2, 1.0, 1.4, 1.1, 0.9, 1.3, 1.2, 1.0, -0.6",
  },
  good: {
    id: "good",
    label: "高弹高震",
    labelEn: "Crypto-like",
    freq: 12,
    rf: 0.0,
    returns: "12, 8, -15, 14, 10, -20, 16, 11, -12, 15, 9, 7",
  },
  modest: {
    id: "modest",
    label: "单一大回撤",
    labelEn: "One big drawdown",
    freq: 12,
    rf: 0.0,
    returns: "5, 3, 4, 2, -10",
  },
  poor: {
    id: "poor",
    label: "净亏损",
    labelEn: "Net loss",
    freq: 12,
    rf: 0.0,
    returns: "0.5, 0.3, 0.4, 0.2, -5",
  },
};
