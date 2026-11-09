import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sma,
  ema,
  rsi,
  atr,
  bollinger,
  runBacktest,
  calcMetrics,
  annualizedReturn,
  annualizedVolatility,
  monteCarlo,
  histogram,
  STRATEGY_REGISTRY,
} from "../lib/backtest.js";

// ---------- 技术指标 ----------
test("sma: 前 period-1 个为 null，其余为窗口均值", () => {
  const out = sma([1, 2, 3, 4, 5], 3);
  assert.equal(out[0], null);
  assert.equal(out[1], null);
  assert.equal(out[2], 2); // (1+2+3)/3
  assert.equal(out[3], 3); // (2+3+4)/3
  assert.equal(out[4], 4); // (3+4+5)/3
});

test("ema: 长度一致、首值等于首价、单调序列单调", () => {
  const data = [10, 11, 12, 13, 14];
  const out = ema(data, 3);
  assert.equal(out.length, 5);
  assert.equal(out[0], 10);
  assert.ok(out[4] > out[3]);
});

test("rsi: 全涨=100，全跌=0", () => {
  assert.equal(rsi([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 14).pop(), 100);
  assert.equal(rsi([15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 14).pop(), 0);
});

test("atr: 长度等于 K 线数", () => {
  const candles = Array.from({ length: 30 }, (_, i) => ({
    high: 10 + i,
    low: 9 + i,
    close: 9.5 + i,
    open: 9 + i,
  }));
  assert.equal(atr(candles, 14).length, 30);
});

test("bollinger: 上轨 >= 中轨 >= 下轨", () => {
  const closes = [
    10, 11, 10.5, 11.5, 12, 11, 10.8, 12.2, 13, 12.5, 11.8, 12.1, 13.5,
    14, 12.9, 13.2, 13.8, 14.5, 13.1, 13.6, 15, 14.2,
  ];
  const candles = closes.map((c) => ({ high: c + 0.5, low: c - 0.5, close: c, open: c }));
  const { mid, upper, lower } = bollinger(candles, 20, 2);
  assert.equal(mid.length, 22);
  const last = 21;
  assert.ok(upper[last] >= mid[last]);
  assert.ok(mid[last] >= lower[last]);
});

// ---------- 策略注册表 ----------
test("STRATEGY_REGISTRY: 含 ma_cross/rsi/breakout/bollinger 且 run 为函数", () => {
  for (const k of ["ma_cross", "rsi", "breakout", "bollinger"]) {
    assert.ok(STRATEGY_REGISTRY[k], `缺少策略 ${k}`);
    assert.equal(typeof STRATEGY_REGISTRY[k].run, "function");
  }
});

// ---------- 回测引擎 ----------
test("runBacktest: 震荡数据产生交易且指标完整", () => {
  const candles = Array.from({ length: 200 }, (_, i) => {
    const c = 100 + 10 * Math.sin(i / 10);
    return {
      date: new Date(2023, 0, 1 + i).toISOString().slice(0, 10),
      open: c - 0.2,
      high: c + 0.3,
      low: c - 0.3,
      close: c,
      volume: 1000,
    };
  });
  const res = runBacktest(candles, "ma_cross", { fast: 10, slow: 30 }, { initialCapital: 100000 });
  assert.ok(Array.isArray(res.trades));
  assert.ok(res.trades.length >= 1, "至少应有一笔交易");
  assert.equal(res.equityCurve.length, candles.length);
  for (const key of [
    "totalReturn", "cagr", "sharpe", "maxDrawdown", "winRate",
    "profitFactor", "numTrades", "exposure", "calmar", "volatility",
    "var95", "cvar95", "recoveryPeriods", "maxLosingStreak", "maxWinStreak",
  ]) {
    assert.ok(key in res.metrics, `指标缺少 ${key}`);
  }
  assert.equal(res.metrics.numTrades, res.trades.length);
  // 风险度量：var95 为正损失，cvar95 ≥ var95（ES≥VaR）
  assert.ok(typeof res.metrics.var95 === "number" && res.metrics.var95 > 0, "var95 应为正损失");
  assert.ok(res.metrics.cvar95 >= res.metrics.var95 - 1e-6, "cvar95 ≥ var95");
  // 最长连亏为非负整数
  assert.ok(Number.isInteger(res.metrics.maxLosingStreak) && res.metrics.maxLosingStreak >= 0, "maxLosingStreak 非负整数");
  assert.ok(Number.isInteger(res.metrics.maxWinStreak) && res.metrics.maxWinStreak >= 0, "maxWinStreak 非负整数");
});

test("runBacktest: 未知策略应抛错", () => {
  const candles = [{ date: "2023-01-01", open: 1, high: 2, low: 0, close: 1, volume: 1 }];
  assert.throws(() => runBacktest(candles, "no_such_strategy", {}, {}), /Unknown strategy/);
});

test("calcMetrics: 空交易返回全 0", () => {
  const m = calcMetrics([], 100000, [], []);
  assert.equal(m.numTrades, 0);
  assert.equal(m.sharpe, 0);
  assert.equal(m.maxDrawdown, 0);
});

// ---------- 年化 ----------
test("annualizedReturn: 空数组=0；单期翻倍年化为正", () => {
  assert.equal(annualizedReturn([]), 0);
  assert.ok(annualizedReturn([1], 252) > 0);
});

test("annualizedVolatility: 少于 2 期=0", () => {
  assert.equal(annualizedVolatility([]), 0);
  assert.equal(annualizedVolatility([0.1]), 0);
});

// ---------- 蒙特卡洛 ----------
test("monteCarlo: 空交易全 0；有交易返回分布且分位有序", () => {
  assert.deepEqual(monteCarlo([]), { median: 0, p5: 0, p95: 0, p1: 0, p99: 0, distribution: [] });
  const trades = [{ returnPct: 5 }, { returnPct: -2 }, { returnPct: 3 }, { returnPct: 1 }, { returnPct: -1 }];
  const out = monteCarlo(trades, 100);
  assert.equal(out.distribution.length, 100);
  assert.ok(out.p95 >= out.p5);
});

// ---------- histogram ----------

test("histogram: 空样本 → 空结构", () => {
  assert.deepEqual(histogram([]), { bins: [], min: 0, max: 0, total: 0, maxCount: 0 });
  assert.deepEqual(histogram(null), { bins: [], min: 0, max: 0, total: 0, maxCount: 0 });
});

test("histogram: 计数总和=样本数，箱数正确，箱界连续", () => {
  const vals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // 10 个值，10 箱
  const h = histogram(vals, 10);
  assert.equal(h.total, 10, "total=样本数");
  assert.equal(h.bins.length, 10, "10 个箱");
  assert.ok(h.bins.reduce((s, b) => s + b.count, 0) === 10, "计数总和=10");
  // 箱界连续：每箱 lo = 上一箱 hi
  for (let i = 1; i < h.bins.length; i++) {
    assert.ok(Math.abs(h.bins[i].lo - h.bins[i - 1].hi) < 1e-9, "箱界连续");
  }
  assert.equal(h.min, 0);
  assert.equal(h.max, 9);
  assert.ok(h.maxCount >= 1, "maxCount≥1");
});

test("histogram: 全相同值 → 单箱归左，maxCount=total", () => {
  const h = histogram([3, 3, 3, 3], 5);
  assert.equal(h.bins[0].count, 4, "全归左箱");
  assert.equal(h.maxCount, 4, "maxCount=total");
  assert.equal(h.min, 3);
  assert.equal(h.max, 3);
});

test("histogram: bins<1 归一为 1 箱；NaN 清洗", () => {
  const h1 = histogram([1, 2, 3], 0);
  assert.equal(h1.bins.length, 1, "bins=0 → 1 箱");
  const h2 = histogram([1, NaN, 3, 4], 4);
  assert.equal(h2.total, 3, "NaN 被清洗，total=3");
});
