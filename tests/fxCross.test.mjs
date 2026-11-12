// tests/fxCross.test.mjs — lib/fxCross.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  crossRate, convert, invertedRate, pipValueCross,
  crossBand, fxCrossSummary, FXCROSS_PRESETS, num,
} from "../lib/fxCross.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("crossRate：A/C = (A/B)/(B/C)", () => {
  approx(crossRate(1.085, 1.27), 1.085 / 1.27);
  approx(crossRate(157.5, 150), 1.05);
  approx(crossRate(1.085, 0), 0); // B≤0 → 0
  approx(crossRate(0, 1.27), 0); // A=0 → 0
});

test("convert：amount × rate", () => {
  approx(convert(1000, 0.8543), 854.3);
  approx(convert(0, 1.085), 0);
  approx(convert(1000, 0), 0);
});

test("invertedRate：1/rate", () => {
  approx(invertedRate(0.8543), 1 / 0.8543);
  approx(invertedRate(0), 0); // rate≤0 → 0
});

test("pipValueCross：pipSize × notional / rate", () => {
  approx(pipValueCross(0.0001, 100000, 0.8543), 10 / 0.8543);
  approx(pipValueCross(0.01, 100000, 150), 1000 / 150);
  approx(pipValueCross(0.0001, 100000, 0), 0); // rate≤0 → 0
  approx(pipValueCross(0, 100000, 0.8543), 0); // pipSize=0 → 0
});

test("crossBand：按 pipValue 分级", () => {
  assert.equal(crossBand(0), "none");
  assert.equal(crossBand(NaN), "none");
  assert.equal(crossBand(3), "low");
  assert.equal(crossBand(7), "moderate");
  assert.equal(crossBand(15), "high");
});

test("fxCrossSummary：EUR/GBP 综合视图", () => {
  const r = fxCrossSummary(FXCROSS_PRESETS.eurGbp);
  assert.ok(r.valid);
  approx(r.crossRate, 1.085 / 1.27);
  approx(r.converted, 1000 * (1.085 / 1.27));
  approx(r.pipValue, 10 / (1.085 / 1.27));
  assert.ok(r.band === "moderate" || r.band === "high");
});

test("fxCrossSummary：USD/JPY 高值 → high", () => {
  const r = fxCrossSummary(FXCROSS_PRESETS.eurJpy);
  assert.ok(r.valid);
  approx(r.crossRate, 1.05);
  assert.equal(r.band, "high");
});

test("fxCrossSummary：AUD/USD 低值 → low", () => {
  const r = fxCrossSummary(FXCROSS_PRESETS.audUsd);
  assert.ok(r.valid);
  approx(r.crossRate, 0.65 / 0.52);
  assert.equal(r.band, "low");
});

test("fxCrossSummary：非法输入 → 无效", () => {
  assert.equal(fxCrossSummary({ rateAB: 0, rateBC: 1.27 }).valid, false);
  assert.equal(fxCrossSummary({ rateAB: 1.085, rateBC: 0 }).valid, false);
  assert.equal(fxCrossSummary({ rateAB: 1.085, rateBC: 1.27, pipSize: 0 }).valid, false);
  assert.equal(fxCrossSummary({ rateAB: 1.085, rateBC: 1.27, notional: 0 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(FXCROSS_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = FXCROSS_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.rateAB) && p.rateAB > 0);
    assert.ok(Number.isFinite(p.rateBC) && p.rateBC > 0);
    assert.ok(fxCrossSummary(p).valid);
  }
  assert.equal(fxCrossSummary(FXCROSS_PRESETS.eurJpy).band, "high");
  assert.equal(fxCrossSummary(FXCROSS_PRESETS.audUsd).band, "low");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
