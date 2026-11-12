// tests/portfolioBeta.test.mjs — lib/portfolioBeta.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  weightedBeta, systematicReturn, residualVol,
  betaBand, betaSummary, BETA_PRESETS, num,
} from "../lib/portfolioBeta.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("weightedBeta：Σ wᵢ·βᵢ", () => {
  approx(weightedBeta([0.3, 0.7], [1.2, 0.8]), 0.36 + 0.56); // 0.92
  approx(weightedBeta([1], [1.0]), 1.0);
  approx(weightedBeta([], []), 0); // 空数组 → 0
  approx(weightedBeta([0.5, 0.5], [2.0]), 0); // 长度不匹配 → 0
});

test("systematicReturn：beta × marketReturn", () => {
  approx(systematicReturn(1.5, 0.1), 0.15);
  approx(systematicReturn(0.5, 0.1), 0.05);
  approx(systematicReturn(1.0, 0), 0);
});

test("residualVol：√(max(0, σ_p² − (β·σ_m)²))", () => {
  // σ_p = 0.2, β = 1, σ_m = 0.15 → residual = sqrt(0.04 - 0.0225) = sqrt(0.0175)
  approx(residualVol(0.2, 1.0, 0.15), Math.sqrt(0.04 - 0.0225));
  // σ_p = 0.15, β = 1, σ_m = 0.15 → residual = 0
  approx(residualVol(0.15, 1.0, 0.15), 0);
  // σ_p < β·σ_m → max(0, ...) = 0
  approx(residualVol(0.05, 1.0, 0.15), 0);
});

test("betaBand：分级", () => {
  assert.equal(betaBand(0.3), "defensive");
  assert.equal(betaBand(0.7), "low");
  assert.equal(betaBand(1.0), "market");
  assert.equal(betaBand(1.5), "aggressive");
  assert.equal(betaBand(NaN), "defensive"); // NaN → 0 → defensive
});

test("betaSummary：防御组合 → defensive", () => {
  const r = betaSummary(BETA_PRESETS.defensive);
  assert.ok(r.valid);
  // weights [0.5, 0.3, 0.2], betas [0.6, 0.8, 1.0]
  // normalized: same (sum=1.0)
  // beta = 0.5×0.6 + 0.3×0.8 + 0.2×1.0 = 0.3 + 0.24 + 0.2 = 0.74
  approx(r.beta, 0.74, 1e-9);
  assert.equal(r.band, "low"); // 0.74 is in [0.5, 0.8)
});

test("betaSummary：激进组合 → aggressive", () => {
  const r = betaSummary(BETA_PRESETS.aggressive);
  assert.ok(r.valid);
  // weights [0.3, 0.4, 0.3], betas [1.5, 1.8, 1.2]
  // beta = 0.3×1.5 + 0.4×1.8 + 0.3×1.2 = 0.45 + 0.72 + 0.36 = 1.53
  approx(r.beta, 1.53, 1e-9);
  assert.equal(r.band, "aggressive");
});

test("betaSummary：市场组合 → market", () => {
  const r = betaSummary(BETA_PRESETS.market);
  assert.ok(r.valid);
  approx(r.beta, 1.0);
  assert.equal(r.band, "market");
});

test("betaSummary：非法输入 → 无效", () => {
  assert.equal(betaSummary({ weights: [], betas: [] }).valid, false);
  assert.equal(betaSummary({ weights: [0.5, 0.5], betas: [1.0] }).valid, false); // 长度不匹配
  assert.equal(betaSummary({ weights: [-0.5, 0.5], betas: [1.0, 1.0] }).valid, false); // 负权重
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(BETA_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = BETA_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Array.isArray(p.weights) && p.weights.length > 0);
    assert.ok(betaSummary(p).valid);
  }
  assert.equal(betaSummary(BETA_PRESETS.defensive).band, "low");
  assert.equal(betaSummary(BETA_PRESETS.aggressive).band, "aggressive");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
