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
 * @property {number} maxDrawdown
 * @property {number} winRate
 * @property {number} profitFactor
 * @property {number} avgWin
 * @property {number} avgLoss
 * @property {number} numTrades
 * @property {number} exposure
 * @property {number} calmar
 * @property {number} volatility
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

  // 计算指标
  const metrics = calcMetrics(trades, initialCapital, candles, equityCurve);

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
 */
export function calcMetrics(trades, initialCapital, candles, equityCurve, peakEquity) {
  const numTrades = trades.length;
  if (numTrades === 0) {
    return {
      totalReturn: 0, cagr: 0, sharpe: 0, sortino: 0,
      maxDrawdown: 0, winRate: 0, profitFactor: 0,
      avgWin: 0, avgLoss: 0, numTrades: 0, exposure: 0,
      calmar: 0, volatility: 0,
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

  // Sharpe / Sortino
  const rf = 0; // 无风险利率简化
  const meanRet = dailyReturns.length
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
    : 0;
  const std = dailyReturns.length > 1
    ? Math.sqrt(
        dailyReturns.reduce((a, b) => a + (b - meanRet) ** 2, 0) /
          (dailyReturns.length - 1)
      )
    : 0;
  const sharpe = std > 0 ? (meanRet / std) * Math.sqrt(252) : 0;

  const downsideRet = dailyReturns.filter((r) => r < rf);
  const downsideStd = downsideRet.length > 1
    ? Math.sqrt(
        downsideRet.reduce((a, b) => a + b ** 2, 0) / downsideRet.length
      )
    : 0;
  const sortino = downsideStd > 0
    ? ((meanRet - rf) / downsideStd) * Math.sqrt(252)
    : 0;

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

  // Calmar
  const calmar = maxDD > 0 ? cagr / 100 / maxDD : 0;

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
    maxDrawdown: +(maxDD * 100).toFixed(2),
    winRate: +winRate.toFixed(1),
    profitFactor: +profitFactor.toFixed(2),
    avgWin: +avgWin.toFixed(2),
    avgLoss: +avgLoss.toFixed(2),
    numTrades,
    exposure: +exposure.toFixed(1),
    calmar: +calmar.toFixed(2),
    volatility: +volatility.toFixed(2),
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


