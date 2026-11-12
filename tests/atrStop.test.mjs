// tests/atrStop.test.mjs — lib/atrStop.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trueRange, atr, atrStop, riskPerShare, positionSizeByAtr,
  atrSummary, rrBand, ATR_PRESETS, num,
} from "../lib/atrStop.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("trueRange：无前收退化为 H−L；含跳空取最大", () => {
  approx(trueRange({ high: 10, low: 8 }, null), 2);
  approx(trueRange({ high: 11, low: 9 }, 9), 2);
  approx(trueRange({ high: 12, low: 10 }, 9), 3); // 跳空上涨 |12−9|=3
  approx(trueRange({ high: 11, low: 10 }, 13), 3); // 跳空下跌 |10−13|=3
});

test("atr：等 TR=2 → ATR=2", () => {
  const bars = [
    { high: 10, low: 8, close: 9 },
    { high: 11, low: 9, close: 10 },
    { high: 12, low: 10, close: 11 },
    { high: 13, low: 11, close: 12 },
  ];
  approx(atr(bars, 3).value, 2);
  assert.ok(atr(bars, 3).valid);
});

test("atr：种子为前 p 个 TR 均值（[2,3,1]→2）", () => {
  const bars = [
    { high: 10, low: 8, close: 9 },
    { high: 12, low: 10, close: 11 },
    { high: 11, low: 10, close: 10 },
  ];
  approx(atr(bars, 3).value, 2);
});

test("atr：Wilder 平滑（[2,2,2,8,8], p=3 → 16/3）", () => {
  // 每根 close 落在下一根区间内，使 TR 序列为 [2,2,2,8,8]
  const bars = [
    { high: 10, low: 8, close: 9 },
    { high: 11, low: 9, close: 10 },
    { high: 12, low: 10, close: 11 },
    { high: 17, low: 9, close: 13 },
    { high: 17, low: 9, close: 15 },
  ];
  assert.deepEqual(atr(bars, 3).trs, [2, 2, 2, 8, 8]);
  approx(atr(bars, 3).value, 16 / 3);
});

test("atr：空序列 / 全 0 → 无效", () => {
  assert.ok(!atr([], 14).valid);
  assert.ok(!atr([{ high: 5, low: 5, close: 5 }], 3).valid); // TR=0
});

test("atrStop：多头在下方、空头在上方；dist=mult·ATR", () => {
  const l = atrStop("long", 100, 2, 1);
  approx(l.stop, 98);
  approx(l.dist, 2);
  assert.ok(l.valid);
  const s = atrStop("short", 100, 2, 1);
  approx(s.stop, 102);
  assert.ok(!atrStop("long", 100, 0, 1).valid); // 无波动
  assert.ok(!atrStop("long", 100, 2, 0).valid); // mult=0
});

test("riskPerShare = |入场 − 止损|", () => {
  approx(riskPerShare(100, 98), 2);
  approx(riskPerShare(100, 105), 5);
});

test("positionSizeByAtr：风险金额 / 止损距离", () => {
  const r = positionSizeByAtr(10000, 1, 2, 1);
  approx(r.risk, 100);
  approx(r.stopDist, 2);
  approx(r.shares, 50);
  assert.ok(r.valid);
  const r2 = positionSizeByAtr(10000, 1, 2, 2);
  approx(r2.stopDist, 4);
  approx(r2.shares, 25);
  assert.ok(!positionSizeByAtr(10000, 1, 0, 1).valid);
});

test("atrSummary：止损 + 头寸 + 盈亏比", () => {
  const r = atrSummary({ account: 10000, riskPct: 1, side: "long", entry: 100, atrVal: 2, mult: 1, target: 104 });
  approx(r.stop.stop, 98);
  approx(r.size.shares, 50);
  approx(r.rr.ratio, 2); // reward 4 / risk 2
  assert.ok(r.valid);
  assert.equal(atrSummary({ account: 10000, riskPct: 1, side: "long", entry: 100, atrVal: 2, mult: 1 }).rr, null);
});

test("rrBand：分级", () => {
  assert.equal(rrBand(0), "poor");
  assert.equal(rrBand(-1), "poor");
  assert.equal(rrBand(0.5), "thin");
  assert.equal(rrBand(1), "fair");
  assert.equal(rrBand(1.5), "fair");
  assert.equal(rrBand(2), "strong");
  assert.equal(rrBand(3), "strong");
});

test("预设：4 个场景，atrSummary 均有效", () => {
  const keys = Object.keys(ATR_PRESETS);
  assert.equal(keys.length, 4);
  for (const k of keys) {
    const p = ATR_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.account) && p.account > 0);
    assert.ok(Number.isFinite(p.atrVal) && p.atrVal > 0);
    assert.ok(atrSummary(p).valid);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});