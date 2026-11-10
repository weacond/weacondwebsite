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

/**
 * 最大回撤及其恢复时长：定位最深回撤区间 [peakIdx, troughIdx]，
 * 并统计从 trough 后首次回升至该峰值的期数。
 * 口径与 maxDrawdown 一致（运行峰值、dd=(peak−v)/peak）。
 * @param {number[]} equityCurve 净值序列
 * @returns {{mdd:number, peakIdx:number, troughIdx:number, recovery:number|null, recovered:boolean}}
 *   recovery=null 表示至今未恢复。
 */
export function drawdownRecovery(equityCurve) {
  const arr = cleanNums(equityCurve);
  if (arr.length < 2) return { mdd: 0, peakIdx: -1, troughIdx: -1, recovery: null, recovered: false };
  let peak = arr[0];
  let peakIdx = 0;
  let maxDD = 0;
  let ddPeakIdx = 0;
  let ddTroughIdx = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > peak) {
      peak = arr[i];
      peakIdx = i;
    }
    if (peak > 0) {
      const dd = (peak - arr[i]) / peak;
      if (dd > maxDD) {
        maxDD = dd;
        ddPeakIdx = peakIdx;
        ddTroughIdx = i;
      }
    }
  }
  const peakLevel = arr[ddPeakIdx];
  let recovery = null;
  for (let i = ddTroughIdx + 1; i < arr.length; i++) {
    if (arr[i] >= peakLevel) {
      recovery = i - ddTroughIdx;
      break;
    }
  }
  return { mdd: maxDD, peakIdx: ddPeakIdx, troughIdx: ddTroughIdx, recovery, recovered: recovery !== null };
}

/**
 * 最大回撤持续期数 = 最深回撤区间 [peakIdx, troughIdx] 的 K 线根数。
 * 刻画"从顶点跌到谷底花了多久"，与 maxDrawdown（深度）、drawdownRecovery.recovery
 * （谷底→创新高）共同构成完整回撤生命周期。口径与 maxDrawdown 一致
 * （运行峰值、dd=(peak−v)/peak；取最深回撤的那一段区间）。
 * @param {number[]} equityCurve 净值序列（自动清洗非有限）
 * @returns {number} 持续期数（≥0 整数）；空或单点或全程上涨（回撤恒为 0）→ 0
 */
export function drawdownDuration(equityCurve) {
  const arr = cleanNums(equityCurve);
  if (arr.length < 2) return 0;
  let peak = arr[0];
  let peakIdx = 0;
  let maxDD = 0;
  let ddPeakIdx = 0;
  let ddTroughIdx = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > peak) {
      peak = arr[i];
      peakIdx = i;
    }
    if (peak > 0) {
      const dd = (peak - arr[i]) / peak;
      if (dd > maxDD) {
        maxDD = dd;
        ddPeakIdx = peakIdx;
        ddTroughIdx = i;
      }
    }
  }
  return ddTroughIdx - ddPeakIdx;
}

/**
 * 溃疡指数 Ulcer Index = √(mean(D²))，D 为逐期回撤（≤0，口径与 maxDrawdown 一致）。
 * 比单点最大回撤更全面：同时刻画回撤的深度与持续（"痛苦"程度）。
 * @param {number[]} equityCurve 净值序列（自动清洗非有限）
 * @returns {number} 溃疡指数（≥0）；空或单点 → 0；全程上涨 → 0（回撤恒为 0）
 */
export function ulcerIndex(equityCurve) {
  const arr = cleanNums(equityCurve);
  if (arr.length < 2) return 0;
  let peak = arr[0];
  let sumSq = 0;
  let n = 0;
  for (const v of arr) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0; // ≤0
    sumSq += dd * dd;
    n += 1;
  }
  return Math.sqrt(sumSq / n);
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
    kurtosis: excessKurtosis(returns),
    skewness: skewness(returns),
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

/**
 * 风险预算仓位（VaR 驱动）：
 * 给定每单位标的的日 VaR（占其名义价值的比例 varPerUnit，
 * 如 0.02 表示每 $100 名义每日 95% VaR $2）与组合可承受的最大日亏损比例 maxLossFrac，
 * 返回最大名义仓位（占组合的比例）= maxLossFrac / varPerUnit。
 * varPerUnit ≤ 0 或非法 → 0；结果非负。纯函数，确定性。
 * 例：varPerUnit=0.02, maxLossFrac=0.01 → 0.5（半仓）。
 */
export function riskBudget(varPerUnit, maxLossFrac) {
  if (!Number.isFinite(varPerUnit) || !Number.isFinite(maxLossFrac) || varPerUnit <= 0) return 0;
  return Math.max(0, maxLossFrac / varPerUnit);
}

/**
 * 最长连续亏损交易数（最长连亏段长度）。
 * 接受交易数组 [{pnl}] 或收益数组 number[]；pnl/收益 ≤ 0 视为亏损
 * （与 lib/backtest.js calcMetrics 的亏损口径一致，scratch 交易亦计入连亏）。
 * 返回最长连续亏损段的长度；空数组或无亏损 → 0。纯函数，确定性。
 * 例：[2,-1,-1,3,-1,-1,-1] → 3（末尾三笔连亏）。
 */
export function maxLosingStreak(trades) {
  const isLoss = (x) => {
    const v = typeof x === "number" ? x : x?.pnl;
    return typeof v === "number" && Number.isFinite(v) && v <= 0;
  };
  let best = 0;
  let cur = 0;
  for (const t of Array.isArray(trades) ? trades : []) {
    if (isLoss(t)) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

/**
 * 最长连续盈利交易数（最长连盈段长度）。maxLosingStreak 的对称版本。
 * 接受交易数组 [{pnl}] 或收益数组 number[]；pnl/收益 > 0 计为盈利，
 * 其余（含 scratch，pnl≤0）中断连盈。空数组或无盈利 → 0。纯函数，确定性。
 * 例：[1,2,-1,3,4,5] → 3（末尾 3,4,5 连盈）。
 */
export function maxWinStreak(trades) {
  const isWin = (x) => {
    const v = typeof x === "number" ? x : x?.pnl;
    return typeof v === "number" && Number.isFinite(v) && v > 0;
  };
  let best = 0;
  let cur = 0;
  for (const t of Array.isArray(trades) ? trades : []) {
    if (isWin(t)) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

/**
 * 超额峰度（excess kurtosis）= m4/m2² − 3，衡量收益分布尾部厚度。
 * >0 尖峰厚尾（极端事件更频繁，肥尾），<0 平峰薄尾，=0 近似正态。
 * 用总体矩（n 分母）。点数 <4 或方差为 0 → 0。
 * @param {number[]} returns 收益序列（自动剔除非有限值）
 * @returns {number} 超额峰度；不足 4 点或全相等 → 0
 */
export function excessKurtosis(returns) {
  const arr = cleanNums(returns);
  const n = arr.length;
  if (n < 4) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  let m2 = 0;
  let m4 = 0;
  for (const x of arr) {
    const d = x - mean;
    const d2 = d * d;
    m2 += d2;
    m4 += d2 * d2;
  }
  m2 /= n;
  m4 /= n;
  if (m2 === 0) return 0;
  return m4 / (m2 * m2) - 3;
}

/**
 * 偏度（skewness）= m3/m2^(3/2)，衡量收益分布左右不对称。
 * >0 右偏（正尾厚，大盈更多），<0 左偏（负尾厚，大亏更多），=0 对称。
 * 用总体矩（n 分母）。点数 <3 或方差为 0 → 0。
 * @param {number[]} returns 收益序列（自动剔除非有限值）
 * @returns {number} 偏度；不足 3 点或全相等 → 0
 */
export function skewness(returns) {
  const arr = cleanNums(returns);
  const n = arr.length;
  if (n < 3) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  let m2 = 0;
  let m3 = 0;
  for (const x of arr) {
    const d = x - mean;
    m2 += d * d;
    m3 += d * d * d;
  }
  m2 /= n;
  m3 /= n;
  if (m2 === 0) return 0;
  return m3 / Math.pow(m2, 1.5);
}

/**
 * 夏普比率 = (μ − rf)/σ × √periods，σ 为样本标准差（n−1 分母）。
 * 与 calcMetrics 内部实现同源，便于复用与独立测试。
 * @param {number[]} returns 收益序列（小数；自动剔除非有限）
 * @param {number} [periods=252] 年化期数
 * @param {number} [rf=0] 无风险利率（同口径小数）
 * @returns {number} 夏普；<2 点或 σ=0 → 0
 */
export function sharpeRatio(returns, periods = 252, rf = 0) {
  const arr = cleanNums(returns);
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / (arr.length - 1));
  if (std === 0) return 0;
  return ((mean - rf) / std) * Math.sqrt(periods);
}

/**
 * 索提诺比率 = (μ − rf)/σ_down × √periods，σ_down 为下行标准差
 * （仅取 r<rf 的收益，用其个数 n 作分母的"总体"口径，且需 >1 个下行样本）。
 * 与 calcMetrics 内部实现同源。
 * @param {number[]} returns 收益序列（小数；自动剔除非有限）
 * @param {number} [periods=252] 年化期数
 * @param {number} [rf=0] 无风险利率（同口径小数）
 * @returns {number} 索提诺；下行样本 ≤1 个或 σ_down=0 → 0
 */
export function sortinoRatio(returns, periods = 252, rf = 0) {
  const arr = cleanNums(returns);
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const downside = arr.filter((r) => r < rf);
  if (downside.length <= 1) return 0;
  const downsideStd = Math.sqrt(
    downside.reduce((a, b) => a + b ** 2, 0) / downside.length
  );
  if (downsideStd === 0) return 0;
  return ((mean - rf) / downsideStd) * Math.sqrt(periods);
}

/**
 * 下行标准差（downside deviation）= √( (1/n)·Σ min(r−threshold, 0)² )。
 * 仅计入低于阈值（默认 0）的部分，用全样本 n 作分母。衡量下行波动。
 * 全样本（非仅下行子样本），故与 sortinoRatio 内的"下行个数"分母口径不同。
 * @param {number[]} returns 收益序列（自动剔除非有限）
 * @param {number} [threshold=0] 下行阈值（同口径小数）
 * @returns {number} 下行标准差；空 → 0
 */
export function downsideDeviation(returns, threshold = 0) {
  const arr = cleanNums(returns);
  const n = arr.length;
  if (n === 0) return 0;
  const sum = arr.reduce((a, b) => a + Math.min(b - threshold, 0) ** 2, 0);
  return Math.sqrt(sum / n);
}

/**
 * 欧米伽比率 Ω = Σ(r > t) / |Σ(r < t)|（阈值 t，默认 0）。
 * 上行总收益 / 下行总损失。>1 表示上行收益整体大于下行损失。
 * 无下行且存在上行时按惯例封顶 999；既无上行也无下行 → 0。
 * @param {number[]} returns 收益序列（自动剔除非有限）
 * @param {number} [threshold=0] 阈值（同口径小数）
 * @returns {number} 欧米伽比率；无下行 → 999/0
 */
export function omegaRatio(returns, threshold = 0) {
  const arr = cleanNums(returns);
  let up = 0;
  let down = 0;
  for (const r of arr) {
    if (r > threshold) up += r - threshold;
    else if (r < threshold) down += threshold - r;
  }
  if (down === 0) return up > 0 ? 999 : 0;
  return up / down;
}

/**
 * 尾部比率 = q_upper / |q_lower|（默认 95% 分位 / |5% 分位|）。
 * 衡量上下尾不对称：>1 上行尾更肥（有利），<1 下行尾更肥（不利）。
 * 分位为 0 时返回 0。复用 quantile。
 * @param {number[]} returns 收益序列（自动剔除非有限）
 * @param {number} [lowerQ=0.05] 下尾分位
 * @param {number} [upperQ=0.95] 上尾分位
 * @returns {number} 尾部比率；空或下尾分位为 0 → 0
 */
export function tailRatio(returns, lowerQ = 0.05, upperQ = 0.95) {
  const arr = cleanNums(returns);
  if (arr.length === 0) return 0;
  const lo = quantile(returns, lowerQ);
  const hi = quantile(returns, upperQ);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
  if (lo === 0) return 0;
  return hi / Math.abs(lo);
}

/**
 * 斯特林比率 Sterling = 总收益 / 最长连续亏损交易数。
 * 把收益按"最坏连亏"归一：值越大，说明单位连亏对应的收益越高（抗回撤韧性），
 * 与 Calmar（对最大回撤归一）互补——Sterling 从"连亏次数"维度衡量风险调整收益。
 * 无连亏（maxLosingStreak=0）时按惯例封顶 999；无收益 → 0；非有限输入 → 0。
 * @param {number} totalReturn 总收益（%，带符号）
 * @param {number} maxLosingStreak 最长连续亏损交易数（≥0 整数）
 * @returns {number} 斯特林比率；无连亏 → 999/0；非有限输入 → 0
 */
export function sterlingRatio(totalReturn, maxLosingStreak) {
  if (!Number.isFinite(totalReturn) || !Number.isFinite(maxLosingStreak)) return 0;
  if (maxLosingStreak <= 0) return totalReturn > 0 ? 999 : 0;
  return totalReturn / maxLosingStreak;
}

// 按索引对齐两条序列，仅保留两侧均为有限数的配对。
// 用于"需基准序列"的指标（信息比率 / 捕获率）：以较短长度截断，逐位配对。
function alignedPairs(returns, benchmark) {
  const a = Array.isArray(returns) ? returns : [];
  const b = Array.isArray(benchmark) ? benchmark : [];
  const n = Math.min(a.length, b.length);
  const pairs = [];
  for (let i = 0; i < n; i++) {
    const r = a[i];
    const bm = b[i];
    if (typeof r === "number" && Number.isFinite(r) && typeof bm === "number" && Number.isFinite(bm)) {
      pairs.push({ r, b: bm });
    }
  }
  return pairs;
}

/**
 * 信息比率 IR = mean(超额收益) / σ(超额收益) × √periods，超额收益 a_i = r_i − b_i
 * （策略对基准的主动收益，按索引对齐）。σ 为样本标准差（n−1 分母），与 sharpeRatio 同源。
 * IR 衡量"每单位跟踪误差的超额收益"，>0 表示跑赢基准的效率。
 * 与 Sharpe 互补：Sharpe 对绝对收益归一，IR 对相对基准归一。
 * @param {number[]} returns 策略收益序列（小数；自动剔除非有限）
 * @param {number[]} benchmark 基准收益序列（小数；按索引对齐）
 * @param {number} [periods=252] 年化期数
 * @returns {number} 信息比率；配对 <2 或超额收益 σ=0 → 0
 */
export function informationRatio(returns, benchmark, periods = 252) {
  const pairs = alignedPairs(returns, benchmark);
  const n = pairs.length;
  if (n < 2) return 0;
  const active = pairs.map((p) => p.r - p.b);
  const mean = active.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(active.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
  if (std === 0) return 0;
  return (mean / std) * Math.sqrt(periods);
}

/**
 * 捕获率（capture ratio）：策略相对基准的"上行/下行收益捕获"。
 * 上行捕获 = mean(策略收益 | 基准>0) / mean(基准收益 | 基准>0)；
 * 下行捕获 = mean(策略收益 | 基准<0) / mean(基准收益 | 基准<0)。
 * 上行捕获越接近 1 越好（跟得上市场上涨）；下行捕获越低越好（跌得比市场少）。
 * 无对应方向基准区间（分母 0）→ 该方向返回 0。
 * @param {number[]} returns 策略收益序列（小数；自动剔除非有限）
 * @param {number[]} benchmark 基准收益序列（小数；按索引对齐）
 * @returns {{up: number, down: number}} 上行/下行捕获率；无区间 → 对应 0
 */
export function captureRatios(returns, benchmark) {
  const pairs = alignedPairs(returns, benchmark);
  let upR = 0,
    upB = 0,
    upN = 0,
    downR = 0,
    downB = 0,
    downN = 0;
  for (const { r, b } of pairs) {
    if (b > 0) {
      upR += r;
      upB += b;
      upN++;
    } else if (b < 0) {
      downR += r;
      downB += b;
      downN++;
    }
  }
  const up = upN > 0 && upB !== 0 ? upR / upB : 0;
  const down = downN > 0 && downB !== 0 ? downR / downB : 0;
  return { up, down };
}

/**
 * 跟踪误差 TE = σ(超额收益) × √periods，超额收益 a_i = r_i − b_i（按索引对齐）。
 * σ 为样本标准差（n−1 分母），与 informationRatio 同源。
 * TE 是信息比率的分母：IR = 年化超额收益 / TE。TE 越小，相对基准越稳定。
 * @param {number[]} returns 策略收益序列（小数；自动剔除非有限）
 * @param {number[]} benchmark 基准收益序列（小数；按索引对齐）
 * @param {number} [periods=252] 年化期数
 * @returns {number} 年化跟踪误差；配对 <2 或超额 σ=0 → 0
 */
export function trackingError(returns, benchmark, periods = 252) {
  const pairs = alignedPairs(returns, benchmark);
  const n = pairs.length;
  if (n < 2) return 0;
  const active = pairs.map((p) => p.r - p.b);
  const mean = active.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(active.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
  return std * Math.sqrt(periods);
}

/**
 * 回归 beta = cov(r,b) / var(b)（样本协方差 / 样本方差，n−1 分母，按索引对齐）。
 * 衡量策略收益对市场基准的敏感度：β=1 同向同幅，>1 放大波动，<1 缩小，<0 反向。
 * 基准方差为 0（恒定）或配对 <2 时无法回归 → 0。
 * @param {number[]} returns 策略收益序列（小数；自动剔除非有限）
 * @param {number[]} benchmark 基准收益序列（小数；按索引对齐）
 * @returns {number} beta；基准无方差或配对不足 → 0
 */
export function beta(returns, benchmark) {
  const pairs = alignedPairs(returns, benchmark);
  const n = pairs.length;
  if (n < 2) return 0;
  let mr = 0,
    mb = 0;
  for (const p of pairs) {
    mr += p.r;
    mb += p.b;
  }
  mr /= n;
  mb /= n;
  let cov = 0,
    varB = 0;
  for (const p of pairs) {
    cov += (p.r - mr) * (p.b - mb);
    varB += (p.b - mb) ** 2;
  }
  varB /= n - 1;
  if (varB === 0) return 0;
  return cov / (n - 1) / varB;
}

/**
 * Jensen 年化 alpha = (mean_r − rf/periods) − beta·(mean_b − rf/periods)，再 ×periods 年化。
 * 衡量"剔除市场 β 贡献后"策略跑赢基准的超额（技能溢价），与 beta 配对使用：
 *   beta 描述市场暴露，alpha 描述超越暴露之外的收益。
 * 基准无方差时 beta=0 → alpha = (mean_r − rf/periods)×periods；配对 <2 → 0。
 * @param {number[]} returns 策略收益序列（小数；自动剔除非有限）
 * @param {number[]} benchmark 基准收益序列（小数；按索引对齐）
 * @param {number} [rf=0] 无风险利率（年化，同口径小数）
 * @param {number} [periods=252] 年化期数
 * @returns {number} 年化 alpha；配对不足 → 0
 */
export function alpha(returns, benchmark, rf = 0, periods = 252) {
  const pairs = alignedPairs(returns, benchmark);
  const n = pairs.length;
  if (n < 2) return 0;
  let mr = 0,
    mb = 0;
  for (const p of pairs) {
    mr += p.r;
    mb += p.b;
  }
  mr /= n;
  mb /= n;
  const b = beta(returns, benchmark);
  const excess = mr - rf / periods - b * (mb - rf / periods);
  return excess * periods;
}



