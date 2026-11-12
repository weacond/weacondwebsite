// tests/excursion.test.mjs — lib/excursion.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  excursion, capture, captureBand, excursionSummary,
  EXCURSION_PRESETS, num,
} from "../lib/excursion.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("excursion：多头 MFE=high−entry，MAE=entry−low", () => {
  const r = excursion("long", 100, 104, 98);
  approx(r.mfe, 4);
  approx(r.mae, 2);
  approx(r.mfePct, 0.04);
  approx(r.maePct, 0.02);
  assert.ok(r.valid);
});

test("excursion：空头 MFE=entry−low，MAE=high−entry", () => {
  const r = excursion("short", 200, 210, 190);
  approx(r.mfe, 10);
  approx(r.mae, 10);
  approx(r.mfePct, 0.05);
});

test("excursion：从未有利时 MFE=0", () => {
  const r = excursion("long", 100, 99, 98); // 高点低于入场
  approx(r.mfe, 0);
  approx(r.mae, 2);
});

test("excursion：入场≤0 或 high<low → 无效", () => {
  assert.ok(!excursion("long", 0, 5, 3).valid);
  assert.ok(!excursion("long", 100, 80, 90).valid);
});

test("capture：实际盈亏 / MFE", () => {
  const c = capture("long", 100, 102, 104, 98);
  approx(c.pnl, 2);
  approx(c.mfe, 4);
  approx(c.capture, 0.5);
  assert.ok(c.valid);
  // 空头
  const s = capture("short", 200, 195, 210, 190);
  approx(s.pnl, 5);
  approx(s.capture, 0.5);
});

test("capture：MFE=0 时捕获率为 NaN", () => {
  const c = capture("long", 100, 100, 100, 98); // 从未有利
  assert.ok(Number.isNaN(c.capture));
});

test("captureBand：分级", () => {
  assert.equal(captureBand(NaN), "na");
  assert.equal(captureBand(-1), "missed");
  assert.equal(captureBand(0), "missed");
  assert.equal(captureBand(0.3), "partial");
  assert.equal(captureBand(0.5), "good");
  assert.equal(captureBand(0.9), "good");
  assert.equal(captureBand(1), "full");
  assert.equal(captureBand(1.5), "full");
});

test("excursionSummary：组合 MFE/MAE + 捕获 + 分级", () => {
  const r = excursionSummary({ side: "long", entry: 100, high: 104, low: 98, exit: 102 });
  approx(r.mfe, 4);
  approx(r.mae, 2);
  approx(r.cap.capture, 0.5);
  assert.equal(r.band, "good");
  assert.ok(r.valid);
  // 无出场 → band=null
  assert.equal(excursionSummary({ side: "long", entry: 100, high: 104, low: 98 }).band, null);
});

test("预设：4 个形态，excursionSummary 均有效", () => {
  const keys = Object.keys(EXCURSION_PRESETS);
  assert.equal(keys.length, 4);
  for (const k of keys) {
    const p = EXCURSION_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.entry) && p.entry > 0);
    assert.ok(Number.isFinite(p.high) && p.high >= p.low);
    assert.ok(excursionSummary(p).valid);
  }
  // 假突破：盈利幅度远小于 MFE，捕获率为负
  assert.ok(excursionSummary(EXCURSION_PRESETS.whipsaw).cap.capture < 0);
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});