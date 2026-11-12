// tests/fxPip.test.mjs — lib/fxPip.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pipValue, notional, pnlFromPips, pipPercent,
  exposureBand, fxSummary, FX_PRESETS, num,
} from "../lib/fxPip.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("pipValue：pipSize × positionSize / rate", () => {
  approx(pipValue(0.0001, 100000, 1.085), 10 / 1.085); // ≈ 9.2166
  approx(pipValue(0.01, 100000, 150), 1000 / 150);      // JPY 点
  approx(pipValue(0.0001, 100000, 0), 0);   // 汇率 ≤0 → 0
  approx(pipValue(0, 100000, 1.085), 0);    // 点 size 0 → 0
});

test("notional：positionSize × rate", () => {
  approx(notional(100000, 1.085), 108500);
  approx(notional(50000, 1.27), 63500);
  approx(notional(1000, 1.085), 1085);
});

test("pnlFromPips：pips × pipValue", () => {
  approx(pnlFromPips(30, 0.0001, 100000, 1.085), 300 / 1.085);
  approx(pnlFromPips(100, 0.01, 100000, 150), 100000 / 150);
  approx(pnlFromPips(0, 0.0001, 100000, 1.085), 0);
});

test("pipPercent：pips × pipSize / rate × 100", () => {
  approx(pipPercent(30, 0.0001, 1.085), (30 * 0.0001 / 1.085) * 100);
  approx(pipPercent(100, 0.01, 150), 100 * 0.01 / 150 * 100); // ≈ 0.6667
  approx(pipPercent(30, 0.0001, 0), 0); // 汇率 ≤0 → 0
});

test("exposureBand：按 |价格变动%| 分级", () => {
  assert.equal(exposureBand(0), "none");
  assert.equal(exposureBand(NaN), "none");
  assert.equal(exposureBand(0.05), "low");
  assert.equal(exposureBand(0.2), "moderate");
  assert.equal(exposureBand(0.6), "high");
  assert.equal(exposureBand(-0.6), "high"); // 取绝对值
});

test("fxSummary：EUR/USD 标准手综合视图", () => {
  const r = fxSummary(FX_PRESETS.eurUsd);
  assert.ok(r.valid);
  approx(r.lots, 1);
  approx(r.pipValue, 10 / 1.085);
  approx(r.notional, 108500);
  approx(r.pnl, 300 / 1.085);
  approx(r.pipPercent, (30 * 0.0001 / 1.085) * 100);
  assert.equal(r.band, "moderate");
});

test("fxSummary：USD/JPY 高价变动 → high", () => {
  const r = fxSummary(FX_PRESETS.usdJpy);
  assert.ok(r.valid);
  approx(r.pipValue, 1000 / 150);
  assert.equal(r.band, "high");
});

test("fxSummary：头寸/汇率 ≤0 → 无效", () => {
  assert.equal(fxSummary({ pipSize: 0.0001, positionSize: 0, rate: 1.085, pips: 30 }).valid, false);
  assert.equal(fxSummary({ pipSize: 0.0001, positionSize: 100000, rate: 0, pips: 30 }).valid, false);
  assert.equal(fxSummary({}).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(FX_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = FX_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.positionSize) && p.positionSize > 0);
    assert.ok(fxSummary(p).valid);
  }
  assert.equal(fxSummary(FX_PRESETS.usdJpy).band, "high");
  assert.equal(fxSummary(FX_PRESETS.gbpUsd).band, "moderate");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
