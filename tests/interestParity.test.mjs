// tests/interestParity.test.mjs — lib/interestParity.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  forwardRate, forwardPremium, impliedDomesticRate,
  parityMispricing, parityBand, interestParitySummary, INTEREST_PARITY_PRESETS,
} from "../lib/interestParity.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("forwardRate：S=1, r_d=5%, r_f=1%, t=1 → 1.05/1.01", () => {
  approx(forwardRate(1, 0.05, 0.01, 1), 1.05 / 1.01);
});

test("forwardRate：t=0 → 等于即期；本币利率=-1 → 0", () => {
  approx(forwardRate(1.5, 0.05, 0.01, 0), 1.5);
  assert.equal(forwardRate(1, -1, 0.01, 1), 0);
});

test("forwardPremium：5% vs 1%, t=1 → 升水 0.0396", () => {
  approx(forwardPremium(0.05, 0.01, 1), 1.05 / 1.01 - 1);
});

test("forwardPremium：利率相等 → 0", () => {
  approx(forwardPremium(0.03, 0.03, 2), 0);
});

test("impliedDomesticRate：由远期反推本币利率可复原", () => {
  const F = forwardRate(1, 0.05, 0.01, 1);
  approx(impliedDomesticRate(1, F, 0.01, 1), 0.05);
});

test("impliedDomesticRate：即期≤0 → null", () => {
  assert.equal(impliedDomesticRate(0, 1.05, 0.01, 1), null);
});

test("parityMispricing：市场/理论 − 1；理论=0 → 0", () => {
  approx(parityMispricing(1.04, 1.05), 1.05 / 1.04 - 1);
  assert.equal(parityMispricing(0, 1.05), 0);
});

test("parityBand：按升贴水绝对值分级", () => {
  assert.equal(parityBand(0), "flat");
  assert.equal(parityBand(0.01), "small");
  assert.equal(parityBand(0.03), "moderate");
  assert.equal(parityBand(0.1), "large");
  assert.equal(parityBand(NaN), "invalid");
});

test("interestParitySummary：本币5% 外币1% 1y → 远期≈1.0396", () => {
  const r = interestParitySummary({ spot: 1, domRatePct: 5, forRatePct: 1, years: 1 });
  assert.ok(r.valid);
  approx(r.forward, 1.05 / 1.01);
  approx(r.premium, 1.05 / 1.01 - 1);
  assert.equal(r.band, "moderate");
});

test("interestParitySummary：含市场远期 → 计算基差", () => {
  const r = interestParitySummary({ spot: 1, domRatePct: 5, forRatePct: 1, years: 1, marketForward: 1.05 });
  assert.ok(r.valid);
  approx(r.mispricing, 1.05 / (1.05 / 1.01) - 1);
});

test("interestParitySummary：即期≤0 → 无效", () => {
  const r = interestParitySummary({ spot: 0, domRatePct: 5, forRatePct: 1, years: 1 });
  assert.equal(r.valid, false);
});

test("INTEREST_PARITY_PRESETS：5 个场景，字段完整", () => {
  const keys = Object.keys(INTEREST_PARITY_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = INTEREST_PARITY_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.spot) && p.spot > 0);
    assert.ok(Number.isFinite(p.domRatePct));
    assert.ok(Number.isFinite(p.forRatePct));
    assert.ok(Number.isFinite(p.years) && p.years >= 0);
  }
});