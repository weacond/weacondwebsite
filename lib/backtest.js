/**
 * 回测引擎 — Weacond Backtest Engine
 *
 * 核心模块：策略定义 → 交易模拟 → 绩效指标 → 蒙特卡洛
 * 支持滑点、佣金、分红假设，符合金融合规披露要求。
 *
 * 设计原则：
 * - 纯函数，无副作用，可单元测试
 * - 策略可插拔（Strategy 接口）
 * - 指标计算标准化（参考 quantlib）
 * - 蒙特卡洛重采样用于风险评估
 */

import { valueAtRisk, expectedShortfall, drawdownRecovery, maxLosingStreak, maxWinStreak, ulcerIndex, sharpeRatio, sortinoRatio, omegaRatio, tailRatio, sterlingRatio, drawdownDuration, downsideDeviation, probabilityOfRuin, informationRatio, captureRatios, trackingError, beta, alpha, treynorRatio, martinRatio, calmarRatio, payoffRatio as payoffFn, expectancyPerTrade, maxDrawdownStats } from "./risk.js";

/* ========== 数据结构 ========== */

/**
 * K线数据
 * @typedef {Object} Candle
 * @property {string} date - ISO date
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} volume
 */

/**
 * 交易记录
 * @typedef {Object} Trade
 * @property {number} entryIndex
 * @property {number} exitIndex
 * @property {string} entryDate
 * @property {string} exitDate
 * @property {number} entryPrice
 * @property {number} exitPrice
 * @property {"long"|"short"} side
 * @property {number} shares
 * @property {number} pnl - 含佣金后的净盈亏
 * @property {number} returnPct - 百分比收益
 * @property {number} holdDays
 */

/**
 * 绩效指标
 * @typedef {Object} PerformanceMetrics
 * @property {number} totalReturn
 * @property {number} cagr
 * @property {number} sharpe
 * @property {number} sortino
 * @property {number} martin
 * @property {number} treynor
 * @property {number} maxDrawdown
 * @property {number} winRate
 * @property {number} profitFactor
 * @property {number} avgWin
 * @property {number} avgLoss
 * @property {number} numTrades
 * @property {number} exposure
 * @property {number} calmar
 * @property {number} volatility
 * @property {number} omegaRatio
 * @property {number} tailRatio
 * @property {number} sterlingRatio
 * @property {number} maxDrawdownDuration
 * @property {number} downsideDeviation
 * @property {number} probRuin
 * @property {number} expectancy 每笔期望收益 = 胜率×平均盈利 − 败率×平均亏损
 * @property {number} avgDrawdown 平均回撤(%)
 * @property {number} longestUnderwater 最长水下期(K 线根数)
 * @property {number} underwaterPct 处于回撤中的时间占比(%)
 * @property {number} payoffRatio
 */

/* ========== 技术指标计算 ========== */

/**
 * 简单移动平均线
 * @param {number[]} data - 价格序列
 * @param {number} period - 周期
 * @returns {number[]} - MA 序列，前 period-1 个为 null
 */
export function sma(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j];
    }
    result.push(sum / period);
  }
  return result;
}

/**
 * 指数移动平均线 (EMA)
 */
export function ema(data, period) {
  const k = 2 / (period + 1);
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

/**
 * RSI - 相对强弱指标
 */
export function rsi(data, period = 14) {
  const result = new Array(data.length).fill(null);
  if (data.length <= period) return result;
  // 前 period 根为预热期（null）；首个有效值落在 index = period，之后逐根递推
  let gains = 0,
    losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

/**
 * ATR - 平均真实波幅
 */
export function atr(candles, period = 14) {
  const trs = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    return Math.max(
      c.high - c.low,
      Math.abs(c.high - candles[i - 1].close),
      Math.abs(c.low - candles[i - 1].close)
    );
  });
  return sma(trs, period);
}

/**
 * 布林带
 */
export function bollinger(candles, period = 20, stdDev = 2) {
  const closes = candles.map((c) => c.close);
  const mid = sma(closes, period);
  const upper = [],
    lower = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += (closes[j] - mid[i]) ** 2;
    }
    const sd = Math.sqrt(sum / period);
    upper.push(mid[i] + stdDev * sd);
    lower.push(mid[i] - stdDev * sd);
  }
  return { mid, upper, lower };
}

/**
 * MACD - 指数移动平均收敛/发散
 * macd = EMA(close, fast) − EMA(close, slow)
 * signal = EMA(macd, signalPeriod)
 * histogram = macd − signal
 * @param {Array} candles
 * @param {number} [fast=12] 快线周期
 * @param {number} [slow=26] 慢线周期
 * @param {number} [signalPeriod=9] 信号线周期
 * @returns {{macd:number[], signal:number[], histogram:number[]}}
 */
export function macd(candles, fast = 12, slow = 26, signalPeriod = 9) {
  const closes = candles.map((c) => c.close);
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const signalLine = ema(macdLine, signalPeriod);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * 随机指标 Stochastic
 * %K = 100 × (close − lowestLow) / (highestHigh − lowestLow) over kPeriod
 * %D = SMA(%K, dPeriod)
 * @returns {{k:number[], d:number[]}}
 */
export function stochastic(candles, kPeriod = 14, dPeriod = 3) {
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);
  const k = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) {
      k.push(null);
      continue;
    }
    let hh = -Infinity,
      ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (highs[j] > hh) hh = highs[j];
      if (lows[j] < ll) ll = lows[j];
    }
    k.push(hh === ll ? 50 : (100 * (closes[i] - ll)) / (hh - ll));
  }
  const d = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1 + dPeriod - 1) {
      d.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) sum += k[j];
    d.push(sum / dPeriod);
  }
  return { k, d };
}

/**
 * VWAP - 成交量加权平均价（累计）
 * @param {Array} candles - 需含 volume 字段
 * @returns {number[]} 每根 K 线到当前的累计 VWAP；累计成交量为 0 时为 null
 */
export function vwap(candles) {
  const out = [];
  let cumPV = 0,
    cumV = 0;
  for (const c of candles) {
    const v = c.volume != null ? c.volume : 0;
    cumPV += ((c.high + c.low + c.close) / 3) * v;
    cumV += v;
    out.push(cumV === 0 ? null : cumPV / cumV);
  }
  return out;
}

/**
 * 肯特纳通道 Keltner Channel：mid = EMA(close, period)，上下轨 = mid ± mult × ATR
 * @returns {{mid:number[], upper:number[], lower:number[]}}
 */
export function keltner(candles, period = 20, mult = 2) {
  const closes = candles.map((c) => c.close);
  const mid = ema(closes, period);
  const atrArr = atr(candles, period);
  const upper = [],
    lower = [];
  for (let i = 0; i < candles.length; i++) {
    const a = atrArr[i];
    if (a == null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    upper.push(mid[i] + mult * a);
    lower.push(mid[i] - mult * a);
  }
  return { mid, upper, lower };
}


/**
 * 唐奇安通道 Donchian Channel：上下轨为 period 内最高/最低价，mid 为其中值
 * @returns {{upper:number[], lower:number[], mid:number[]}}
 */
export function donchian(candles, period = 20) {
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const upper = [],
    lower = [],
    mid = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      mid.push(null);
      continue;
    }
    let hh = -Infinity,
      ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (highs[j] > hh) hh = highs[j];
      if (lows[j] < ll) ll = lows[j];
    }
    upper.push(hh);
    lower.push(ll);
    mid.push((hh + ll) / 2);
  }
  return { upper, lower, mid };
}

/**
 * 威廉指标 Williams %R：−100 × (highestHigh − close) / (highestHigh − lowestLow) over period
 * @returns {number[]} 值域 [−100, 0]，−20 以上超买、−80 以下超卖
 */
export function williams(candles, period = 14) {
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);
  const out = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let hh = -Infinity,
      ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (highs[j] > hh) hh = highs[j];
      if (lows[j] < ll) ll = lows[j];
    }
    out.push(hh === ll ? 0 : (-100 * (hh - closes[i])) / (hh - ll));
  }
  return out;
}

/**
 * 能量潮 OBV：收盘创新高累加成交量，创新低则扣减，持平不变
 * @param {Array} candles - 需含 volume 字段
 * @returns {number[]}
 */
export function obv(candles) {
  const out = [0];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i],
      prev = candles[i - 1];
    if (c.close > prev.close) out.push(out[i - 1] + (c.volume != null ? c.volume : 0));
    else if (c.close < prev.close) out.push(out[i - 1] - (c.volume != null ? c.volume : 0));
    else out.push(out[i - 1]);
  }
  return out;
}

/**
 * 阿隆指标 Aroon：衡量价格距最近 N 根高/低点的领先程度
 * Up = 100 × (N − 1 − 距最高价步数) / (N − 1)；Down 用最低价
 * @returns {{up:number[], down:number[]}} 值域 [0,100]，100 表示该方向领先；预热期为 null
 */
export function aroon(candles, period = 25) {
  const n = candles.length;
  const up = new Array(n).fill(null);
  const down = new Array(n).fill(null);
  if (n === 0) return { up, down };
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  for (let i = period - 1; i < n; i++) {
    let hiIdx = i,
      loIdx = i;
    for (let j = i - period + 1; j <= i; j++) {
      if (highs[j] > highs[hiIdx]) hiIdx = j;
      if (lows[j] < lows[loIdx]) loIdx = j;
    }
    up[i] = (100 * (period - 1 - (i - hiIdx))) / (period - 1);
    down[i] = (100 * (period - 1 - (i - loIdx))) / (period - 1);
  }
  return { up, down };
}

/**
 * 吊灯止损 Chandelier Exit：基于 ATR 的趋势跟踪止损/反转
 * 多头线 = N 根最高价 − mult×ATR（只上不下）；空头线 = N 根最低价 + mult×ATR（只下不上）
 * 收盘破多头线翻空、破空头线翻多（方向持久化，类 Supertrend）
 * @returns {{longExit:number[], shortExit:number[], direction:(("up"|"down"|null)[])}} 预热期（ATR 为 null）为 null
 */
export function chandelier(candles, period = 22, mult = 3) {
  const n = candles.length;
  const longExit = new Array(n).fill(null);
  const shortExit = new Array(n).fill(null);
  const direction = new Array(n).fill(null);
  if (n === 0) return { longExit, shortExit, direction };
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const atrArr = atr(candles, period);
  let prevLong = null,
    prevShort = null,
    prevDir = "up";
  for (let i = 0; i < n; i++) {
    const a = atrArr[i];
    if (a == null) continue;
    let hh = -Infinity,
      ll = Infinity;
    for (let j = Math.max(0, i - period + 1); j <= i; j++) {
      if (highs[j] > hh) hh = highs[j];
      if (lows[j] < ll) ll = lows[j];
    }
    const baseLong = hh - mult * a;
    const baseShort = ll + mult * a;
    const longLine = prevLong == null ? baseLong : Math.max(baseLong, prevLong);
    const shortLine = prevShort == null ? baseShort : Math.min(baseShort, prevShort);
    let dir;
    if (prevDir === "up") dir = candles[i].close <= longLine ? "down" : "up";
    else dir = candles[i].close >= shortLine ? "up" : "down";
    longExit[i] = longLine;
    shortExit[i] = shortLine;
    direction[i] = dir;
    prevLong = longLine;
    prevShort = shortLine;
    prevDir = dir;
  }
  return { longExit, shortExit, direction };
}

/**
 * 随机 RSI Stochastic RSI：对 RSI 序列再做随机指标
 * S-RSI = 100 × (RSI − 最低 RSI) / (最高 RSI − 最低 RSI) over period
 * @returns {number[]} 值域 [0,100]，预热期（RSI 未成形或窗口不足）为 null
 */
export function stochRsi(candles, period = 14) {
  const closes = candles.map((c) => c.close);
  const r = rsi(closes, period);
  const n = closes.length;
  const out = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (r[i] == null) continue;
    let hh = -Infinity,
      ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      const v = r[j];
      if (v == null) continue;
      if (v > hh) hh = v;
      if (v < ll) ll = v;
    }
    out[i] = hh === ll ? 50 : (100 * (r[i] - ll)) / (hh - ll);
  }
  return out;
}

/**
 * 平均趋向指数 ADX（Wilder）+ 方向指标 +DI/−DI
 * ADX 衡量趋势强度（与方向无关，值越高越强）；+DI 偏多、−DI 偏空
 * 平滑用 Wilder 指数递推（alpha = 1/period）；ADX 首个有效值在 index = 2×period−1
 * @returns {{adx:number[], plusDI:number[], minusDI:number[]}} 值域 [0,100]，预热期为 null
 */
export function adx(candles, period = 14) {
  const n = candles.length;
  const adxArr = new Array(n).fill(null);
  const plusDI = new Array(n).fill(null);
  const minusDI = new Array(n).fill(null);
  if (n <= 2 * period) return { adx: adxArr, plusDI, minusDI };
  // 逐根 TR、+DM、−DM
  const tr = new Array(n).fill(0);
  const pDM = new Array(n).fill(0);
  const mDM = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const c = candles[i],
      p = candles[i - 1];
    tr[i] = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    const up = c.high - p.high;
    const down = p.low - c.low;
    pDM[i] = up > down && up > 0 ? up : 0;
    mDM[i] = down > up && down > 0 ? down : 0;
  }
  // 首个 Wilder 平滑 = 前 period 根之和（落在 index = period）
  let sTR = 0,
    sP = 0,
    sM = 0;
  for (let i = 1; i <= period; i++) {
    sTR += tr[i];
    sP += pDM[i];
    sM += mDM[i];
  }
  const dx = new Array(n).fill(null);
  for (let i = period; i < n; i++) {
    if (i > period) {
      sTR = sTR - sTR / period + tr[i];
      sP = sP - sP / period + pDM[i];
      sM = sM - sM / period + mDM[i];
    }
    const pdi = sTR === 0 ? 0 : (100 * sP) / sTR;
    const mdi = sM === 0 ? 0 : (100 * sM) / sTR;
    plusDI[i] = pdi;
    minusDI[i] = mdi;
    dx[i] = pdi + mdi === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / (pdi + mdi);
  }
  // ADX = 前 period 个 DX 的 Wilder 平滑，首个有效值在 index = 2×period−1
  let adxAcc = 0;
  for (let i = period; i < 2 * period; i++) adxAcc += dx[i];
  let prevADX = adxAcc / period;
  adxArr[2 * period - 1] = prevADX;
  for (let i = 2 * period; i < n; i++) {
    prevADX = (prevADX * (period - 1) + dx[i]) / period;
    adxArr[i] = prevADX;
  }
  return { adx: adxArr, plusDI, minusDI };
}

/**
 * 超级趋势 Supertrend（基于 ATR 的趋势跟踪）
 * @param {number} [period=10] ATR 周期
 * @param {number} [mult=3] ATR 乘数
 * @returns {{supertrend:number[], direction:(("up"|"down"|null)[])}}
 *   预热期（ATR 为 null）为 null；supertrend 取方向对应的下轨/上轨
 */
export function supertrend(candles, period = 10, mult = 3) {
  const n = candles.length;
  const supertrend = new Array(n).fill(null);
  const direction = new Array(n).fill(null);
  if (n === 0) return { supertrend, direction };
  const atrArr = atr(candles, period);
  let upper = null,
    lower = null,
    prevST = null,
    prevDir = "up";
  for (let i = 0; i < n; i++) {
    const a = atrArr[i];
    if (a == null) continue;
    const c = candles[i];
    const hl2 = (c.high + c.low) / 2;
    const basicUpper = hl2 + mult * a;
    const basicLower = hl2 - mult * a;
    let fUpper, fLower;
    if (upper == null) {
      fUpper = basicUpper;
      fLower = basicLower;
    } else {
      fUpper = basicUpper < upper || candles[i - 1].close > upper ? basicUpper : upper;
      fLower = basicLower > lower || candles[i - 1].close < lower ? basicLower : lower;
    }
    upper = fUpper;
    lower = fLower;
    let dir;
    if (prevST == null) dir = c.close <= upper ? "down" : "up";
    else if (c.close > prevST) dir = "up";
    else if (c.close < prevST) dir = "down";
    else dir = prevDir;
    prevDir = dir;
    prevST = dir === "up" ? lower : upper;
    supertrend[i] = prevST;
    direction[i] = dir;
  }
  return { supertrend, direction };
}

/**
 * 抛物线 SAR（Welles Wilder）：加速/减速的趋势反转指标
 * 多头时 SAR 随加速因子（AF）逐步上移并钳制在前 2 根低点之下；
 * 价格跌破 SAR 即翻空，反之翻多；翻转时 SAR 跳到对侧极值、AF 归零重起。
 * @param {number} [step=0.02] AF 每根增量
 * @param {number} [max=0.2] AF 上限
 * @param {number} [start=0.02] 初始 AF
 * @returns {{sar:number[], direction:(("up"|"down"|"null"))[]}} 全长度，无预热 null
 */
export function parabolicSAR(candles, { step = 0.02, max = 0.2, start = 0.02 } = {}) {
  const n = candles.length;
  const sar = new Array(n).fill(null);
  const direction = new Array(n).fill(null);
  if (n === 0) return { sar, direction };
  // 初始朝上：SAR 取首根低点，AF 取 start，极值 EP 取首根高点
  let up = true;
  let sarValue = candles[0].low;
  let ep = candles[0].high;
  let af = start;
  sar[0] = sarValue;
  direction[0] = "up";
  for (let i = 1; i < n; i++) {
    const c = candles[i];
    let newSar = sarValue + af * (ep - sarValue);
    // 钳制：SAR 不得越过前 2 根的低点（多头）/ 高点（空头）
    if (up) {
      const clampLow = Math.min(candles[i - 1].low, i - 2 >= 0 ? candles[i - 2].low : Infinity);
      newSar = Math.min(newSar, clampLow);
    } else {
      const clampHigh = Math.max(candles[i - 1].high, i - 2 >= 0 ? candles[i - 2].high : -Infinity);
      newSar = Math.max(newSar, clampHigh);
    }
    // 反转检测：价格穿越 SAR 即翻转，新 SAR = 旧极值 EP，AF 归零重起
    if (up) {
      if (c.low < newSar) {
        up = false;
        newSar = ep;
        ep = c.low;
        af = start;
      } else if (c.high > ep) {
        ep = c.high;
        af = Math.min(af + step, max);
      }
    } else {
      if (c.high > newSar) {
        up = true;
        newSar = ep;
        ep = c.high;
        af = start;
      } else if (c.low < ep) {
        ep = c.low;
        af = Math.min(af + step, max);
      }
    }
    sar[i] = newSar;
    direction[i] = up ? "up" : "down";
    sarValue = newSar;
  }
  return { sar, direction };
}

/**
 * 商品通道指标 CCI：衡量价格偏离其均值通道多少个「平均绝对偏差」
 * CCI = (TP − SMA(TP)) / (0.015 × MDEV(TP))，其中 TP = (H+L+C)/3
 * @returns {number[]} 全长度，前 period 根为 null；强趋势下绝对值 > 100
 */
export function cci(candles, period = 20) {
  const n = candles.length;
  const out = new Array(n).fill(null);
  if (n === 0) return out;
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  for (let i = period - 1; i < n; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += tp[j];
    const mean = sum / period;
    let mad = 0;
    for (let j = i - period + 1; j <= i; j++) mad += Math.abs(tp[j] - mean);
    mad /= period;
    out[i] = mad === 0 ? 0 : (tp[i] - mean) / (0.015 * mad);
  }
  return out;
}

/**
 * 变动率 ROC（动量）：当前价相对 period 根前的百分比变动
 * ROC = (C − C[−period]) / C[−period] × 100
 * @returns {number[]} 全长度，前 period 根为 null；上涨为正、下跌为负
 */
export function roc(candles, period = 12) {
  const n = candles.length;
  const out = new Array(n).fill(null);
  if (n === 0) return out;
  for (let i = period; i < n; i++) {
    const base = candles[i - period].close;
    out[i] = base === 0 ? 0 : ((candles[i].close - base) / base) * 100;
  }
  return out;
}
/**
 * 资金流量指标 MFI (Money Flow Index)：成交量加权的 RSI
 * 典型价 TP=(high+low+close)/3，按 TP 升降把 TP×volume 归入正/负资金流，
 * MFR=正流/负流，MFI=100 − 100/(1+MFR)；值域 [0,100]，>80 超买、<20 超卖
 * @returns {number[]} 全长度，前 period 根为 null
 */
export function mfi(candles, period = 14) {
  const n = candles.length;
  const out = new Array(n).fill(null);
  if (n <= period) return out;
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  for (let i = period; i < n; i++) {
    let pos = 0,
      neg = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const flow = tp[j] * candles[j].volume;
      if (tp[j] > tp[j - 1]) pos += flow;
      else if (tp[j] < tp[j - 1]) neg += flow;
    }
    const mfr = neg === 0 ? (pos > 0 ? Infinity : 1) : pos / neg;
    out[i] = 100 - 100 / (1 + mfr);
  }
  return out;
}

/**
 * 凯金资金流量 CMF (Chaikin Money Flow)：价格 + 成交量结合的资金流指标
 * 资金流量 MFV：TP 上升记 +volume、下降记 −volume（相等记 0）；
 * CMF = (Σ正流 − Σ负流) / Σ总量，值域 [−1, 1]，>0 资金流入、<0 资金流出，
 * 常配合 +0.05 / −0.05 阈值判断资金加速/衰竭
 * @param {Candle[]} candles
 * @param {number} [period=20]
 * @returns {number[]} 全长度，前 period 根为 null
 */
export function cmf(candles, period = 20) {
  const n = candles.length;
  const out = new Array(n).fill(null);
  if (n <= period) return out;
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  for (let i = period; i < n; i++) {
    let posVol = 0,
      negVol = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) posVol += candles[j].volume;
      else if (tp[j] < tp[j - 1]) negVol += candles[j].volume;
    }
    const total = posVol + negVol;
    out[i] = total === 0 ? 0 : (posVol - negVol) / total;
  }
  return out;
}




/**
/* ========== 策略接口 ==========
 * 每个策略接收 candles 数组和参数，返回信号数组
 * 信号：{ action: "buy"|"sell"|"hold", reason, confidence }
 */

/**
 * 策略注册表
 */
export const STRATEGY_REGISTRY = {};

function registerStrategy(name, def) {
  STRATEGY_REGISTRY[name] = def;
}

/**
 * 双均线交叉策略
 * @param {Candle[]} candles
 * @param {{ fast: number, slow: number }} params
 * @returns {Array<{ action: string, reason: string, confidence: number, index: number }>}
 */
function maCross(candles, { fast = 10, slow = 30 } = {}) {
  const closes = candles.map((c) => c.close);
  const fastMA = sma(closes, fast);
  const slowMA = sma(closes, slow);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (fastMA[i] === null || slowMA[i] === null) continue;
    const prevDiff = fastMA[i - 1] - slowMA[i - 1];
    const curDiff = fastMA[i] - slowMA[i];
    if (prevDiff <= 0 && curDiff > 0) {
      signals.push({
        action: "buy",
        reason: `${fast}MA 上穿 ${slow}MA`,
        confidence: Math.min(1, curDiff / candles[i].close),
        index: i,
      });
    } else if (prevDiff >= 0 && curDiff < 0) {
      signals.push({
        action: "sell",
        reason: `${fast}MA 下穿 ${slow}MA`,
        confidence: Math.min(1, -curDiff / candles[i].close),
        index: i,
      });
    }
  }
  return signals;
}
registerStrategy("ma_cross", {
  name: "双均线交叉",
  nameEn: "MA Crossover",
  category: "trend",
  description: "快慢均线交叉产生买卖信号，适合趋势市场",
  descriptionEn: "Fast/slow MA crossover for trending markets",
  params: [
    { key: "fast", label: "快线周期", default: 10, min: 3, max: 60, step: 1 },
    { key: "slow", label: "慢线周期", default: 30, min: 10, max: 200, step: 1 },
  ],
  run: maCross,
});

/**
 * RSI 均值回归策略
 */
function rsiStrategy(candles, { period = 14, oversold = 30, overbought = 70 } = {}) {
  const closes = candles.map((c) => c.close);
  const rsiArr = rsi(closes, period);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (rsiArr[i] === null || rsiArr[i - 1] === null) continue;
    if (rsiArr[i - 1] < oversold && rsiArr[i] >= oversold) {
      signals.push({ action: "buy", reason: `RSI 从超卖回升 (${rsiArr[i].toFixed(1)})`, confidence: 0.7, index: i });
    } else if (rsiArr[i - 1] > overbought && rsiArr[i] <= overbought) {
      signals.push({ action: "sell", reason: `RSI 从超买回落 (${rsiArr[i].toFixed(1)})`, confidence: 0.7, index: i });
    }
  }
  return signals;
}
registerStrategy("rsi", {
  name: "RSI 均值回归",
  nameEn: "RSI Mean Reversion",
  category: "mean_reversion",
  description: "RSI 超卖买入/超买卖出，适合震荡市场",
  descriptionEn: "RSI oversold/overbought for ranging markets",
  params: [
    { key: "period", label: "RSI 周期", default: 14, min: 5, max: 30, step: 1 },
    { key: "oversold", label: "超卖线", default: 30, min: 10, max: 40, step: 5 },
    { key: "overbought", label: "超买线", default: 70, min: 60, max: 90, step: 5 },
  ],
  run: rsiStrategy,
});

/**
 * 突破策略 (Donchian Channel)
 */
function breakout(candles, { period = 20, atrPeriod = 14, atrMult = 1.5 } = {}) {
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const atrArr = atr(candles, atrPeriod);
  const signals = [];
  for (let i = period; i < candles.length; i++) {
    let chHigh = -Infinity, chLow = Infinity;
    for (let j = i - period; j < i; j++) {
      chHigh = Math.max(chHigh, highs[j]);
      chLow = Math.min(chLow, lows[j]);
    }
    if (candles[i].close > chHigh) {
      signals.push({ action: "buy", reason: "突破 N 日高点", confidence: 0.6, index: i });
    } else if (candles[i].close < chLow) {
      signals.push({ action: "sell", reason: "跌破 N 日低点", confidence: 0.6, index: i });
    }
  }
  return signals;
}
registerStrategy("breakout", {
  name: "通道突破",
  nameEn: "Donchian Breakout",
  category: "breakout",
  description: "突破 N 日高/低点，适合波动放大行情",
  descriptionEn: "Donchian channel breakout for volatility expansion",
  params: [
    { key: "period", label: "通道周期", default: 20, min: 10, max: 100, step: 1 },
  ],
  run: breakout,
});

/**
 * 布林带均值回归
 */
function bollingerReversion(candles, { period = 20, stdDev = 2 } = {}) {
  const { lower, upper } = bollinger(candles, period, stdDev);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (lower[i] === null) continue;
    if (candles[i].close <= lower[i] && candles[i - 1].close > lower[i - 1]) {
      signals.push({ action: "buy", reason: "触及下轨反弹", confidence: 0.65, index: i });
    } else if (candles[i].close >= upper[i] && candles[i - 1].close < upper[i - 1]) {
      signals.push({ action: "sell", reason: "触及上轨回落", confidence: 0.65, index: i });
    }
  }
  return signals;
}
registerStrategy("bollinger", {
  name: "布林带回归",
  nameEn: "Bollinger Reversion",
  category: "mean_reversion",
  description: "价格触及布林带极值时反向操作",
  descriptionEn: "Mean reversion at Bollinger band extremes",
  params: [
    { key: "period", label: "周期", default: 20, min: 10, max: 50, step: 1 },
    { key: "stdDev", label: "标准差倍数", default: 2, min: 1, max: 4, step: 0.5 },
  ],
  run: bollingerReversion,
});

/**
 * 超级趋势跟随策略：Supertrend 方向翻多买入、翻空卖出（基于本文件 supertrend 原语）
 */
function supertrendStrategy(candles, { period = 10, mult = 3 } = {}) {
  const { direction } = supertrend(candles, period, mult);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (direction[i] === null || direction[i - 1] === null) continue;
    if (direction[i - 1] === "down" && direction[i] === "up") {
      signals.push({ action: "buy", reason: `超级趋势翻多 (${mult}×ATR)`, confidence: 0.6, index: i });
    } else if (direction[i - 1] === "up" && direction[i] === "down") {
      signals.push({ action: "sell", reason: `超级趋势翻空`, confidence: 0.6, index: i });
    }
  }
  return signals;
}
registerStrategy("supertrend", {
  name: "超级趋势跟随",
  nameEn: "Supertrend",
  category: "trend",
  description: "基于 ATR 的 Supertrend 翻转信号，适合趋势行情",
  descriptionEn: "ATR-based Supertrend flip for trending markets",
  params: [
    { key: "period", label: "ATR 周期", default: 10, min: 5, max: 30, step: 1 },
    { key: "mult", label: "ATR 乘数", default: 3, min: 1, max: 5, step: 0.5 },
  ],
  run: supertrendStrategy,
});

/**
 * 吊灯止损跟随策略：Chandelier 方向翻多买入、翻空卖出（基于本文件 chandelier 原语）
 */
function chandelierStrategy(candles, { period = 22, mult = 3 } = {}) {
  const { direction } = chandelier(candles, period, mult);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (direction[i] === null || direction[i - 1] === null) continue;
    if (direction[i - 1] === "down" && direction[i] === "up") {
      signals.push({ action: "buy", reason: `吊灯止损翻多 (${mult}×ATR)`, confidence: 0.6, index: i });
    } else if (direction[i - 1] === "up" && direction[i] === "down") {
      signals.push({ action: "sell", reason: `吊灯止损翻空`, confidence: 0.6, index: i });
    }
  }
  return signals;
}
registerStrategy("chandelier", {
  name: "吊灯止损跟随",
  nameEn: "Chandelier Exit",
  category: "trend",
  description: "基于 ATR 吊灯线的翻转信号，趋势跟踪与保护性止损",
  descriptionEn: "ATR Chandelier exit flip for trend following / protective stop",
  params: [
    { key: "period", label: "ATR 周期", default: 22, min: 10, max: 40, step: 1 },
    { key: "mult", label: "ATR 乘数", default: 3, min: 1, max: 5, step: 0.5 },
  ],
  run: chandelierStrategy,
});

/**
 * 抛物线 SAR 跟随策略：SAR 方向翻多买入、翻空卖出（基于本文件 parabolicSAR 原语）
 */
function parabolicSarStrategy(candles, { step = 0.02, max = 0.2, start = 0.02 } = {}) {
  const { direction } = parabolicSAR(candles, { step, max, start });
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (direction[i] === null || direction[i - 1] === null) continue;
    if (direction[i - 1] === "down" && direction[i] === "up") {
      signals.push({ action: "buy", reason: `SAR 翻多 (AF ${step}→${max})`, confidence: 0.6, index: i });
    } else if (direction[i - 1] === "up" && direction[i] === "down") {
      signals.push({ action: "sell", reason: `SAR 翻空`, confidence: 0.6, index: i });
    }
  }
  return signals;
}
registerStrategy("parabolic_sar", {
  name: "抛物线 SAR 跟随",
  nameEn: "Parabolic SAR",
  category: "trend",
  description: "Parabolic SAR 翻转信号，加速追踪趋势与反转",
  descriptionEn: "Parabolic SAR flip for accelerating trend following",
  params: [
    { key: "step", label: "AF 增量", default: 0.02, min: 0.01, max: 0.05, step: 0.01 },
    { key: "max", label: "AF 上限", default: 0.2, min: 0.1, max: 0.4, step: 0.05 },
    { key: "start", label: "初始 AF", default: 0.02, min: 0.005, max: 0.05, step: 0.005 },
  ],
  run: parabolicSarStrategy,
});

/**
 * MACD 交叉策略：柱状图金叉买入、死叉卖出（基于本文件 macd 原语）
 */
function macdCrossStrategy(candles, { fast = 12, slow = 26, signalPeriod = 9 } = {}) {
  const { histogram } = macd(candles, fast, slow, signalPeriod);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (histogram[i] === null || histogram[i - 1] === null) continue;
    const prev = histogram[i - 1];
    const cur = histogram[i];
    if (prev <= 0 && cur > 0) {
      signals.push({ action: "buy", reason: `MACD 金叉`, confidence: Math.min(1, Math.abs(cur) / candles[i].close + 0.3), index: i });
    } else if (prev >= 0 && cur < 0) {
      signals.push({ action: "sell", reason: `MACD 死叉`, confidence: Math.min(1, Math.abs(cur) / candles[i].close + 0.3), index: i });
    }
  }
  return signals;
}
registerStrategy("macd_cross", {
  name: "MACD 交叉",
  nameEn: "MACD Crossover",
  category: "trend",
  description: "MACD 柱状图金叉/死叉产生买卖信号，趋势跟踪",
  descriptionEn: "MACD histogram golden/death cross for trend trading",
  params: [
    { key: "fast", label: "快线周期", default: 12, min: 5, max: 30, step: 1 },
    { key: "slow", label: "慢线周期", default: 26, min: 15, max: 50, step: 1 },
    { key: "signalPeriod", label: "信号线周期", default: 9, min: 3, max: 20, step: 1 },
  ],
  run: macdCrossStrategy,
});

/**
 * 多指标方向共识（confluence）：聚合 RSI / MACD / Stoch %K / Supertrend 的看多/看空投票
 * 统一采用「趋势/动量」口径（而非均值回归），回答「市场整体偏多还是偏空」：
 *   RSI>50 看多、MACD 柱>0 看多、Stoch %K>50 看多、Supertrend up 看多（反之看空）
 * @param {Candle[]} candles
 * @param {object} [opts] 各指标周期（可选；缺省用标准值）
 * @returns {{score:number, direction:("bull"|"bear"|"neutral"), agreement:number, votes:{rsi:number,macd:number,stoch:number,supertrend:number}, adx:(number|null), confidence:number}}
 *   score ∈ [−1,1] = (看多票 − 看空票) / 指标数；agreement = |score|（共识强度）
 *   数据不足（< 26 根）时返回 score=0、direction="neutral"、各票为 0
 */
export function signalConsensus(candles, opts = {}) {
  const votes = { rsi: 0, macd: 0, stoch: 0, supertrend: 0 };
  const n = candles ? candles.length : 0;
  if (!n || n < 26) return { score: 0, direction: "neutral", agreement: 0, votes, adx: null, confidence: 0 };
  const closes = candles.map((c) => c.close);
  const rsiArr = rsi(closes, opts.rsiPeriod || 14);
  const m = macd(closes, opts.fast || 12, opts.slow || 26, opts.signalPeriod || 9);
  const s = stochastic(candles, opts.kPeriod || 14, opts.dPeriod || 3);
  const st = supertrend(candles, opts.stPeriod || 10, opts.stMult || 3);
  const adxArr = adx(candles, opts.adxPeriod || 14).adx;
  const last = n - 1;
  const r = rsiArr[last];
  const hist = m.histogram[last];
  const k = s.k[last];
  const dir = st.direction[last];
  // 统一动量口径：高于 50/零轴/翻多 → +1（看多），反之 → −1（看空）
  if (r != null) votes.rsi = r > 50 ? 1 : r < 50 ? -1 : 0;
  if (hist != null) votes.macd = hist > 0 ? 1 : hist < 0 ? -1 : 0;
  if (k != null) votes.stoch = k > 50 ? 1 : k < 50 ? -1 : 0;
  votes.supertrend = dir === "up" ? 1 : dir === "down" ? -1 : 0;
  const sum = votes.rsi + votes.macd + votes.stoch + votes.supertrend;
  const score = sum / 4;
  const direction = score > 0 ? "bull" : score < 0 ? "bear" : "neutral";
  const agreement = Math.abs(score);
  const adxVal = adxArr[last];
  // 趋势强度调节置信度：ADX 越高越信任共识；震荡(ADX→0)打 0.5 折；预热(ADX=null)不折
  const adxFactor = adxVal == null ? 1 : 0.5 + 0.5 * Math.min(adxVal / 50, 1);
  return { score, direction, agreement, votes, adx: adxVal, confidence: agreement * adxFactor };
}

/**
 * 多指标共识序列：四个指标序列各计算一次（O(n)），逐根合并投票
 * @param {Candle[]} candles
 * @param {object} [opts] 各指标周期（可选）
 * @returns {{score:number[], direction:("bull"|"bear"|"neutral")[], agreement:number[], adx:(number|null)[], confidence:number[]}}
 *   数据不足（< 26 根）时各数组长度匹配但全为 0 / "neutral"
 */
export function signalConsensusSeries(candles, opts = {}) {
  const n = candles ? candles.length : 0;
  const score = new Array(n).fill(0);
  const direction = new Array(n).fill("neutral");
  const agreement = new Array(n).fill(0);
  const confidence = new Array(n).fill(0);
  let adxArr = new Array(n).fill(null);
  if (!n || n < 26) return { score, direction, agreement, adx: adxArr, confidence };
  const closes = candles.map((c) => c.close);
  const rsiArr = rsi(closes, opts.rsiPeriod || 14);
  const m = macd(closes, opts.fast || 12, opts.slow || 26, opts.signalPeriod || 9);
  const s = stochastic(candles, opts.kPeriod || 14, opts.dPeriod || 3);
  const st = supertrend(candles, opts.stPeriod || 10, opts.stMult || 3);
  adxArr = adx(candles, opts.adxPeriod || 14).adx;
  for (let i = 0; i < n; i++) {
    const r = rsiArr[i];
    const hist = m.histogram[i];
    const k = s.k[i];
    const dir = st.direction[i];
    // 与单点 signalConsensus 一致：null 计 0 票（不跳过整根），分母恒为 4
    let vote = 0;
    vote += r != null && r > 50 ? 1 : r != null && r < 50 ? -1 : 0;
    vote += hist != null && hist > 0 ? 1 : hist != null && hist < 0 ? -1 : 0;
    vote += k != null && k > 50 ? 1 : k != null && k < 50 ? -1 : 0;
    vote += dir === "up" ? 1 : dir === "down" ? -1 : 0;
    const sc = vote / 4;
    score[i] = sc;
    direction[i] = sc > 0 ? "bull" : sc < 0 ? "bear" : "neutral";
    const ag = Math.abs(sc);
    agreement[i] = ag;
    const ax = adxArr[i];
    confidence[i] = ag * (ax == null ? 1 : 0.5 + 0.5 * Math.min(ax / 50, 1));
  }
  return { score, direction, agreement, adx: adxArr, confidence };
}

/**
 * 多指标共识策略：方向由空翻多买入、由多翻空卖出（基于 signalConsensusSeries 逐根）
 */
function consensusStrategy(candles, opts = {}) {
  const { direction } = signalConsensusSeries(candles, opts);
  const signals = [];
  let prevDir = "neutral";
  for (let i = 0; i < direction.length; i++) {
    const d = direction[i];
    if (d === "neutral") continue;
    if (prevDir === "bear" && d === "bull") {
      signals.push({ action: "buy", reason: "多指标共识转多", confidence: 0.7, index: i });
    } else if (prevDir === "bull" && d === "bear") {
      signals.push({ action: "sell", reason: "多指标共识转空", confidence: 0.7, index: i });
    }
    prevDir = d;
  }
  return signals;
}
registerStrategy("consensus", {
  name: "多指标共识",
  nameEn: "Signal Consensus",
  category: "trend",
  description: "RSI/MACD/Stoch/Supertrend 共识方向翻转时交易，多因子趋势",
  descriptionEn: "Trade on the multi-indicator consensus flip (RSI/MACD/Stoch/Supertrend)",
  params: [
    { key: "rsiPeriod", label: "RSI 周期", default: 14, min: 5, max: 30, step: 1 },
    { key: "stPeriod", label: "Supertrend 周期", default: 10, min: 5, max: 30, step: 1 },
    { key: "stMult", label: "ATR 乘数", default: 3, min: 1, max: 5, step: 0.5 },
  ],
  run: consensusStrategy,
});

/**
 * 资金流量指数（MFI）均值回归策略
 * MFI 从超卖回升 → 买入；MFI 从超买回落 → 卖出（类似 RSI，但成交量加权）
 */
function mfiStrategy(candles, { period = 14, oversold = 20, overbought = 80 } = {}) {
  const mfiArr = mfi(candles, period);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (mfiArr[i] === null || mfiArr[i - 1] === null) continue;
    if (mfiArr[i - 1] < oversold && mfiArr[i] >= oversold) {
      signals.push({ action: "buy", reason: `MFI 从超卖回升 (${mfiArr[i].toFixed(1)})`, confidence: 0.7, index: i });
    } else if (mfiArr[i - 1] > overbought && mfiArr[i] <= overbought) {
      signals.push({ action: "sell", reason: `MFI 从超买回落 (${mfiArr[i].toFixed(1)})`, confidence: 0.7, index: i });
    }
  }
  return signals;
}
registerStrategy("mfi", {
  name: "资金流量均值回归",
  nameEn: "MFI Mean Reversion",
  category: "mean_reversion",
  description: "MFI 超卖买入/超买卖出（成交量加权 RSI），适合震荡市场",
  descriptionEn: "MFI oversold/overbought mean reversion (volume-weighted RSI)",
  params: [
    { key: "period", label: "MFI 周期", default: 14, min: 5, max: 30, step: 1 },
    { key: "oversold", label: "超卖线", default: 20, min: 10, max: 40, step: 5 },
    { key: "overbought", label: "超买线", default: 80, min: 60, max: 90, step: 5 },
  ],
  run: mfiStrategy,
});

/**
 * CCI 均值回归策略：CCI 从超卖(-100)回升买入、从超买(+100)回落卖出（基于本文件 cci 原语）
 * @param {Array} candles
 * @param {Object} [params] { period=20, oversold=-100, overbought=100 }
 * @returns {Array}
 */
function cciStrategy(candles, { period = 20, oversold = -100, overbought = 100 } = {}) {
  const arr = cci(candles, period);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (arr[i] === null || arr[i - 1] === null) continue;
    if (arr[i - 1] < oversold && arr[i] >= oversold) {
      signals.push({ action: "buy", reason: `CCI 从超卖回升 (${arr[i].toFixed(1)})`, confidence: 0.7, index: i });
    } else if (arr[i - 1] > overbought && arr[i] <= overbought) {
      signals.push({ action: "sell", reason: `CCI 从超买回落 (${arr[i].toFixed(1)})`, confidence: 0.7, index: i });
    }
  }
  return signals;
}
registerStrategy("cci", {
  name: "CCI 均值回归",
  nameEn: "CCI Mean Reversion",
  category: "mean_reversion",
  description: "CCI 超卖买入/超买卖出（顺势与超调），适合震荡市场",
  descriptionEn: "CCI oversold/overbought mean reversion for ranging markets",
  params: [
    { key: "period", label: "CCI 周期", default: 20, min: 5, max: 50, step: 1 },
    { key: "oversold", label: "超卖线", default: -100, min: -200, max: -50, step: 50 },
    { key: "overbought", label: "超买线", default: 100, min: 50, max: 200, step: 50 },
  ],
  run: cciStrategy,
});

/**
 * ROC 动量策略：变动率上穿 0 买入、下穿 0 卖出（基于本文件 roc 原语）
 * @param {Array} candles
 * @param {Object} [params] { period=12 }
 * @returns {Array}
 */
function rocStrategy(candles, { period = 12 } = {}) {
  const arr = roc(candles, period);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (arr[i] === null || arr[i - 1] === null) continue;
    const prev = arr[i - 1],
      cur = arr[i];
    if (prev <= 0 && cur > 0) {
      signals.push({ action: "buy", reason: `ROC 上穿 0 (+${cur.toFixed(1)}%)`, confidence: 0.6, index: i });
    } else if (prev >= 0 && cur < 0) {
      signals.push({ action: "sell", reason: `ROC 下穿 0 (${cur.toFixed(1)}%)`, confidence: 0.6, index: i });
    }
  }
  return signals;
}
registerStrategy("roc", {
  name: "ROC 动量",
  nameEn: "ROC Momentum",
  category: "momentum",
  description: "变动率上/下穿零轴，捕捉动量反转，适合趋势行情",
  descriptionEn: "Rate-of-Change crossing zero for momentum shifts",
  params: [{ key: "period", label: "ROC 周期", default: 12, min: 5, max: 50, step: 1 }],
  run: rocStrategy,
});

/**
 * CMF 资金流策略：CMF 上穿 +阈值 视为资金加速流入（买）、下穿 −阈值 视为资金加速流出（卖）
 * （基于本文件 cmf 原语，捕捉成交量驱动的资金流拐点）
 * @param {Array} candles
 * @param {Object} [params] { period=20, threshold=0.05 }
 * @returns {Array}
 */
function cmfStrategy(candles, { period = 20, threshold = 0.05 } = {}) {
  const arr = cmf(candles, period);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (arr[i] === null || arr[i - 1] === null) continue;
    const prev = arr[i - 1],
      cur = arr[i];
    if (prev < threshold && cur >= threshold) {
      signals.push({ action: "buy", reason: `CMF 上穿 +${threshold} 资金流入加速 (${cur.toFixed(3)})`, confidence: 0.6, index: i });
    } else if (prev > -threshold && cur <= -threshold) {
      signals.push({ action: "sell", reason: `CMF 下穿 -${threshold} 资金流出加速 (${cur.toFixed(3)})`, confidence: 0.6, index: i });
    }
  }
  return signals;
}
registerStrategy("cmf", {
  name: "CMF 资金流",
  nameEn: "CMF Money Flow",
  category: "momentum",
  description: "Chaikin 资金流上/下穿阈值，捕捉资金加速流入/流出，适合趋势与突破",
  descriptionEn: "Chaikin Money Flow crossing ±threshold to catch accelerating money flow",
  params: [
    { key: "period", label: "CMF 周期", default: 20, min: 5, max: 50, step: 1 },
    { key: "threshold", label: "触发阈值", default: 0.05, min: 0, max: 0.5, step: 0.05 },
  ],
  run: cmfStrategy,
});

/**
 * 威廉指标均值回归策略：Williams %R 从超卖(-80)回升买入、从超买(-20)回落卖出
 * 值域 [-100,0]，-100 为超卖、0 为超买（基于本文件 williams 原语）
 * @param {Array} candles
 * @param {Object} [params] { period=14, oversold=-80, overbought=-20 }
 * @returns {Array}
 */
function williamsStrategy(candles, { period = 14, oversold = -80, overbought = -20 } = {}) {
  const arr = williams(candles, period);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (arr[i] === null || arr[i - 1] === null) continue;
    if (arr[i - 1] < oversold && arr[i] >= oversold) {
      signals.push({ action: "buy", reason: `%R 从超卖回升 (${arr[i].toFixed(1)})`, confidence: 0.7, index: i });
    } else if (arr[i - 1] > overbought && arr[i] <= overbought) {
      signals.push({ action: "sell", reason: `%R 从超买回落 (${arr[i].toFixed(1)})`, confidence: 0.7, index: i });
    }
  }
  return signals;
}
registerStrategy("williams", {
  name: "威廉指标回归",
  nameEn: "Williams %R Reversion",
  category: "mean_reversion",
  description: "Williams %R 超卖买入/超买卖出（震荡市反转）",
  descriptionEn: "Williams %R oversold/overbought mean reversion",
  params: [
    { key: "period", label: "%R 周期", default: 14, min: 5, max: 30, step: 1 },
    { key: "oversold", label: "超卖线", default: -80, min: -95, max: -50, step: 5 },
    { key: "overbought", label: "超买线", default: -20, min: -50, max: -5, step: 5 },
  ],
  run: williamsStrategy,
});


/**
 * Aroon 趋势策略：Aroon Up 上穿 Aroon Down 买入、下穿卖出（基于本文件 aroon 原语）
 * @param {Array} candles
 * @param {Object} [params] { period=25 }
 * @returns {Array}
 */
function aroonStrategy(candles, { period = 25 } = {}) {
  const { up, down } = aroon(candles, period);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (up[i] === null || down[i] === null || up[i - 1] === null || down[i - 1] === null) continue;
    if (up[i - 1] <= down[i - 1] && up[i] > down[i]) {
      signals.push({ action: "buy", reason: `Aroon Up 上穿 Down (${up[i].toFixed(0)})`, confidence: 0.6, index: i });
    } else if (up[i - 1] >= down[i - 1] && up[i] < down[i]) {
      signals.push({ action: "sell", reason: `Aroon Up 下穿 Down`, confidence: 0.6, index: i });
    }
  }
  return signals;
}
registerStrategy("aroon", {
  name: "Aroon 趋势",
  nameEn: "Aroon Trend",
  category: "trend",
  description: "Aroon Up/Down 交叉，捕捉趋势形成与衰竭，适合趋势行情",
  descriptionEn: "Aroon Up/Down crossover for trend formation/exhaustion",
  params: [{ key: "period", label: "Aroon 周期", default: 25, min: 10, max: 50, step: 1 }],
  run: aroonStrategy,
});

/**
 * OBV 趋势策略：能量潮 OBV 上穿其均线买入、下穿卖出（基于本文件 obv + sma 原语）
 * @param {Array} candles
 * @param {Object} [params] { maPeriod=20 }
 * @returns {Array}
 */
function obvStrategy(candles, { maPeriod = 20 } = {}) {
  const ob = obv(candles);
  const ma = sma(ob, maPeriod);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (ma[i] === null || ma[i - 1] === null) continue;
    const diffPrev = ob[i - 1] - ma[i - 1];
    const diffCur = ob[i] - ma[i];
    if (diffPrev <= 0 && diffCur > 0) {
      signals.push({ action: "buy", reason: `OBV 上穿 MA(${maPeriod})`, confidence: 0.6, index: i });
    } else if (diffPrev >= 0 && diffCur < 0) {
      signals.push({ action: "sell", reason: `OBV 下穿 MA(${maPeriod})`, confidence: 0.6, index: i });
    }
  }
  return signals;
}
registerStrategy("obv", {
  name: "OBV 趋势",
  nameEn: "OBV Trend",
  category: "trend",
  description: "能量潮 OBV 与其均线交叉，量价关系确认趋势",
  descriptionEn: "OBV vs its moving average crossover (volume-price confirmation)",
  params: [{ key: "maPeriod", label: "OBV 均线", default: 20, min: 5, max: 50, step: 1 }],
  run: obvStrategy,
});

/**
 * ADX 趋势强度策略：ADX 上穿阈值（趋势启动）且 +DI 领先时买入、ADX 下穿阈值（趋势衰竭）卖出
 * @param {Array} candles
 * @param {Object} [params] { period=14, threshold=25 }
 * @returns {Array}
 */
function adxStrategy(candles, { period = 14, threshold = 25 } = {}) {
  const { adx: adxArr, plusDI, minusDI } = adx(candles, period);
  const signals = [];
  for (let i = 1; i < candles.length; i++) {
    if (adxArr[i] === null || adxArr[i - 1] === null) continue;
    if (adxArr[i - 1] < threshold && adxArr[i] >= threshold && plusDI[i] > minusDI[i]) {
      signals.push({ action: "buy", reason: `ADX 突破 ${threshold} 且 +DI>-DI`, confidence: 0.65, index: i });
    } else if (adxArr[i - 1] >= threshold && adxArr[i] < threshold) {
      signals.push({ action: "sell", reason: `ADX 跌破 ${threshold}（趋势衰竭）`, confidence: 0.65, index: i });
    }
  }
  return signals;
}
registerStrategy("adx", {
  name: "ADX 趋势强度",
  nameEn: "ADX Trend Strength",
  category: "trend",
  description: "ADX 突破阈值且 +DI 领先时入场，趋势衰竭离场",
  descriptionEn: "Enter when ADX breaks its threshold with +DI leading; exit on ADX decay",
  params: [
    { key: "period", label: "ADX 周期", default: 14, min: 5, max: 30, step: 1 },
    { key: "threshold", label: "趋势阈值", default: 25, min: 15, max: 40, step: 5 },
  ],
  run: adxStrategy,
});


/* ========== 回测引擎核心 ========== */

/**
 * 运行回测
 * @param {Array} candles - K线数据
 * @param {string} strategyKey - 策略键名
 * @param {Object} params - 策略参数
 * @param {Object} config - 回测配置 { initialCapital, commission, slippage, maxPositionPct, direction }
 * @returns {Object} { trades, equityCurve, metrics }
 */
export function runBacktest(candles, strategyKey, params, config) {
  const strategy = STRATEGY_REGISTRY[strategyKey];
  if (!strategy) throw new Error(`Unknown strategy: ${strategyKey}`);

  const {
    initialCapital = 100000,
    commission = 0.001,
    slippage = 0.0005,
    maxPositionPct = 0.25,
    direction = "long",
  } = config || {};

  // 生成信号
  const signals = strategy.run(candles, params);

  // 模拟交易
  const trades = [];
  const equityCurve = [{ date: candles[0]?.date, value: initialCapital }];
  let cash = initialCapital;
  let position = null; // { entryPrice, entryDate, entryIndex, size }

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    const signal = signals.find((s) => s.index === i);

    // 持仓中，检查出场
    if (position && signal?.action === "sell" && position.side === "long") {
      const exitPrice = candle.close * (1 - slippage);
      const pnl = (exitPrice - position.entryPrice) * position.size;
      const commissionCost = position.size * exitPrice * commission;
      cash += position.size * exitPrice - commissionCost;

      trades.push({
        entryDate: position.entryDate,
        exitDate: candle.date,
        entryPrice: position.entryPrice,
        exitPrice,
        size: position.size,
        pnl: pnl - commissionCost,
        returnPct: ((exitPrice / position.entryPrice - 1) * 100),
        holdDays: i - position.entryIndex,
        strategy: strategyKey,
      });

      position = null;
    }

    // 空仓，检查入场
    if (!position && signal?.action === "buy" && direction === "long") {
      const entryPrice = candle.close * (1 + slippage);
      const size = Math.floor((cash * maxPositionPct) / entryPrice);
      const commissionCost = size * entryPrice * commission;

      if (size > 0 && cash >= size * entryPrice + commissionCost) {
        cash -= size * entryPrice + commissionCost;
        position = { entryPrice, entryDate: candle.date, entryIndex: i, size };
      }
    }

    // 记录权益曲线
    let totalValue = cash;
    if (position) {
      totalValue += position.size * candle.close;
    }
    equityCurve.push({ date: candle.date, value: totalValue });
  }

  // 平仓最后持仓
  if (position) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close * (1 - slippage);
    const pnl = (exitPrice - position.entryPrice) * position.size;
    const commissionCost = position.size * exitPrice * commission;

    trades.push({
      entryDate: position.entryDate,
      exitDate: lastCandle.date,
      entryPrice: position.entryPrice,
      exitPrice,
      size: position.size,
      pnl: pnl - commissionCost,
      returnPct: ((exitPrice / position.entryPrice - 1) * 100),
      holdDays: candles.length - 1 - position.entryIndex,
      strategy: strategyKey,
    });
  }

  // 市场基准收益序列：收盘对收盘（与 dailyReturns 同为 k→k+1 转移，索引对齐，均长 candles.length−1）
  const marketReturns = [];
  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1]?.close;
    if (typeof prevClose === "number" && prevClose > 0) {
      marketReturns.push((candles[i].close - prevClose) / prevClose);
    }
  }
  // 计算指标（传入市场基准 → 得到 informationRatio / upCapture / downCapture）
  const metrics = calcMetrics(trades, initialCapital, candles, equityCurve, undefined, marketReturns);

  return { trades, equityCurve, metrics };
}

/**
 * 参数网格优化
 * 对策略 params 中每个参数在 [min, max] 上等距采样 maxPerParam 个点，
 * 组合成网格后逐个 runBacktest，按 target 指标（默认 sharpe）降序排名。
 * 组合数超过上限时截断（truncated=true），避免组合爆炸。
 *
 * @param {Array} candles
 * @param {string} strategyKey
 * @param {Object} [gridOpts] - { maxPerParam?, target? }
 * @param {Object} [config] - 透传给 runBacktest 的配置
 * @returns {{results: Array, best: Object|null, target: string, count: number, truncated: boolean, maxPerParam: number, error?: string}}
 */
export function optimizeStrategy(candles, strategyKey, gridOpts = {}, config) {
  const strategy = STRATEGY_REGISTRY[strategyKey];
  const target = gridOpts && gridOpts.target ? gridOpts.target : "sharpe";
  const maxPerParam =
    typeof gridOpts?.maxPerParam === "number" && gridOpts.maxPerParam > 0
      ? Math.floor(gridOpts.maxPerParam)
      : 6;
  if (!strategy || !Array.isArray(strategy.params) || strategy.params.length === 0) {
    return { results: [], best: null, target, count: 0, truncated: false, maxPerParam, error: "no-params" };
  }
  // 每个参数的采样轴：min→max 等距 maxPerParam 点，按 step 对齐并去重保序
  const axes = strategy.params.map((p) => {
    const min = Number.isFinite(p.min) ? p.min : Number.isFinite(p.default) ? p.default : 0;
    const max = Number.isFinite(p.max) ? p.max : Number.isFinite(p.default) ? p.default : 0;
    const step = p.step && p.step > 0 ? p.step : 1;
    const values = [];
    const n = Math.max(1, maxPerParam);
    for (let k = 0; k < n; k++) {
      const raw = n === 1 ? min : min + ((max - min) * k) / (n - 1);
      values.push(Math.round(raw / step) * step);
    }
    const seen = new Set();
    return values.filter((v) => {
      const key = String(v);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  const combos = cartesianProduct(axes);
  const MAX_COMBOS = 100;
  const truncated = combos.length > MAX_COMBOS;
  const useCombos = truncated ? combos.slice(0, MAX_COMBOS) : combos;
  const results = [];
  for (const combo of useCombos) {
    const p = {};
    strategy.params.forEach((pp, i) => {
      p[pp.key] = combo[i];
    });
    try {
      const { metrics } = runBacktest(candles, strategyKey, p, config);
      const tv = Number.isFinite(metrics?.[target]) ? metrics[target] : 0;
      results.push({ params: p, metrics, targetValue: tv });
    } catch (_) {
      // 跳过产生异常的参数组合
    }
  }
  results.sort((a, b) => b.targetValue - a.targetValue);
  results.forEach((r, i) => {
    r.rank = i + 1;
  });
  return { results, best: results[0] || null, target, count: results.length, truncated, maxPerParam };
}

/** 多组取值数组的笛卡尔积：返回每个轴上的取值组合 */
function cartesianProduct(axes) {
  let res = [[]];
  for (const axis of axes) {
    if (!axis || axis.length === 0) return [[]];
    const next = [];
    for (const combo of res) {
      for (const v of axis) next.push([...combo, v]);
    }
    res = next;
  }
  return res;
}


/**
 * 年化收益率
 */
export function annualizedReturn(returns, periodsPerYear = 252) {
  if (returns.length === 0) return 0;
  const total = returns.reduce((a, b) => a + b, 1);
  return Math.pow(total, periodsPerYear / returns.length) - 1;
}

/**
 * 年化波动率
 */
export function annualizedVolatility(returns, periodsPerYear = 252) {
  if (returns.length < 2) return 0;
  const mean =
    returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - mean) ** 2, 0) /
    (returns.length - 1);
  return Math.sqrt(variance * periodsPerYear);
}

/* ========== 绩效指标计算 ========== */

/**
 * 计算完整绩效指标
 * @param {Trade[]} trades
 * @param {number} initialCapital
 * @param {Candle[]} candles
 * @param {Array<{date:string, value:number}>} [equityCurve]
 * @param {number} [peakEquity]
 * @param {number[]} [benchmark] 基准收益序列（小数；按索引对齐 dailyReturns）。
 *   提供时计算 informationRatio / upCapture / downCapture；缺省时这三项为 0（保持字段同构）。
 */
export function calcMetrics(trades, initialCapital, candles, equityCurve, peakEquity, benchmark) {
  const numTrades = trades.length;
  if (numTrades === 0) {
    return {
      totalReturn: 0, cagr: 0, sharpe: 0, sortino: 0,
      maxDrawdown: 0, winRate: 0, profitFactor: 0, payoffRatio: 0,
      omegaRatio: 0, tailRatio: 0, sterlingRatio: 0,
      avgWin: 0, avgLoss: 0, numTrades: 0, exposure: 0,
      calmar: 0, volatility: 0, downsideDeviation: 0,
      var95: 0, cvar95: 0, recoveryPeriods: null,
      maxLosingStreak: 0, maxWinStreak: 0, ulcerIndex: 0, maxDrawdownDuration: 0, probRuin: 0,
      informationRatio: 0, upCapture: 0, downCapture: 0, trackingError: 0, beta: 0, alpha: 0,
      treynor: 0, martin: 0,
      expectancy: 0,
      avgDrawdown: 0, longestUnderwater: 0, underwaterPct: 0,
    };
  }

  const finalEquity = equityCurve
    ? equityCurve[equityCurve.length - 1].value
    : initialCapital + trades.reduce((a, t) => a + t.pnl, 0);
  const totalReturn = (finalEquity / initialCapital - 1) * 100;

  // CAGR
  const startDate = candles[0]?.date || new Date().toISOString();
  const endDate = candles[candles.length - 1]?.date || new Date().toISOString();
  const years = (new Date(endDate) - new Date(startDate)) / (365.25 * 86400000);
  const cagr = years > 0
    ? (Math.pow(finalEquity / initialCapital, 1 / years) - 1) * 100
    : 0;

  // 每日收益序列
  const dailyReturns = [];
  if (equityCurve && equityCurve.length > 1) {
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].value;
      if (prev > 0) {
        dailyReturns.push((equityCurve[i].value - prev) / prev);
      }
    }
  } else {
    // 无权益曲线时用交易收益近似
    for (const t of trades) dailyReturns.push(t.returnPct / 100);
  }

  // Sharpe / Sortino（复用 lib/risk.js 纯函数，与内部实现同源）
  const sharpe = sharpeRatio(dailyReturns, 252, 0);
  const sortino = sortinoRatio(dailyReturns, 252, 0);
  // 欧米伽比率（上行总收益/下行总损失）与尾部比率（q95/|q05|），复用 lib/risk.js
  const omega = omegaRatio(dailyReturns, 0);
  const tail = tailRatio(dailyReturns, 0.05, 0.95);
  // 下行标准差（仅计 r<0 部分，全样本 n 分母），与 sortinoRatio 同源但单独暴露"下行波动"
  const downDev = downsideDeviation(dailyReturns, 0);
  // 马丁比率 = 超额收益 / 下行标准差（全样本分母），比 Sortino 更保守（复用 lib/risk.js）
  const martin = martinRatio(dailyReturns, 252, 0, 0);

  // 最大回撤
  let maxDD = 0;
  if (equityCurve) {
    let peak = initialCapital;
    for (const pt of equityCurve) {
      if (pt.value > peak) peak = pt.value;
      const dd = (peak - pt.value) / peak;
      if (dd > maxDD) maxDD = dd;
    }
  }

  // Calmar（复用 lib/risk.js calmarRatio；无回撤封顶 999，与 Sterling 同惯例）
  const calmar = calmarRatio(cagr, maxDD);

  // 回撤画像（复用 lib/risk.js maxDrawdownStats：平均回撤 / 最长水下 / 水下占比；无权益曲线 → 0）
  const ddStats = equityCurve ? maxDrawdownStats(equityCurve) : null;
  const avgDrawdown = ddStats ? ddStats.avgDD : 0;
  const longestUnderwater = ddStats ? ddStats.longestUnderwater : 0;
  const underwaterPct = ddStats ? ddStats.pctUnderwater : 0;

  // 最大回撤恢复期数（与 lib/risk.js drawdownRecovery 同源；未恢复 → null）
  const ddRecovery = equityCurve ? drawdownRecovery(equityCurve.map((p) => p.value)) : null;
  const recoveryPeriods = ddRecovery && ddRecovery.recovered ? ddRecovery.recovery : null;

  // 最长连续亏损交易数（与 lib/risk.js maxLosingStreak 同源）
  const maxLosingStreakVal = maxLosingStreak(trades);
  // 最长连续盈利交易数（与 lib/risk.js maxWinStreak 同源）
  const maxWinStreakVal = maxWinStreak(trades);
  // 溃疡指数（与 lib/risk.js ulcerIndex 同源，基于权益曲线）
  const ulcerIndexVal = ulcerIndex(equityCurve);
  // 最大回撤持续期数（与 lib/risk.js drawdownDuration 同源；无权益曲线 → 0）
  const maxDDDuration = equityCurve ? drawdownDuration(equityCurve) : 0;

  // 胜率 & 盈亏比
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winRate = (wins.length / numTrades) * 100;
  const avgWin = wins.length ? wins.reduce((a, t) => a + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length
    ? losses.reduce((a, t) => a + Math.abs(t.pnl), 0) / losses.length
    : 0;
  const grossProfit = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = losses.reduce((a, t) => a + Math.abs(t.pnl), 0);
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  // 盈亏 payoff 比：复用 lib/risk.js payoffRatio（与 profitFactor 同封顶惯例）
  const payoffRatio = payoffFn(avgWin, avgLoss);
  // 每笔期望收益：复用 lib/risk.js expectancyPerTrade（winRate 为百分数，需 /100）
  const expectancy = expectancyPerTrade(winRate / 100, avgWin, avgLoss);
  // 斯特林比率：总收益 / 最长连亏次数，从"连亏次数"维度衡量风险调整收益（复用 lib/risk.js）
  const sterling = sterlingRatio(totalReturn, maxLosingStreakVal);
  // 破产概率：以每笔交易平均收益(小数)为期望、交易数为期数的破产模型（复用 lib/risk.js）。
  // 正期望 → 破产概率 < 0.5；负期望 → > 0.5；无优势 → 0.5。
  const perTradeExp =
    numTrades > 0
      ? trades.reduce((a, t) => a + (typeof t.returnPct === "number" ? t.returnPct : 0) / 100, 0) / numTrades
      : 0;
  const probRuin = probabilityOfRuin(perTradeExp, numTrades);

  // 信息比率 / 捕获率（需基准序列；未提供基准时置 0，与空交易分支字段同构）。
  // 基准为市场收盘对收盘收益（runBacktest 由 candles 派生，与 dailyReturns 索引对齐）。
  const hasBenchmark = Array.isArray(benchmark) && benchmark.length > 0;
  const ir = hasBenchmark ? informationRatio(dailyReturns, benchmark, 252) : 0;
  const te = hasBenchmark ? trackingError(dailyReturns, benchmark, 252) : 0;
  const captures = hasBenchmark ? captureRatios(dailyReturns, benchmark) : { up: 0, down: 0 };
  // beta（市场敏感度）与 alpha（Jensen 年化超额），与 IR/TE 同源、需基准；无基准 → 0。
  const betaVal = hasBenchmark ? beta(dailyReturns, benchmark) : 0;
  const alphaVal = hasBenchmark ? alpha(dailyReturns, benchmark, 0, 252) : 0;
  // 特雷诺比率 = 年化超额收益 / β（每单位市场暴露换取的收益）；需基准，无基准 → 0。
  const treynorVal = hasBenchmark ? treynorRatio(dailyReturns, benchmark, 0, 252) : 0;

  // 年化波动率
  const volatility = annualizedVolatility(dailyReturns, 252) * 100;

  // 持仓暴露
  const totalHoldDays = trades.reduce((a, t) => a + t.holdDays, 0);
  const totalDays = candles.length || 1;
  const exposure = (totalHoldDays / totalDays) * 100;

  return {
    totalReturn: +totalReturn.toFixed(2),
    cagr: +cagr.toFixed(2),
    sharpe: +sharpe.toFixed(2),
    sortino: +sortino.toFixed(2),
    martin: +martin.toFixed(2),
    maxDrawdown: +(maxDD * 100).toFixed(2),
    winRate: +winRate.toFixed(1),
    profitFactor: +profitFactor.toFixed(2),
    payoffRatio: +payoffRatio.toFixed(2),
    omegaRatio: +omega.toFixed(2),
    tailRatio: +tail.toFixed(2),
    sterlingRatio: +sterling.toFixed(2),
    avgWin: +avgWin.toFixed(2),
    avgLoss: +avgLoss.toFixed(2),
    numTrades,
    exposure: +exposure.toFixed(1),
    calmar: +calmar.toFixed(2),
    volatility: +volatility.toFixed(2),
    downsideDeviation: +downDev.toFixed(4),
    // 风险度量（95% 置信度，由日收益历史分位估计）
    var95: +valueAtRisk(dailyReturns, 0.95).toFixed(4),
    cvar95: +expectedShortfall(dailyReturns, 0.95).toFixed(4),
    recoveryPeriods,
    maxLosingStreak: maxLosingStreakVal,
    maxWinStreak: maxWinStreakVal,
    ulcerIndex: ulcerIndexVal,
    maxDrawdownDuration: maxDDDuration,
    probRuin: +probRuin.toFixed(4),
    // 相对基准的主动风险调整收益（未提供基准时为 0）
    informationRatio: +ir.toFixed(2),
    upCapture: +captures.up.toFixed(2),
    downCapture: +captures.down.toFixed(2),
    trackingError: +te.toFixed(4),
    beta: +betaVal.toFixed(4),
    alpha: +alphaVal.toFixed(4),
    treynor: +treynorVal.toFixed(4),
    expectancy: +expectancy.toFixed(2),
    avgDrawdown: +(avgDrawdown * 100).toFixed(2),
    longestUnderwater,
    underwaterPct: +underwaterPct.toFixed(1),
  };
}

/* ========== 蒙特卡洛模拟 ========== */

/**
 * 对交易记录进行 N 次重采样，生成绩效分布
 * @param {Trade[]} trades
 * @param {number} [N=1000] - 模拟次数
 * @param {number} [initialCapital=100000]
 * @returns {{ median: number, p5: number, p95: number, p1: number, p99: number, distribution: number[] }}
 */
export function monteCarlo(trades, N = 1000, initialCapital = 100000) {
  if (trades.length === 0) {
    return { median: 0, p5: 0, p95: 0, p1: 0, p99: 0, distribution: [] };
  }

  const returns = trades.map((t) => t.returnPct / 100);
  const results = [];

  // Fisher-Yates 洗牌重采样
  for (let run = 0; run < N; run++) {
    const sample = [...returns];
    for (let i = sample.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sample[i], sample[j]] = [sample[j], sample[i]];
    }
    let equity = initialCapital;
    for (const r of sample) {
      equity *= 1 + r;
    }
    results.push(equity / initialCapital - 1);
  }

  results.sort((a, b) => a - b);
  const pct = (p) => results[Math.floor(results.length * p)] || 0;

  return {
    median: +(pct(0.5) * 100).toFixed(2),
    p5: +(pct(0.05) * 100).toFixed(2),
    p95: +(pct(0.95) * 100).toFixed(2),
    p1: +(pct(0.01) * 100).toFixed(2),
    p99: +(pct(0.99) * 100).toFixed(2),
    distribution: results,
  };
}

/**
 * 等宽频率直方图。
 * @param {number[]} values 样本值（自动清洗非有限数）
 * @param {number} [bins=10] 箱数（至少 1）
 * @returns {{ bins: {lo:number, hi:number, count:number}[], min:number, max:number, total:number, maxCount:number }}
 * 空样本 → { bins:[], min:0, max:0, total:0, maxCount:0 }；
 * 全相同值 → 单箱（所有样本归入左箱，maxCount=total）。
 */
export function histogram(values, bins = 10) {
  const arr = (Array.isArray(values) ? values : []).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (arr.length === 0) return { bins: [], min: 0, max: 0, total: 0, maxCount: 0 };
  const b = Math.max(1, Math.floor(bins));
  let min = Infinity;
  let max = -Infinity;
  for (const v of arr) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const width = max === min ? 1 : (max - min) / b;
  const out = [];
  for (let i = 0; i < b; i++) {
    out.push({ lo: min + i * width, hi: min + (i + 1) * width, count: 0 });
  }
  for (const v of arr) {
    let idx = width === 0 ? 0 : Math.floor((v - min) / width);
    if (idx >= b) idx = b - 1; // max 归入最右箱
    if (idx < 0) idx = 0;
    out[idx].count += 1;
  }
  const total = arr.length;
  const maxCount = out.reduce((m, x) => Math.max(m, x.count), 0);
  return { bins: out, min, max, total, maxCount };
}



