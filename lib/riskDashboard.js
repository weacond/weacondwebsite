// lib/riskDashboard.js — 风险与绩效仪表盘聚合器（纯函数、确定性、可单元测试）
//
// 把一条净值曲线（equity curve）一次性映射为完整风险剖面，复用 lib/risk.js 的
// 全套尾部/回撤/绩效比率度量，供 /risk 页面（双语）使用。
//
// 约定：
//   - equity curve：净值序列（如 [100, 102, 98, ...]），可含 {value} 对象，自动清洗非有限值。
//   - 损失/回撤类指标以"正数 = 幅度"返回（与 lib/risk.js 一致）。
//   - 比率类（Sharpe/Sortino/Calmar/Omega/Tail/Sterling）直接取 lib/risk.js 口径。

import {
  maxDrawdown,
  drawdownDuration,
  drawdownRecovery,
  ulcerIndex,
  maxDrawdownStats,
  valueAtRisk,
  expectedShortfall,
  excessKurtosis,
  skewness,
  sharpeRatio,
  sortinoRatio,
  calmarRatio,
  omegaRatio,
  tailRatio,
  sterlingRatio,
  maxLosingStreak,
  maxWinStreak,
} from "./risk.js";

// 清洗净值曲线为有限数值数组（接受 number[] 或 [{value}]）
export function cleanCurve(curve) {
  return (Array.isArray(curve) ? curve : [])
    .map((x) => (typeof x === "number" ? x : x?.value))
    .filter((x) => typeof x === "number" && Number.isFinite(x));
}

// 由净值序列推导逐期收益率（小数；前值非 0 才计入）
export function returnsFromCurve(curve) {
  const vals = cleanCurve(curve);
  const out = [];
  for (let i = 1; i < vals.length; i++) {
    const prev = vals[i - 1];
    if (prev !== 0) out.push((vals[i] - prev) / prev);
  }
  return out;
}

// 累计总收益（百分数，带符号）；首点为 0 或不足两点 → 0
export function totalReturn(curve) {
  const vals = cleanCurve(curve);
  if (vals.length < 2) return 0;
  const first = vals[0];
  const last = vals[vals.length - 1];
  if (first === 0) return 0;
  return ((last - first) / first) * 100;
}

// 复合年化增长率 CAGR（百分数，带符号）；首/末 ≤0 或 years≤0 → 0
export function cagr(curve, years) {
  const vals = cleanCurve(curve);
  if (vals.length < 2 || !(years > 0)) return 0;
  const first = vals[0];
  const last = vals[vals.length - 1];
  if (first <= 0 || last <= 0) return 0;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
}

// 内置示例净值曲线（教育用）
export const CURVE_PRESETS = {
  steady: { label: "稳健牛", labelEn: "Steady Bull", years: 1, curve: buildSteady() },
  crashRecovery: { label: "崩盘后修复", labelEn: "Crash & Recovery", years: 2, curve: buildCrashRecovery() },
  chop: { label: "高波动震荡", labelEn: "Volatile Chop", years: 1, curve: buildChop() },
};

export function getCurvePreset(key) {
  const p = CURVE_PRESETS[key];
  if (!p) throw new Error(`Unknown curve preset: ${key}`);
  return p;
}

// 由净值曲线构建完整风险剖面；点数不足 2 抛错。
// opts: { rf, periods, years, confidence }（均带默认）
export function buildRiskDashboard(curve, opts = {}) {
  const periods = opts.periods && opts.periods > 0 ? opts.periods : 252;
  const rf = typeof opts.rf === "number" && Number.isFinite(opts.rf) ? opts.rf : 0;
  const confidence =
    typeof opts.confidence === "number" && opts.confidence > 0 && opts.confidence < 1
      ? opts.confidence
      : 0.95;

  const vals = cleanCurve(curve);
  if (vals.length < 2) throw new Error("Equity curve needs at least 2 points");

  const returns = returnsFromCurve(curve);
  const years = opts.years && opts.years > 0 ? opts.years : returns.length / periods;

  // 回撤块：深度 / 持续 / 恢复 / 痛苦度
  const ddRecovery = drawdownRecovery(vals);
  const ddStats = maxDrawdownStats(vals);
  const drawdown = {
    mdd: ddRecovery.mdd,
    mddPct: ddRecovery.mdd * 100,
    duration: drawdownDuration(vals),
    recovery: ddRecovery.recovery,
    recovered: ddRecovery.recovered,
    ulcer: ulcerIndex(vals),
    avgDD: ddStats.avgDD,
    longestUnderwater: ddStats.longestUnderwater,
    pctUnderwater: ddStats.pctUnderwater,
  };

  // 尾部块：VaR / CVaR / 偏度 / 峰度（基于收益率）
  const tail = {
    var95: valueAtRisk(returns, 0.95),
    var99: valueAtRisk(returns, 0.99),
    cvar95: expectedShortfall(returns, 0.95),
    cvar99: expectedShortfall(returns, 0.99),
    varAtConf: valueAtRisk(returns, confidence),
    cvarAtConf: expectedShortfall(returns, confidence),
    confidence,
    skewness: skewness(returns),
    kurtosis: excessKurtosis(returns),
  };

  // 绩效比率块
  const tr = totalReturn(curve);
  const c = cagr(curve, years);
  const mls = maxLosingStreak(returns);
  const ratios = {
    sharpe: sharpeRatio(returns, periods, rf),
    sortino: sortinoRatio(returns, periods, rf),
    calmar: calmarRatio(c, drawdown.mdd),
    omega: omegaRatio(returns, 0),
    tail: tailRatio(returns, 0.05, 0.95),
    sterling: sterlingRatio(tr, mls),
  };

  return {
    n: vals.length,
    years,
    totalReturn: tr,
    cagr: c,
    drawdown,
    tail,
    ratios,
    maxLosingStreak: mls,
    maxWinStreak: maxWinStreak(returns),
  };
}

// 风险分层（按最大回撤幅度）：1 低 / 2 中 / 3 高 / 4 极高
// 返回 { tier, label, labelEn, color }
export function riskTier(dashboard) {
  const mdd = dashboard?.drawdown?.mdd;
  if (typeof mdd !== "number" || Number.isNaN(mdd)) {
    return { tier: 0, label: "—", labelEn: "—", color: "slate" };
  }
  if (mdd < 0.1) return { tier: 1, label: "低风险", labelEn: "Low", color: "emerald" };
  if (mdd < 0.25) return { tier: 2, label: "中风险", labelEn: "Moderate", color: "amber" };
  if (mdd < 0.4) return { tier: 3, label: "高风险", labelEn: "High", color: "orange" };
  return { tier: 4, label: "极高风险", labelEn: "Severe", color: "rose" };
}

// —— 确定性示例曲线生成器（线性同余伪随机，保证可复现）——

function buildSteady() {
  // 单调上行的近似曲线（含轻微锯齿回撤）
  const out = [];
  let v = 100;
  let s = 42;
  for (let i = 0; i < 252; i++) {
    s = (s * 9301 + 49297) % 233280;
    const noise = (s / 233280 - 0.5) * 0.01;
    v = v * (1 + 0.0008 + noise);
    out.push(Number(v.toFixed(4)));
  }
  return out;
}

function buildCrashRecovery() {
  // 500 点：先升、深跌、再修复（≈2 年）
  const out = [];
  let v = 100;
  const n = 500;
  for (let i = 0; i < n; i++) {
    let r;
    if (i < 200) r = 0.002; // 上行
    else if (i < 280) r = -0.02; // 崩盘
    else r = 0.0015; // 修复
    v = v * (1 + r);
    out.push(Number(v.toFixed(4)));
  }
  return out;
}

function buildChop() {
  const out = [];
  let v = 100;
  let s = 77;
  for (let i = 0; i < 252; i++) {
    s = (s * 9301 + 49297) % 233280;
    const noise = (s / 233280 - 0.5) * 2 * 0.02;
    v = v * (1 + noise);
    out.push(Number(v.toFixed(4)));
  }
  return out;
}

// 暴露 maxDrawdown 便于页面/测试直接引用（保持单一口径）
export { maxDrawdown };

