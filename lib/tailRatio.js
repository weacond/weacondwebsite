// lib/tailRatio.js — 尾部比率 Tail Ratio（单一事实源，纯函数、可单元测试）
//
// Tail Ratio = 上分位 ÷ |下分位|（默认 95% 分位 ÷ |5% 分位|）。与 Omega（用全部
// 收益/亏损金额）互补：Tail Ratio 只看两端分位数，更稳健于极端值，刻画分布的
// 「上行尾巴 vs 下行尾巴」。与 lib/risk.js 的 tailRatio 同口径，保证仪表盘与本
// 计算器数字一致（单一事实源）。全部确定性、无副作用。
// 约定：returns 为「周期收益（小数，如 0.015 = 1.5%）」；lowerQ/upperQ 为分位(0~1)。
// 下分位为 0（无可测量下行）→ 0（视为 ∞）；空序列/非有限 → 0。

// 分位数（线性插值，与 lib/risk.js quantile 同口径）：q 截断到 [0,1]。空 → NaN。
export function quantile(returns, q) {
  const arr = returns.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (arr.length === 0) return NaN;
  if (arr.length === 1) return arr[0];
  const clamped = Math.min(1, Math.max(0, q));
  const pos = clamped * (arr.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return arr[lo];
  return arr[lo] + (arr[hi] - arr[lo]) * (pos - lo);
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

// 尾部比率 = 上分位 ÷ |下分位|（与 lib/risk.js tailRatio 同口径）。
// 空序列 / 下分位 0 / 非有限分位 → 0。
export function tailRatio(returns, lowerQ = 0.05, upperQ = 0.95) {
  const arr = returns.filter((x) => Number.isFinite(x));
  if (arr.length === 0) return 0;
  const lo = quantile(returns, lowerQ);
  const hi = quantile(returns, upperQ);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
  if (lo === 0) return 0;
  return hi / Math.abs(lo);
}

// 解读：Tail Ratio 越高越好（上行尾比下行尾「厚」）。
// 下分位 0（无可测量下行）→ "infinite"；<1 下行尾更厚。
// 经验分档（启发式）：<1 poor、[1,2) modest、[2,4) good、≥4 excellent。
export function tailVerdict(tail) {
  if (tail == null || !Number.isFinite(tail)) return "invalid";
  if (tail === 0) return "infinite";
  if (tail < 1) return "poor";
  if (tail < 2) return "modest";
  if (tail < 4) return "good";
  return "excellent";
}

// 主汇总：{ returns, lowerQ, upperQ } → Tail Ratio 视图。
// 非法（<2 个收益 / 分位非法 / 任一收益非有限）→ { valid:false, reason }。
export function tailSummary(input) {
  const o = input || {};
  const returns = Array.isArray(o.returns) ? o.returns : [];
  const lowerQ = Number.isFinite(o.lowerQ) ? o.lowerQ : 0.05;
  const upperQ = Number.isFinite(o.upperQ) ? o.upperQ : 0.95;
  const n = returns.length;
  if (n < 2 || !Number.isFinite(lowerQ) || !Number.isFinite(upperQ)) {
    return { valid: false, reason: "need at least 2 finite returns and finite quantiles" };
  }
  for (const r of returns) {
    if (!Number.isFinite(r)) {
      return { valid: false, reason: "each return must be finite" };
    }
  }
  if (upperQ <= lowerQ) {
    return { valid: false, reason: "upperQ must be greater than lowerQ" };
  }
  const lo = quantile(returns, lowerQ);
  const hi = quantile(returns, upperQ);
  const tail = tailRatio(returns, lowerQ, upperQ);
  return {
    valid: true,
    n,
    lowerQ,
    upperQ,
    lowerQuantile: lo,
    upperQuantile: hi,
    tail,
    verdict: tailVerdict(tail),
  };
}

// 输入合法性校验（供页面/表单复用）。
export function validTail(returns, lowerQ = 0.05, upperQ = 0.95) {
  return tailSummary({ returns, lowerQ, upperQ }).valid;
}

// 示例预设（供 UI 一键填充；returns 为 % 文本，便于直接展示/编辑）。
export const TAIL_PRESETS = {
  upskew: {
    id: "upskew",
    label: "上行偏斜",
    labelEn: "Upside skew",
    lowerQ: 0.05,
    upperQ: 0.95,
    returns: "1, 1.5, 1, 2, 1, 0.5, 8, 1, 1, 0.5, -1, -0.5",
  },
  symmetric: {
    id: "symmetric",
    label: "近似对称",
    labelEn: "Symmetric",
    lowerQ: 0.05,
    upperQ: 0.95,
    returns: "2, -2, 1, -1, 2, -2, 1, -1, 0.5, -0.5",
  },
  downside: {
    id: "downside",
    label: "下行偏重",
    labelEn: "Downside-heavy",
    lowerQ: 0.05,
    upperQ: 0.95,
    returns: "1, 2, 1, 0.5, 1, 1.5, -3, -4, -2, -3.5",
  },
  short: {
    id: "short",
    label: "短序列",
    labelEn: "Short series",
    lowerQ: 0.1,
    upperQ: 0.9,
    returns: "5, -3, 4, -2, 6",
  },
};
