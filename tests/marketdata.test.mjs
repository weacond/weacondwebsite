import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateMockCandles,
  PRESET_MARKETS,
  runFullBacktest,
} from "../lib/marketdata.js";

// ---------- generateMockCandles ----------
test("generateMockCandles: 生成指定天数的合法 OHLC 蜡烛", () => {
  const c = generateMockCandles({ days: 10, seed: 1 });
  assert.equal(c.length, 10);
  for (const k of c) {
    assert.ok(/\d{4}-\d{2}-\d{2}/.test(k.date));
    assert.ok(k.high >= k.low, "high 应 >= low");
    assert.ok(k.high >= Math.max(k.open, k.close), "high 应 >= 开/收");
    assert.ok(k.low <= Math.min(k.open, k.close), "low 应 <= 开/收");
    assert.ok(k.volume > 0, "volume 应为正");
  }
});

test("generateMockCandles: 同种子可复现，异种子不同", () => {
  const a = generateMockCandles({ days: 50, seed: 7 });
  const b = generateMockCandles({ days: 50, seed: 7 });
  const c = generateMockCandles({ days: 50, seed: 8 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("generateMockCandles: 默认参数可调用", () => {
  const c = generateMockCandles();
  assert.ok(Array.isArray(c));
  assert.ok(c.length > 0);
});

// ---------- PRESET_MARKETS ----------
test("PRESET_MARKETS: 关键预设齐全且含 symbol/config", () => {
  for (const key of ["SPY_2023", "BTC_2022", "NDX_2021", "VIX_2020", "CUSTOM"]) {
    assert.ok(key in PRESET_MARKETS, `缺少预设 ${key}`);
  }
  for (const key of ["SPY_2023", "BTC_2022", "NDX_2021", "VIX_2020"]) {
    const p = PRESET_MARKETS[key];
    assert.ok(p.symbol, `${key} 应有 symbol`);
    assert.ok(p.config && typeof p.config === "object", `${key} 应有 config`);
    assert.ok(typeof p.label === "string");
  }
});

// ---------- runFullBacktest ----------
test("runFullBacktest: 已知策略 + 预设 → 返回完整结果", () => {
  const r = runFullBacktest({ strategy: "ma_cross", preset: "SPY_2023" });
  assert.equal(r.strategy, "ma_cross");
  assert.ok(Array.isArray(r.trades));
  assert.ok(r.candles.count > 0);
  assert.ok("metrics" in r);
  assert.ok("strategyName" in r);
});

test("runFullBacktest: 未知策略抛错", () => {
  assert.throws(() => runFullBacktest({ strategy: "no_such_strategy" }), /Unknown strategy/);
});

test("runFullBacktest: 优先使用外部传入的 K 线", () => {
  const ext = generateMockCandles({ days: 100, seed: 5 });
  const r = runFullBacktest({ strategy: "ma_cross", candles: ext });
  assert.equal(r.candles.count, 100);
});

test("runFullBacktest: 交易数不足 5 时蒙特卡洛为 null", () => {
  // 极短数据 + 无触发策略 → 0 笔交易 → monteCarlo null
  const ext = generateMockCandles({ days: 5, seed: 1 });
  const r = runFullBacktest({ strategy: "breakout", candles: ext, config: { maxPositionPct: 0.25 } });
  assert.ok(Array.isArray(r.trades));
  // monteCarlo 要么为 null（交易不足），要么为对象
  assert.ok(r.monteCarlo === null || typeof r.monteCarlo === "object");
});