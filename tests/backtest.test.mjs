import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sma,
  ema,
  rsi,
  atr,
  bollinger,
  macd,
  stochastic,
  vwap,
  keltner,
  donchian,
  williams,
  obv,
  supertrend,
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

// ---------- 技术指标（新增）----------

test("macd: 三线长度一致、histogram = macd − signal", () => {
  const candles = Array.from({ length: 50 }, (_, i) => ({
    high: 10 + i + 1,
    low: 9 + i,
    close: 9.5 + i + 0.3,
    open: 9 + i,
  }));
  const { macd: m, signal, histogram } = macd(candles, 12, 26, 9);
  assert.equal(m.length, 50);
  assert.equal(signal.length, 50);
  assert.equal(histogram.length, 50);
  assert.ok(Math.abs(histogram[49] - (m[49] - signal[49])) < 1e-12, "histogram 口径");
});

test("stochastic: k 值域 [0,100]、预热为 null、d 为 k 的 SMA", () => {
  const candles = Array.from({ length: 40 }, (_, i) => ({
    high: 10 + i + 1,
    low: 9 + i,
    close: 9.5 + i,
    open: 9 + i,
  }));
  const { k, d } = stochastic(candles, 14, 3);
  assert.equal(k[0], null);
  assert.ok(k[13] !== null, "kPeriod-1 处起有值");
  for (const v of k) if (v !== null) assert.ok(v >= 0 && v <= 100, "k 值域");
  assert.equal(d[14], null, "d 预热");
  assert.ok(d[15] !== null);
});

test("vwap: 累计成交量为 0 时为 null；有量时等于加权和", () => {
  assert.equal(vwap([{ high: 1, low: 1, close: 1, volume: 0 }])[0], null);
  const c = [
    { high: 10, low: 9, close: 9.5, volume: 100 },
    { high: 12, low: 11, close: 11.5, volume: 100 },
  ];
  const out = vwap(c);
  // 典型价 (h+l+c)/3：(10+9+9.5)/3=9.5, (12+11+11.5)/3=11.5；等量 → 均 10.5
  assert.ok(Math.abs(out[1] - 10.5) < 1e-9, "等量 VWAP = 均价");
});

test("keltner: 上轨 > 中轨 > 下轨、预热为 null", () => {
  const candles = Array.from({ length: 40 }, (_, i) => ({
    high: 10 + i + 1,
    low: 9 + i,
    close: 9.5 + i,
    open: 9 + i,
  }));
  const { mid, upper, lower } = keltner(candles, 20, 2);
  assert.equal(upper[0], null, "ATR 预热 → 上下轨 null");
  const last = 39;
  assert.ok(upper[last] > mid[last]);
  assert.ok(mid[last] > lower[last]);
});

test("donchian: 上轨=窗口最高、下轨=窗口最低、mid 为中值", () => {
  const candles = Array.from({ length: 25 }, (_, i) => ({
    high: 10 + i + 1,
    low: 9 + i,
    close: 9.5 + i,
    open: 9 + i,
  }));
  const { upper, lower, mid } = donchian(candles, 20);
  assert.equal(upper[0], null);
  const last = 24;
  assert.ok(upper[last] === 10 + 24 + 1, "上轨=区间最高 high（i=24）");
  assert.ok(lower[last] === 9 + (last - 20 + 1), "下轨=区间最低 low（窗口起点 i=5，low 递增）");
  assert.ok(Math.abs(mid[last] - (upper[last] + lower[last]) / 2) < 1e-12);
});

test("williams: 值域 [−100,0]、预热为 null", () => {
  const candles = Array.from({ length: 40 }, (_, i) => ({
    high: 10 + i + 1,
    low: 9 + i,
    close: 9.5 + i + 0.9,
    open: 9 + i,
  }));
  const out = williams(candles, 14);
  assert.equal(out[0], null);
  for (const v of out) if (v !== null) assert.ok(v >= -100 && v <= 0, "值域");
});

test("obv: 起始为 0、上涨累加成交量、持平不变", () => {
  const candles = [
    { high: 3, low: 1, close: 2, volume: 100 },
    { high: 3, low: 1, close: 3, volume: 200 }, // 涨 → +200
    { high: 3, low: 1, close: 3, volume: 300 }, // 平 → 不变
    { high: 3, low: 1, close: 1, volume: 400 }, // 跌 → −400
  ];
  const out = obv(candles);
  assert.equal(out[0], 0);
  assert.equal(out[1], 200);
  assert.equal(out[2], 200);
  assert.equal(out[3], -200);
});

test("supertrend: 强上涨方向 up、强下跌方向 down、预热为 null", () => {
  const up = Array.from({ length: 60 }, (_, i) => ({
    high: 100 + i + 1,
    low: 100 + i - 1,
    close: 100 + i + 0.3,
    open: 100 + i,
    volume: 1000,
  }));
  const down = Array.from({ length: 60 }, (_, i) => ({
    high: 100 - i + 1,
    low: 100 - i - 1,
    close: 100 - i - 0.3,
    open: 100 - i,
    volume: 1000,
  }));
  const su = supertrend(up, 10, 3);
  const sd = supertrend(down, 10, 3);
  assert.equal(su.direction[0], null, "预热 null");
  assert.equal(su.direction[59], "up", "强上涨 → up");
  assert.equal(sd.direction[59], "down", "强下跌 → down");
  // supertrend 值应为有限数（方向 up 时取下轨）
  assert.ok(Number.isFinite(su.supertrend[59]), "supertrend 值为有限数");
});

// ---------- 策略注册表 ----------
test("STRATEGY_REGISTRY: 含 ma_cross/rsi/breakout/bollinger 且 run 为函数", () => {
  for (const k of ["ma_cross", "rsi", "breakout", "bollinger"]) {
    assert.ok(STRATEGY_REGISTRY[k], `缺少策略 ${k}`);
    assert.equal(typeof STRATEGY_REGISTRY[k].run, "function");
  }
});

// ---------- 新增策略（复用指标原语）----------

test("STRATEGY_REGISTRY: 含 supertrend/macd_cross 且 run/params 合法", () => {
  for (const k of ["supertrend", "macd_cross"]) {
    assert.ok(STRATEGY_REGISTRY[k], `缺少策略 ${k}`);
    assert.equal(typeof STRATEGY_REGISTRY[k].run, "function", `${k}.run 应为函数`);
    assert.ok(Array.isArray(STRATEGY_REGISTRY[k].params), `${k}.params 应为数组`);
    assert.equal(STRATEGY_REGISTRY[k].category, "trend", `${k} 应为趋势类`);
  }
});

test("supertrend 策略: 先跌后涨产生翻多买入信号", () => {
  const candles = [
    ...Array.from({ length: 40 }, (_, i) => ({ high: 100 - i, low: 99 - i, close: 99.5 - i, open: 100 - i, volume: 1000 })),
    ...Array.from({ length: 40 }, (_, i) => ({ high: 60 + i, low: 59 + i, close: 59.5 + i, open: 60 + i, volume: 1000 })),
  ];
  const signals = STRATEGY_REGISTRY.supertrend.run(candles, { period: 10, mult: 3 });
  assert.ok(signals.some((s) => s.action === "buy"), "V 形底部应有翻多买入信号");
});

test("macd_cross 策略: 先跌后涨产生金叉买入、随后死叉卖出", () => {
  const candles = [
    ...Array.from({ length: 40 }, (_, i) => ({ high: 100 - i, low: 99 - i, close: 99.5 - i, open: 100 - i, volume: 1000 })),
    ...Array.from({ length: 40 }, (_, i) => ({ high: 60 + i, low: 59 + i, close: 59.5 + i, open: 60 + i, volume: 1000 })),
  ];
  const signals = STRATEGY_REGISTRY.macd_cross.run(candles, {});
  assert.ok(signals.some((s) => s.action === "buy"), "应有 MACD 金叉买入信号");
  assert.ok(signals.some((s) => s.action === "sell"), "应有 MACD 死叉卖出信号");
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
    "profitFactor", "payoffRatio", "omegaRatio", "tailRatio", "sterlingRatio", "numTrades", "exposure", "calmar", "volatility", "expectancy",
    "var95", "cvar95", "recoveryPeriods", "maxLosingStreak", "maxWinStreak", "ulcerIndex", "maxDrawdownDuration", "downsideDeviation", "probRuin",
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
  assert.ok(Number.isFinite(res.metrics.ulcerIndex) && res.metrics.ulcerIndex >= 0, "ulcerIndex 非负有限");
  // payoff 比非负（avgWin/|avgLoss|，无亏损封顶 999）
  assert.ok(typeof res.metrics.payoffRatio === "number" && res.metrics.payoffRatio >= 0, "payoffRatio 非负");
  // 欧米伽/尾部比率非负有限
  assert.ok(Number.isFinite(res.metrics.omegaRatio) && res.metrics.omegaRatio >= 0, "omegaRatio 非负有限");
  assert.ok(Number.isFinite(res.metrics.tailRatio) && res.metrics.tailRatio >= 0, "tailRatio 非负有限");
  // 斯特林比率有限（可负：负收益/正连亏）
  assert.ok(Number.isFinite(res.metrics.sterlingRatio), "sterlingRatio 有限");
  // 最大回撤持续期数：非负整数（回撤区间 K 线根数）
  assert.ok(Number.isInteger(res.metrics.maxDrawdownDuration) && res.metrics.maxDrawdownDuration >= 0, "maxDrawdownDuration 非负整数");
  // 下行波动：非负有限（仅计 r<0，全样本分母）
  assert.ok(Number.isFinite(res.metrics.downsideDeviation) && res.metrics.downsideDeviation >= 0, "downsideDeviation 非负有限");
});

test("runBacktest: 未知策略应抛错", () => {
  const candles = [{ date: "2023-01-01", open: 1, high: 2, low: 0, close: 1, volume: 1 }];
  assert.throws(() => runBacktest(candles, "no_such_strategy", {}, {}), /Unknown strategy/);
});

test("calcMetrics: 空交易返回全 0（且字段完整，与有交易时同构）", () => {
  const m = calcMetrics([], 100000, [], []);
  assert.equal(m.numTrades, 0);
  assert.equal(m.sharpe, 0);
  assert.equal(m.maxDrawdown, 0);
  assert.equal(m.payoffRatio, 0);
  assert.equal(m.omegaRatio, 0);
  assert.equal(m.tailRatio, 0);
  assert.equal(m.sterlingRatio, 0);
  assert.equal(m.maxDrawdownDuration, 0);
  assert.equal(m.downsideDeviation, 0);
  assert.equal(m.probRuin, 0);
  assert.equal(m.informationRatio, 0);
  assert.equal(m.upCapture, 0);
  assert.equal(m.downCapture, 0);
  assert.equal(m.trackingError, 0);
  assert.equal(m.beta, 0);
  assert.equal(m.alpha, 0);
  assert.equal(m.treynor, 0);
  assert.equal(m.martin, 0);
  assert.equal(m.expectancy, 0);
  assert.equal(m.avgDrawdown, 0);
  assert.equal(m.longestUnderwater, 0);
  assert.equal(m.underwaterPct, 0);
  // 空交易时字段必须完整，避免 /compare 与 /backtest 读到 undefined
  for (const k of ["profitFactor", "payoffRatio", "omegaRatio", "tailRatio", "sterlingRatio", "maxDrawdownDuration", "downsideDeviation", "probRuin", "informationRatio", "upCapture", "downCapture", "trackingError", "beta", "alpha", "treynor", "martin", "expectancy", "avgDrawdown", "longestUnderwater", "underwaterPct", "var95", "cvar95", "maxLosingStreak", "maxWinStreak", "ulcerIndex"]) {
    assert.ok(k in m, `空交易仍应有 ${k}`);
  }
  assert.equal(m.recoveryPeriods, null, "无恢复期为 null");
});

test("calcMetrics: payoffRatio = avgWin / |avgLoss|（精确值）", () => {
  // 盈利 [10, 20] → avgWin=15；亏损 [-5, -15] → 平均幅度=10 → payoff=1.5
  const trades = [
    { pnl: 10 }, { pnl: 20 }, { pnl: -5 }, { pnl: -15 },
  ];
  const eq = [{ date: "2023-01-01", value: 100000 }, { date: "2023-12-31", value: 100000 }];
  const m = calcMetrics(trades, 100000, [], eq);
  assert.ok(Math.abs(m.payoffRatio - 1.5) < 1e-6, "payoff=1.5");
  // 每笔期望收益：胜率 50% × avgWin 15 − 50% × avgLoss 10 = 2.5
  assert.ok(Math.abs(m.expectancy - 2.5) < 1e-6, "expectancy=2.5");
});

test("calcMetrics: 无亏损时 expectancy = avgWin；全亏损 = −avgLoss", () => {
  const eq = [{ date: "2023-01-01", value: 100000 }, { date: "2023-12-31", value: 100000 }];
  // 全盈利 [5, 3]：avgWin=4, 胜率 100% → expectancy = 1·4 − 0 = 4
  const onlyWins = calcMetrics([{ pnl: 5 }, { pnl: 3 }], 100000, [], eq);
  assert.ok(Math.abs(onlyWins.expectancy - 4) < 1e-6, "全盈利 expectancy=avgWin=4");
  // 全亏损 [-5, -3]：avgLoss=4, 胜率 0% → expectancy = 0 − 1·4 = -4
  const onlyLosses = calcMetrics([{ pnl: -5 }, { pnl: -3 }], 100000, [], eq);
  assert.ok(Math.abs(onlyLosses.expectancy + 4) < 1e-6, "全亏损 expectancy=-avgLoss=-4");
});

test("calcMetrics: 无亏损时 payoffRatio 封顶 999；全亏损为 0", () => {
  const eq = [{ date: "2023-01-01", value: 100000 }, { date: "2023-12-31", value: 100000 }];
  const onlyWins = calcMetrics([{ pnl: 5 }, { pnl: 3 }], 100000, [], eq);
  assert.equal(onlyWins.payoffRatio, 999, "全盈利封顶 999");
  const onlyLosses = calcMetrics([{ pnl: -5 }, { pnl: -3 }], 100000, [], eq);
  assert.equal(onlyLosses.payoffRatio, 0, "全亏损=0");
});

test("calcMetrics: 回撤画像（avgDrawdown/longestUnderwater/underwaterPct）", () => {
  // 权益曲线 100→100→90→80→100→110：峰 100，谷 80(−20%)；水下点 90、80 共 2 个，n=6
  const eq = [100, 100, 90, 80, 100, 110].map((v, i) => ({ date: `2023-01-0${i + 1}`, value: v }));
  const m = calcMetrics([{ pnl: 10, returnPct: 1, holdDays: 1 }], 100000, [], eq);
  // maxDrawdownStats 内部以 vals[0] 为峰，与 initialCapital 量纲无关 → 结果可精确断言
  assert.ok(Math.abs(m.avgDrawdown - 15) < 1e-6, "平均回撤 15%（(10+20)/2）");
  assert.equal(m.longestUnderwater, 2, "最长水下 2 根");
  assert.ok(Math.abs(m.underwaterPct - 33.3) < 1e-6, "水下占比 2/6 ≈ 33.3%（存储 toFixed(1)）");
});

test("calcMetrics: 无回撤权益曲线 → 回撤画像全 0", () => {
  const eq = [100, 101, 102, 103].map((v, i) => ({ date: `2023-01-0${i + 1}`, value: v }));
  const m = calcMetrics([{ pnl: 10, returnPct: 1, holdDays: 1 }], 100000, [], eq);
  assert.equal(m.avgDrawdown, 0, "单调上升无回撤 → avgDrawdown=0");
  assert.equal(m.longestUnderwater, 0, "单调上升 → longestUnderwater=0");
  assert.equal(m.underwaterPct, 0, "单调上升 → underwaterPct=0");
});

test("calcMetrics: probRuin 破产概率——强正期望<0.5、零期望=0.5、负期望趋近 1、单调", () => {
  const eq = [{ date: "2023-01-01", value: 100000 }, { date: "2023-12-31", value: 100000 }];
  // 零期望：平均每笔收益为 0 → 破产概率 = 0.5（gambler's-ruin 基准）
  const zero = calcMetrics(
    [{ returnPct: 2, pnl: 200 }, { returnPct: -2, pnl: -200 }],
    100000, [], eq,
  );
  assert.ok(Math.abs(zero.probRuin - 0.5) < 1e-6, "零期望 → probRuin=0.5");
  // 强正期望：足够多交易且每笔收益较高 → 破产概率 < 0.5（随 N 与优势指数衰减）
  const pos = calcMetrics(
    Array.from({ length: 5 }, () => ({ returnPct: 10, pnl: 1000 })),
    100000, [], eq,
  );
  assert.ok(pos.probRuin >= 0 && pos.probRuin < 0.5, "强正期望 → probRuin<0.5");
  // 负期望：每笔亏损 → 破产概率趋近 1（> 0.5）
  const neg = calcMetrics(
    Array.from({ length: 5 }, () => ({ returnPct: -10, pnl: -1000 })),
    100000, [], eq,
  );
  assert.ok(neg.probRuin > 0.5, "负期望 → probRuin>0.5");
  // 单调性：正期望越强，破产概率越低
  const weak = calcMetrics(
    Array.from({ length: 5 }, () => ({ returnPct: 1, pnl: 100 })),
    100000, [], eq,
  );
  assert.ok(pos.probRuin < weak.probRuin, "更强正期望 → 更低破产概率");
});

test("calcMetrics: 基准序列 → informationRatio/upCapture/downCapture；无基准 → 全 0", () => {
  // 权益曲线日收益 = [0.01, -0.005]，与基准 [0.01, -0.005] 完美跟踪
  const eq = [
    { date: "2023-01-01", value: 100000 },
    { date: "2023-01-02", value: 101000 },
    { date: "2023-01-03", value: 100495 },
  ];
  const trades = [{ returnPct: 0.5, pnl: 500, holdDays: 2 }];
  const bench = [0.01, -0.005];
  const m = calcMetrics(trades, 100000, [], eq, undefined, bench);
  // 完美跟踪 → 上行/下行捕获 = 1；超额恒 0 → IR=0
  assert.ok(Math.abs(m.upCapture - 1) < 1e-9, "上行捕获 = 1");
  assert.ok(Math.abs(m.downCapture - 1) < 1e-9, "下行捕获 = 1");
  assert.equal(m.informationRatio, 0, "完美跟踪 → 超额 0 → IR=0");
  assert.equal(m.trackingError, 0, "完美跟踪 → TE=0");
  assert.ok(Math.abs(m.beta - 1) < 1e-9, "完美跟踪(r=b) → β=1");
  assert.equal(m.alpha, 0, "r=b(β=1) → α=0");
  // 无基准 → 三项均为 0（保持字段同构）
  const noB = calcMetrics(trades, 100000, [], eq);
  assert.equal(noB.informationRatio, 0, "无基准 → IR=0");
  assert.equal(noB.upCapture, 0, "无基准 → 上行捕获 0");
  assert.equal(noB.downCapture, 0, "无基准 → 下行捕获 0");
  assert.equal(noB.trackingError, 0, "无基准 → TE=0");
  assert.equal(noB.beta, 0, "无基准 → β=0");
  assert.equal(noB.alpha, 0, "无基准 → α=0");
  assert.equal(noB.treynor, 0, "无基准 → 特雷诺=0");
});

test("calcMetrics: 策略跑赢且波动小 → IR>0；下行捕获 <1（跌得比基准少）", () => {
  // 日收益 [0.02, -0.005]，基准 [0.01, -0.02]：上行捕获 0.02/0.01=2，下行捕获 0.005/0.02=0.25
  const eq = [
    { date: "2023-01-01", value: 100000 },
    { date: "2023-01-02", value: 102000 },
    { date: "2023-01-03", value: 101490 },
  ];
  const trades = [{ returnPct: 1, pnl: 1000, holdDays: 2 }];
  const bench = [0.01, -0.02];
  const m = calcMetrics(trades, 100000, [], eq, undefined, bench);
  assert.ok(m.informationRatio > 0, "跑赢且波动小 → IR>0");
  assert.ok(m.trackingError > 0, "存在超额波动 → TE>0");
  assert.ok(Math.abs(m.upCapture - 2) < 1e-6, "上行捕获 = 2");
  assert.ok(Math.abs(m.downCapture - 0.25) < 1e-6, "下行捕获 = 0.25（跌得少）");
  // r=[0.02,-0.005], b=[0.01,-0.02]：β=cov/var_b ≈ 0.8333；α>0（跑赢且 β<1）
  assert.ok(Math.abs(m.beta - 0.8333) < 1e-3, "β ≈ 0.833");
  assert.ok(m.alpha > 0, "跑赢 → 年化 α>0");
  assert.ok(m.treynor > 0, "跑赢且 β>0 → 特雷诺>0");
  assert.ok(m.martin > 0, "有超额且下行有限 → 马丁>0");
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
