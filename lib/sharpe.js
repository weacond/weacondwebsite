// lib/sharpe.js — 夏普比率（单一事实源，纯函数、可单元测试）
//
// Sharpe = (年化收益 − 无风险利率) ÷ 年化波动率(标准差)。最经典的风险调整后收益指标，
// 衡量「每单位总风险换来多少超额收益」。与 Calmar(回撤)、Sortino(下行)相比，
// Sharpe 用总波动率(标准差)作分母，对称看待上下行波动。全部确定性、无副作用。
//
// 约定：returns 为「周期收益（小数，如 0.015 = 1.5%）」；freq = 每年周期数
// （1=年、4=季、12=月、52=周、252=交易日）；rf 为「年化无风险利率（小数，如 0.02 = 2%）」。
// 年化收益用 CAGR(几何)，年化波动率 = 每周期样本标准差(n−1) × sqrt(freq)。
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

// 样本标准差(n−1)。n < 2 或含非有限值 → null。
export function stdev(returns) {
  const n = returns.length;
  if (n < 2) return null;
  let sum = 0;
  for (const r of returns) {
    if (!Number.isFinite(r)) return null;
    sum += r;
  }
  const m = sum / n;
  let ss = 0;
  for (const r of returns) ss += (r - m) * (r - m);
  return Math.sqrt(ss / (n - 1));
}

// 年化波动率 = 每周期样本标准差 × sqrt(freq)。n < 2 或 freq≤0 → null。
export function annualizedVol(returns, freq) {
  if (!(Number.isFinite(freq) && freq > 0)) return null;
  const perPeriod = stdev(returns);
  if (perPeriod == null) return null;
  return perPeriod * Math.sqrt(freq);
}

// 解读：Sharpe 越高越好。null/非有限 → "infinite"（零波动）；<0 为负。
export function sharpeVerdict(sharpe) {
  if (sharpe == null || !Number.isFinite(sharpe)) return "infinite";
  if (sharpe < 0) return "poor";
  if (sharpe < 1) return "modest";
  if (sharpe < 3) return "good";
  return "excellent";
}

// 主汇总：周期收益数组(小数) + freq + rf → Sharpe 视图。
// 非法（<2 个收益 / freq≤0 / 任一收益 ≤ −1 / 终值 ≤ 0）→ { valid:false, reason }。
export function sharpeSummary(input) {
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
  const we = wealthIndex(returns);
  const end = we[we.length - 1];
  if (!(end > 0)) return { valid: false, reason: "final wealth must be positive" };
  const years = n / freq;
  const annualized = cagr(1, end, years); // 起点财富指数 = 1
  const vol = annualizedVol(returns, freq); // 年化波动率
  // 零波动（所有收益相同）时 Sharpe 无定义（→∞），以 null 表示。
  const sharpe = vol > 0 ? (annualized - rf) / vol : null;
  return {
    valid: true,
    n,
    freq,
    years,
    rf,
    annualized,
    volatility: vol,
    sharpe,
    verdict: sharpeVerdict(sharpe),
  };
}

// 输入合法性校验（供页面/表单复用）。
export function validSharpe(returns, freq, rf = 0) {
  return sharpeSummary({ returns, freq, rf }).valid;
}

// 示例预设（供 UI 一键填充；returns 为 % 文本，便于直接展示/编辑）。
export const SHARPE_PRESETS = {
  steady: {
    id: "steady",
    label: "稳健权益",
    labelEn: "Steady equity",
    freq: 12,
    rf: 0.02,
    returns: "1.2, 1.0, 0.8, -1.5, 1.1, 1.3, 0.9, 1.0, 1.2, -0.8, 1.1, 1.0",
  },
  volatile: {
    id: "volatile",
    label: "高波动",
    labelEn: "Volatile",
    freq: 12,
    rf: 0.02,
    returns: "3.0, 2.5, -4.0, 3.5, -5.0, 3.0, 2.0, -3.5, 4.0, -6.0, 3.0, 2.5",
  },
  bondlike: {
    id: "bondlike",
    label: "低波债券",
    labelEn: "Bond-like",
    freq: 12,
    rf: 0.02,
    returns: "0.35, 0.30, 0.32, 0.28, 0.33, 0.30, 0.31, 0.29, 0.34, 0.30, 0.32, 0.30",
  },
  crypto: {
    id: "crypto",
    label: "高弹高震",
    labelEn: "Crypto-like",
    freq: 12,
    rf: 0.0,
    returns: "12, 8, -15, 14, 10, -20, 16, 11, -12, 15, 9, 7",
  },
};