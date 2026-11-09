// lib/risk.js — 尾部风险度量（纯函数、确定性、可单元测试）
//
// 约定：
//   - returns：收益率数组（小数，如 -0.02 = -2%）。
//   - 损失类指标（VaR / CVaR / 最大回撤）以"正数 = 损失/回撤幅度"返回。
//   - 输入含 NaN/非数时自动清洗；空数组按语义返回 0 或 NaN（见各函数）。
//
// 这些是统计度量，非投资建议；用于 /black-swan 等页面的风险可视化。

// 线性插值分位数（type-7，q∈[0,1]）
export function quantile(returns, q) {
  const arr = cleanNums(returns).sort((a, b) => a - b);
  if (arr.length === 0) return NaN;
  if (arr.length === 1) return arr[0];
  const clamped = Math.min(1, Math.max(0, q));
  const pos = clamped * (arr.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return arr[lo];
  return arr[lo] + (arr[hi] - arr[lo]) * (pos - lo);
}

// 历史 VaR：confidence 分位对应的损失（正数）。VaR(c) = −q_{1−c}。
export function valueAtRisk(returns, confidence = 0.95) {
  const q = quantile(returns, 1 - confidence);
  if (Number.isNaN(q)) return NaN;
  return -q;
}

// 期望损失 CVaR（= 低于 VaR 阈值的收益均值，损失为正）。
// 恒满足 ES(c) ≥ VaR(c)。
export function expectedShortfall(returns, confidence = 0.95) {
  const arr = cleanNums(returns);
  if (arr.length === 0) return NaN;
  const threshold = quantile(returns, 1 - confidence);
  const tail = arr.filter((x) => x <= threshold);
  if (tail.length === 0) return -threshold; // 退化：等于 VaR
  const mean = tail.reduce((s, x) => s + x, 0) / tail.length;
  return -mean;
}

// 最大回撤（正数 = 回撤幅度），由净值曲线 peak-to-trough 计算。
export function maxDrawdown(equityCurve) {
  const arr = cleanNums(equityCurve);
  if (arr.length === 0) return 0;
  let peak = arr[0];
  let maxDD = 0;
  for (const v of arr) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = (peak - v) / peak;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD;
}

// 尾部事件：|z-score| > sigma 的收益率（样本标准差）。
// 返回 { events:[{index,return,z}], count, sigma, mean, std }。
export function detectTailEvents(returns, sigma = 3) {
  const arr = cleanNums(returns);
  if (arr.length < 2) return { events: [], count: 0, sigma, mean: 0, std: 0 };
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / (arr.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return { events: [], count: 0, sigma, mean, std: 0 };
  const events = [];
  arr.forEach((x, i) => {
    const z = (x - mean) / std;
    if (Math.abs(z) > sigma) events.push({ index: i, return: x, z });
  });
  return { events, count: events.length, sigma, mean, std };
}

// 工具：清洗为有限数值数组
function cleanNums(input) {
  return (Array.isArray(input) ? input : [])
    .filter((x) => typeof x === "number" && Number.isFinite(x));
}

/**
 * 从权益曲线提取风险剖面：日收益 → VaR / CVaR / 最大回撤。
 * equityCurve 可为 number[] 或 [{value}]。
 * @returns {var, cvar, mdd, n}；点数不足(收益<1)时返回 null。
 */
export function riskProfileFromEquity(equityCurve, confidence = 0.95) {
  const vals = (Array.isArray(equityCurve) ? equityCurve : [])
    .map((x) => (typeof x === "number" ? x : x?.value))
    .filter((x) => typeof x === "number" && Number.isFinite(x));
  if (vals.length < 2) return null;
  const returns = [];
  for (let i = 1; i < vals.length; i++) {
    const prev = vals[i - 1];
    if (prev !== 0) returns.push((vals[i] - prev) / prev);
  }
  if (returns.length === 0) return null;
  return {
    var: valueAtRisk(returns, confidence),
    cvar: expectedShortfall(returns, confidence),
    mdd: maxDrawdown(vals),
    n: returns.length,
  };
}
