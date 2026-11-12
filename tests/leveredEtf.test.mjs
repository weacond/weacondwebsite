// tests/leveredEtf.test.mjs — lib/leveredEtf.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  leveredAnnualReturn, leverageDecay, underlyingFuture, leveredFuture,
  decayBand, leveredEtfSummary, LEVERED_PRESETS, num,
} from "../lib/leveredEtf.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("leveredAnnualReturn：L·μ − ½·L·(L−1)·σ²", () => {
  approx(leveredAnnualReturn(2, 0, 0.2), -0.04);      // 2x 平盘损耗 4%
  approx(leveredAnnualReturn(3, 0.1, 0.2), 0.18);      // 3x, μ=10% → 18%
  approx(leveredAnnualReturn(1, 0.1, 0.2), 0.1);       // 1x 无衰减
  approx(leveredAnnualReturn(2, 0.1, 0.2), 0.16);
});

test("leverageDecay：½·L·(L−1)·σ²，恒 ≥ 0", () => {
  approx(leverageDecay(2, 0.2), 0.04);
  approx(leverageDecay(1, 0.2), 0);   // 1x 无衰减
  approx(leverageDecay(2, 0), 0);     // 无波动无衰减
  approx(leverageDecay(-1, 0.2), 0.04); // 反向杠杆同样有衰减
  assert.ok(leverageDecay(3, 0.25) >= 0);
});

test("underlyingFuture：本金·(1+μ)^N", () => {
  approx(underlyingFuture(10000, 0.08, 5), 10000 * Math.pow(1.08, 5));
  approx(underlyingFuture(10000, 0, 5), 10000);
});

test("leveredFuture：本金·(1+杠杆年化)^N", () => {
  approx(leveredFuture(10000, 0, 0.2, 2, 5), 10000 * Math.pow(1 - 0.04, 5));
  approx(leveredFuture(10000, 0.08, 0.2, 2, 5), 10000 * Math.pow(1.12, 5));
});

test("decayBand：分级", () => {
  assert.equal(decayBand(NaN), "na");
  assert.equal(decayBand(0), "none");
  assert.equal(decayBand(0.01), "low");
  assert.equal(decayBand(0.04), "moderate");
  assert.equal(decayBand(0.12), "extreme");
});

test("leveredEtfSummary：2x 长仓综合视图", () => {
  const r = leveredEtfSummary(LEVERED_PRESETS.twoX);
  assert.ok(r.valid);
  approx(r.leveredReturn, 0.12);
  approx(r.decay, 0.04);
  assert.equal(r.band, "moderate");
  approx(r.underlyingFuture, 10000 * Math.pow(1.08, 5));
  approx(r.leveredFuture, 10000 * Math.pow(1.12, 5));
});

test("leveredEtfSummary：高波动 3x → 极端衰减", () => {
  const r = leveredEtfSummary(LEVERED_PRESETS.volatile);
  assert.ok(r.valid);
  assert.equal(r.band, "extreme");
  assert.ok(r.leveredFuture < r.underlyingFuture); // 衰减导致落后
});

test("leveredEtfSummary：本金 ≤ 0 → 无效", () => {
  assert.equal(leveredEtfSummary({ leverage: 2, mu: 0, sigma: 0.2, years: 5, principal: 0 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(LEVERED_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = LEVERED_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.principal) && p.principal > 0);
    assert.ok(leveredEtfSummary(p).valid);
  }
  assert.equal(leveredEtfSummary(LEVERED_PRESETS.calm).band, "low");
  assert.equal(leveredEtfSummary(LEVERED_PRESETS.shortX).band, "moderate");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});