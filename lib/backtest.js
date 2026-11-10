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
  const result = [null];
  let gains = 0,
    losses = 0;
  for (let i = 1; i < period + 1; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
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



