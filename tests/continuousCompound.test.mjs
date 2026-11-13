// tests/continuousCompound.test.mjs — lib/continuousCompound.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  continuousMultiplier, continuousFV, continuousEAR,
  continuousBand, continuousSummary, CONTINUOUS_PRESETS,
} from "../lib/continuousCompound.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("continuousMultiplier：e^(0.08×20) ≈ 4.953032", () => {
  approx(continuousMultiplier(0.08, 20), Math.exp(1.6), 1e-6);
});

test("continuousFV：10000 × e^1.6 ≈ 49530.32", () => {
  approx(continuousFV(10000, 0.08, 20), 10000 * Math.exp(1.6), 1e-3);
});

test("continuousFV：年数 0 → 本金不变", () => {
  approx(continuousFV(10000, 0.08, 0), 10000);
});

test("continuousEAR：e^0.08 − 1", () => {
  approx(continuousEAR(0.08), Math.exp(0.08) - 1, 1e-6);
});

test("continuousBand：分级", () => {
  assert.equal(continuousBand(1), "flat");
  assert.equal(continuousBand(1.5), "growth");
  assert.equal(continuousBand(3), "strong");
  assert.equal(continuousBand(5), "exponential");
  assert.equal(continuousBand(NaN), "invalid");
});

test("continuousSummary：8%/20y → exponential", () => {
  const r = continuousSummary({ principal: 10000, annualRate: 0.08, years: 20 });
  assert.ok(r.valid);
  approx(r.multiplier, Math.exp(1.6), 1e-6);
  approx(r.futureValue, 10000 * Math.exp(1.6), 1e-3);
  assert.equal(r.band, "exponential");
});

test("continuousSummary：年数 0 → 本金、flat", () => {
  const r = continuousSummary({ principal: 10000, annualRate: 0.08, years: 0 });
  assert.ok(r.valid);
  approx(r.multiplier, 1);
  approx(r.futureValue, 10000);
  assert.equal(r.band, "flat");
});

test("CONTINUOUS_PRESETS：5 个场景", () => {
  const keys = Object.keys(CONTINUOUS_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = CONTINUOUS_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.principal) && p.principal > 0);
    assert.ok(p.annualRate > 0 && p.years > 0);
  }
});