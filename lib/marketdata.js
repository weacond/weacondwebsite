/**
 * 市场数据层 — 数据源抽象 + 模拟数据生成
 *
 * 设计原则：
 * - 统一接口：getMarketData(symbol, range) → Candle[]
 * - 支持多源：模拟 / Alpha Vantage / yfinance / 本地文件
 * - 回测引擎不依赖具体数据源
 */

import { STRATEGY_REGISTRY, runBacktest, monteCarlo } from "./backtest.js";

/**
 * 生成模拟 K 线数据（几何布朗运动）
 * @param {Object} opts
 * @param {number} [opts.startPrice=100]
 * @param {number} [opts.days=252] - 交易日数
 * @param {number} [opts.drift=0.0003] - 日均漂移
 * @param {number} [opts.vol=0.02] - 日波动率
 * @param {string} [opts.seed=42] - 随机种子
 * @param {string} [opts.startDate="2023-01-01"]
 * @returns {Candle[]}
 */
export function generateMockCandles({
  startPrice = 100,
  days = 504,
  drift = 0.0003,
  vol = 0.02,
  seed = 42,
  startDate = "2023-01-01",
} = {}) {
  // 简单 LCG 伪随机（可复现）
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };

  // Box-Muller 正态分布
  const normalRand = () => {
    const u1 = Math.max(rand(), 1e-10);
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const candles = [];
  let price = startPrice;
  const start = new Date(startDate);

  for (let i = 0; i < days; i++) {
    // 跳过周末
    const date = new Date(start);
    date.setDate(start.getDate() + Math.floor((i * 7) / 5));
    const iso = date.toISOString().slice(0, 10);

    const ret = drift + vol * normalRand();
    const open = price;
    const close = open * (1 + ret);
    const high = Math.max(open, close) * (1 + Math.abs(normalRand()) * vol * 0.5);
    const low = Math.min(open, close) * (1 - Math.abs(normalRand()) * vol * 0.5);
    const volume = Math.floor(1000000 + rand() * 5000000);

    candles.push({ date: iso, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), volume });
    price = close;
  }

  return candles;
}

/**
 * 预设市场数据（用于快速回测演示）
 * 包含不同行情特征的模拟数据
 */
export const PRESET_MARKETS = {
  "SPY_2023": {
    label: "S&P 500 (2023, 模拟)",
    symbol: "SPY",
    config: { startPrice: 385, days: 252, drift: 0.001, vol: 0.015, seed: 42 },
    description: "温和上涨，低波动",
  },
  "BTC_2022": {
    label: "BTC (2022, 模拟)",
    symbol: "BTC",
    config: { startPrice: 47000, days: 252, drift: -0.0005, vol: 0.045, seed: 7 },
    description: "高波动下跌",
  },
  "NDX_2021": {
    label: "Nasdaq 100 (2021, 模拟)",
    symbol: "QQQ",
    config: { startPrice: 150, days: 252, drift: 0.0015, vol: 0.02, seed: 13 },
    description: "牛市高收益",
  },
  "VIX_2020": {
    label: "VIX (2020, 模拟)",
    symbol: "VIX",
    config: { startPrice: 25, days: 252, drift: 0.0001, vol: 0.06, seed: 99 },
    description: "极端波动",
  },
  "CUSTOM": {
    label: "自定义参数",
    symbol: "CUSTOM",
    config: {},
    description: "自定义起点、波动率、周期",
  },
};

/**
 * 完整回测流程（供 API 调用）
 * @param {Object} request
 * @param {string} request.strategy - 策略 key（STRATEGY_REGISTRY）
 * @param {Object} request.params - 策略参数
 * @param {Object} request.config - 回测配置
 * @param {string} request.preset - 预设市场 key
 * @returns {Object}
 */
export function runFullBacktest({ strategy: strategyKey, params, config, preset = "SPY_2023" }) {
  const strategy = STRATEGY_REGISTRY[strategyKey];
  if (!strategy) {
    throw new Error(`Unknown strategy: ${strategyKey}`);
  }

  // 获取市场数据
  let candles;
  if (preset === "CUSTOM") {
    candles = generateMockCandles(config?.marketConfig || { days: 504 });
  } else {
    const presetConfig = PRESET_MARKETS[preset]?.config || PRESET_MARKETS.SPY_2023.config;
    candles = generateMockCandles(presetConfig);
  }

  // 运行回测
  const btConfig = {
    initialCapital: config?.initialCapital || 100000,
    commission: config?.commission || 0.001,
    slippage: config?.slippage || 0.0005,
    maxPositionPct: config?.maxPositionPct || 0.25,
    direction: config?.direction || "long",
  };

  const result = runBacktest(candles, strategy, params, btConfig);

  // 蒙特卡洛（仅在交易数足够时）
  let monteCarloResult = null;
  if (result.trades.length >= 5) {
    monteCarloResult = monteCarlo(result.trades, 500, btConfig.initialCapital);
  }

  return {
    strategy: strategyKey,
    strategyName: strategy.name,
    preset,
    marketLabel: PRESET_MARKETS[preset]?.label || "Custom",
    candles: {
      count: candles.length,
      startDate: candles[0]?.date,
      endDate: candles[candles.length - 1]?.date,
      startPrice: candles[0]?.close,
      endPrice: candles[candles.length - 1]?.close,
    },
    ...result,
    monteCarlo: monteCarloResult,
    timestamp: new Date().toISOString(),
  };
}
