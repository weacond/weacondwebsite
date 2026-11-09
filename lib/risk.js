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

/* ========== 仓位管理 ========== */

/**
 * Kelly 最优仓位分数 f*（一般形式）。
 * 公式 f* = p − (1−p)·(lossMult/winMult)；等价于 (b·p−q)/b（b=赔率, p=胜率, q=1−p）。
 * @param {number} p 胜率∈[0,1]
 * @param {number} [winMult=1] 平均盈利幅度（赢端/单位）
 * @param {number} [lossMult=1] 平均亏损幅度（亏端/单位）
 * @returns {number} 建议仓位比例；无优势或退化输入 → 0；上界 1。
 */
export function kellyFraction(p, winMult = 1, lossMult = 1) {
  if (!(p >= 0 && p <= 1) || !(winMult > 0) || !(lossMult > 0)) return 0;
  const f = p - (1 - p) * (lossMult / winMult);
  return Math.min(1, Math.max(0, f));
}

/**
 * 分数 Kelly：实际仓位 = f* × fraction（常用半凯利以控回撤）。
 * @param {number} fraction 缩放（如 0.5 = 半凯利）
 */
export function fractionalKelly(p, fraction = 0.5, winMult = 1, lossMult = 1) {
  return kellyFraction(p, winMult, lossMult) * fraction;
}

/**
 * 破产概率（经典赌徒破产公式，对称下注）：PR = ((1−w)/(1+w))^N，
 * 其中 w = 期望值 per bet（正期望则 <0.5，N 大时趋 0）。
 * @param {number} expectedValuePerBet 每注期望收益（正=有优势）
 * @param {number} [N=100] 下注次数
 * @returns {number} 破产概率∈[0,1]；无优势/平局 → 0.5 基准。
 */
export function probabilityOfRuin(expectedValuePerBet, N = 100) {
  if (!(N > 0)) return 1;
  if (Math.abs(expectedValuePerBet) < 1e-12) return 0.5; // 无优势：长期趋于 0.5
  if (expectedValuePerBet > 0) {
    // 有优势：破产概率随 N 指数衰减（用 (1−edge)/(1+edge) 的 N 次方近似）
    const r = (1 - expectedValuePerBet) / (1 + expectedValuePerBet);
    return Math.max(0, Math.pow(r, N));
  }
  // 负期望：长期几乎必然破产 → 趋近 1
  return Math.min(1, 1 - Math.pow(expectedValuePerBet, N));
}

