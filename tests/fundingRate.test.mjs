// tests/fundingRate.test.mjs — lib/fundingRate.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fundingCost, fundingCostFraction, annualizedFunding,
  fundingBand, fundingSummary, FUNDING_PRESETS,
  DEFAULT_PERIODS_PER_DAY, DEFAULT_PERIODS_PER_YEAR,
} from "../lib/fundingRate.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("fundingCost：10万 × 0.01% × 21期 = 210", () => {
  approx(fundingCost(100000, 0.0001, 21), 210);
});

test("fundingCost：费率/期数非有限 → 0；费率可负（收资金费）", () => {
  assert.equal(fundingCost(100000, NaN, 1), 0);
  approx(fundingCost(100000, -0.0001, 30), -300);
});

test("fundingCostFraction：0.0001 × 21 = 0.0021", () => {
  approx(fundingCostFraction(0.0001, 21), 0.0021);
});

test("annualizedFunding：0.0001 × 1095 = 0.1095；默认 1095", () => {
  approx(annualizedFunding(0.0001, DEFAULT_PERIODS_PER_YEAR), 0.1095);
  approx(annualizedFunding(0.0001), 0.1095);
  assert.equal(DEFAULT_PERIODS_PER_DAY, 3);
  assert.equal(DEFAULT_PERIODS_PER_YEAR, 1095);
});

test("fundingBand：按年化绝对值分级", () => {
  assert.equal(fundingBand(0), "none");
  assert.equal(fundingBand(0.01), "low");
  assert.equal(fundingBand(0.03), "moderate");
  assert.equal(fundingBand(0.07), "high");
  assert.equal(fundingBand(0.15), "very-high");
  assert.equal(fundingBand(NaN), "invalid");
});

test("fundingSummary：10万 · 0.01%/8h · 7天 → 成本 210、年化 0.1095", () => {
  const r = fundingSummary({ notional: 100000, fundingRatePct: 0.01, days: 7 });
  assert.ok(r.valid);
  approx(r.perPeriod, 0.0001);
  assert.equal(r.periods, 21);
  approx(r.totalCost, 210);
  approx(r.costFraction, 0.0021);
  approx(r.annualized, 0.1095);
  assert.equal(r.band, "very-high");
});

test("fundingSummary：负费率 → 成本为负（收资金费）", () => {
  const r = fundingSummary({ notional: 100000, fundingRatePct: -0.01, days: 30 });
  assert.ok(r.valid);
  assert.ok(r.totalCost < 0, `负费率成本应为负, got ${r.totalCost}`);
});

test("fundingSummary：天数为负 → 无效", () => {
  const r = fundingSummary({ notional: 100000, fundingRatePct: 0.01, days: -1 });
  assert.equal(r.valid, false);
  assert.equal(r.totalCost, 0);
});

test("FUNDING_PRESETS：5 个场景，字段完整", () => {
  const keys = Object.keys(FUNDING_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = FUNDING_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.notional));
    assert.ok(Number.isFinite(p.fundingRatePct));
    assert.ok(Number.isFinite(p.days));
  }
});