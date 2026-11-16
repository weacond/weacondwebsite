// lib/infoRatio.js — 信息比率（单一事实源，纯函数、可单元测试）
//
// 信息比率 IR = 年化主动收益 ÷ 年化追踪误差，衡量「每单位跟踪基准的偏离换来多少主动收益」。
// 主动收益 = 组合收益 − 基准收益（逐期相减）；追踪误差 = 主动收益序列的样本标准差(n−1)。
// 年化 IR = sqrt(freq) × mean(active) / std(active)。
// 是主动管理 / 对冲基金 / ETF 常用的风险调整指标（>0.5 好，>0.75 优秀）。
// 全部确定性、无副作用。
//
// 约定：portfolio / benchmark 为「逐期收益（小数，如 0.01 = 1%）」，长度必须一致（逐期配对）；
// freq = 每年周期数（1=年、4=季、12=月…）。样本标准差需 n ≥ 2。
// UI 用 %（parseReturns 除以 100），MCP/agent 用小数（parseFractions 不除以 100）。

// 样本标准差（n−1）。n < 2 → null。
export function stdev(values) {
  const n = values.length;
  if (n < 2) return null;
  const m = values.reduce((s, x) => s + x, 0) / n;
  let ss = 0;
  for (const x of values) ss += (x - m) * (x - m);
  return Math.sqrt(ss / (n - 1));
}

// 主动收益序列（逐期相减，取较短长度）。
export function activeReturns(portfolio, benchmark) {
  const n = Math.min(portfolio.length, benchmark.length);
  const out = [];
  for (let i = 0; i < n; i++) out.push(portfolio[i] - benchmark[i]);
  return out;
}

// 信息比率：portfolio/benchmark 为小数收益数组，freq 为每年周期数。
// 长度 <2 / freq≤0 / 追踪误差为 0 → null。
export function informationRatio(portfolio, benchmark, freq = 1) {
  const n = Math.min(portfolio.length, benchmark.length);
  if (n < 2 || !(Number.isFinite(freq) && freq > 0)) return null;
  const active = activeReturns(portfolio, benchmark);
  const te = stdev(active); // 每期追踪误差
  if (te == null || te === 0) return null;
  const activeMean = active.reduce((s, x) => s + x, 0) / n;
  return Math.sqrt(freq) * (activeMean / te); // 年化 IR
}

// 解读：IR 越高，每单位追踪误差换来的主动收益越多。null/非有限 → "undefined"。
export function irVerdict(ir) {
  if (ir == null || !Number.isFinite(ir)) return "undefined";
  if (ir < 0) return "poor";
  if (ir === 0) return "neutral";
  if (ir < 0.5) return "modest";
  if (ir < 0.75) return "good";
  return "excellent";
}

// 主汇总：portfolio/benchmark 为小数收益数组 + freq。
// 缺序列 / 长度不一致 / 非有限 / n<2 / 追踪误差为 0 → { valid:false, reason }。
export function informationRatioSummary(input) {
  const o = input || {};
  const portfolio = Array.isArray(o.portfolio) ? o.portfolio : [];
  const benchmark = Array.isArray(o.benchmark) ? o.benchmark : [];
  const freq = Number(o.freq);
  if (portfolio.length === 0 || benchmark.length === 0) {
    return { valid: false, reason: "need both portfolio and benchmark returns" };
  }
  if (portfolio.length !== benchmark.length) {
    return { valid: false, reason: "portfolio and benchmark must have the same number of periods" };
  }
  for (let i = 0; i < portfolio.length; i++) {
    if (!Number.isFinite(portfolio[i]) || !Number.isFinite(benchmark[i])) {
      return { valid: false, reason: "all returns must be finite numbers" };
    }
  }
  if (portfolio.length < 2 || !(Number.isFinite(freq) && freq > 0)) {
    return { valid: false, reason: "need at least 2 matched periods and freq > 0" };
  }
  const active = activeReturns(portfolio, benchmark);
  const activeMean = active.reduce((s, x) => s + x, 0) / active.length;
  const te = stdev(active);
  if (te == null || te === 0) {
    return { valid: false, reason: "tracking error is zero (portfolio tracks benchmark exactly)" };
  }
  const annualizedTE = te * Math.sqrt(freq);
  const annualizedActive = activeMean * freq; // 算术年化主动收益
  const ir = annualizedActive / annualizedTE; // = sqrt(freq) × activeMean / te
  return {
    valid: true,
    n: portfolio.length,
    freq,
    activeMean, // 每期主动收益(小数)
    activeReturn: annualizedActive, // 年化主动收益(小数)
    trackingError: annualizedTE, // 年化追踪误差(小数)
    ir,
    verdict: irVerdict(ir),
  };
}

// 输入合法性校验（供页面/表单复用）。
export function validInfoRatio(portfolio, benchmark, freq = 1) {
  return informationRatioSummary({ portfolio, benchmark, freq }).valid;
}

// UI % 解析 → 小数收益数组（逗号/分号/空白/换行分隔），任一非法 → null。
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

// MCP/agent 约定：序列以小数给出（不 /100）。接受数组或逗号/分号/空白分隔的字符串。
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

// 示例预设（portfolio/benchmark 为 % 文本，逐期配对；active 各异 → 追踪误差 > 0）。
export const INFO_RATIO_PRESETS = {
  beat: {
    id: "beat",
    label: "跑赢基准",
    labelEn: "Outperformer",
    freq: 12,
    portfolio: "1.2, 1.5, 0.8, 1.3, 1.6, 1.1, 1.4, 1.2, 1.5, 1.0, 1.3, 1.4",
    benchmark: "0.8, 1.0, 0.7, 0.9, 1.1, 0.8, 1.0, 0.9, 1.1, 0.7, 0.9, 1.0",
  },
  track: {
    id: "track",
    label: "紧贴基准",
    labelEn: "Tracks index",
    freq: 12,
    portfolio: "0.9, 1.0, 0.8, 1.1, 0.9, 1.0, 0.85, 0.95, 1.05, 0.9, 0.88, 0.97",
    benchmark: "0.85, 0.95, 0.78, 1.02, 0.88, 0.92, 0.82, 0.9, 1.0, 0.87, 0.84, 0.93",
  },
  lag: {
    id: "lag",
    label: "跑输基准",
    labelEn: "Laggard",
    freq: 12,
    portfolio: "0.7, 0.9, 0.6, 1.0, 0.8, 0.7, 0.9, 0.6, 0.8, 0.7, 0.85, 0.75",
    benchmark: "1.0, 1.1, 0.9, 1.2, 1.0, 0.9, 1.1, 0.9, 1.0, 0.9, 1.0, 0.95",
  },
  diverge: {
    id: "diverge",
    label: "高跟踪误差",
    labelEn: "High tracking error",
    freq: 12,
    portfolio: "2.5, 1.0, 3.0, -1.0, 2.0, 1.5, -0.5, 2.5, 1.0, 3.0, -1.5, 2.0",
    benchmark: "0.9, 0.8, 1.0, 0.7, 0.9, 0.8, 0.7, 0.9, 0.8, 1.0, 0.7, 0.9",
  },
};