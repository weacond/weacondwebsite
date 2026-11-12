// tests/probReturn.test.mjs — lib/probReturn.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  weightedReturn, variance, stdDev, coefficientOfVariation,
  probReturnBand, probReturnSummary, PROB_RETURN_PRESETS,
} from "../lib/probReturn.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("weightedReturn：Σ(p_i × x_i)", () => {
  approx(weightedReturn([0.6, 0.4], [1, -1]), 0.2);
  approx(weightedReturn([0.5, 0.5], [0, 0]), 0);
  approx(weightedReturn([1], [100]), 100);
  approx(weightedReturn([], []), 0);
});

test("variance：Σ(p_i × (x_i − mean)²)", () => {
  // 0.6×(1−0.2)² + 0.4×(−1−0.2)² = 0.6×0.64 + 0.4×1.44 = 0.96
  approx(variance([0.6, 0.4], [1, -1]), 0.96);
  approx(variance([1], [100]), 0); // 单点 → 0 方差
  approx(variance([], []), 0);
});

test("stdDev：√variance", () => {
  approx(stdDev([0.6, 0.4], [1, -1]), Math.sqrt(0.96));
  approx(stdDev([1], [100]), 0);
});

test("coefficientOfVariation：σ / |E[X]|", () => {
  const cv = coefficientOfVariation([0.6, 0.4], [1, -1]);
  approx(cv, Math.sqrt(0.96) / 0.2);
  // E[X] = 0 → CV = 0
  approx(coefficientOfVariation([0.5, 0.5], [1, -1]), 0);
});

test("probReturnBand：按期望回报", () => {
  assert.equal(probReturnBand(0), "negative");
  assert.equal(probReturnBand(-0.1), "negative");
  assert.equal(probReturnBand(0.01), "low");
  assert.equal(probReturnBand(0.03), "moderate");
  assert.equal(probReturnBand(0.07), "good");
  assert.equal(probReturnBand(0.15), "excellent");
  assert.equal(probReturnBand(NaN), "invalid");
});

test("probReturnSummary：二元 60/40 → expected=0.2", () => {
  const r = probReturnSummary(PROB_RETURN_PRESETS.binary);
  assert.ok(r.valid);
  approx(r.expected, 0.2);
  approx(r.variance, 0.96);
  approx(r.stdDev, Math.sqrt(0.96));
  assert.equal(r.band, "excellent"); // 0.2 > 0.10 → excellent
});

test("probReturnSummary：概率和 ≠ 1 → 无效", () => {
  assert.equal(probReturnSummary({ probs: [0.5, 0.3], outcomes: [1, -1] }).valid, false);
});

test("probReturnSummary：数组长度不匹配 → 无效", () => {
  assert.equal(probReturnSummary({ probs: [0.5, 0.5], outcomes: [1] }).valid, false);
});

test("probReturnSummary：少于 2 个结果 → 无效", () => {
  assert.equal(probReturnSummary({ probs: [1], outcomes: [100] }).valid, false);
});

test("预设：5 个场景", () => {
  const keys = Object.keys(PROB_RETURN_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = PROB_RETURN_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Array.isArray(p.probs) && Array.isArray(p.outcomes));
    assert.equal(p.probs.length, p.outcomes.length);
  }
});