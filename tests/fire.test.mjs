// tests/fire.test.mjs — lib/fire.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fireTarget, annualSavings, yearsToFire,
  fireBand, fireSummary, FIRE_PRESETS,
} from "../lib/fire.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("fireTarget：40000 / 0.04 = 1000000", () => {
  approx(fireTarget(40000, 0.04), 1000000);
  assert.equal(fireTarget(40000, 0), 0);
});

test("annualSavings：0.4 × 40000 = 16000", () => {
  approx(annualSavings(40000, 0.4), 16000);
});

test("yearsToFire：快速场景 ≈ 19.09", () => {
  approx(yearsToFire(200000, 40000, 0.4, 0.05, 0.04), 19.093156, 1e-3);
});

test("yearsToFire：已达标 → 0", () => {
  assert.equal(yearsToFire(2000000, 40000, 0.1, 0.05, 0.04), 0);
});

test("yearsToFire：g=0 线性 → 93.33", () => {
  approx(yearsToFire(100000, 60000, 0.25, 0, 0.04), 1400000 / 15000, 1e-6);
});

test("yearsToFire：无储蓄无增长 → null", () => {
  assert.equal(yearsToFire(1000, 60000, 0, 0, 0.04), null);
});

test("fireBand：分级", () => {
  assert.equal(fireBand(-1), "now");
  assert.equal(fireBand(5), "near");
  assert.equal(fireBand(15), "moderate");
  assert.equal(fireBand(25), "far");
  assert.equal(fireBand(40), "very-far");
  assert.equal(fireBand(NaN), "invalid");
});

test("fireSummary：快速场景 → moderate", () => {
  const r = fireSummary({ annualExpense: 40000, safeWithdrawalRate: 0.04, currentSavings: 200000, savingsRate: 0.4, realGrowth: 0.05 });
  assert.ok(r.valid);
  approx(r.fireTarget, 1000000);
  approx(r.annualSavings, 16000);
  approx(r.years, 19.093156, 1e-3);
  assert.equal(r.band, "moderate");
});

test("fireSummary：swr=0 → 无效", () => {
  const r = fireSummary({ annualExpense: 40000, safeWithdrawalRate: 0, currentSavings: 200000, savingsRate: 0.4, realGrowth: 0.05 });
  assert.equal(r.valid, false);
});

test("FIRE_PRESETS：5 个场景", () => {
  const keys = Object.keys(FIRE_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = FIRE_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.annualExpense) && p.annualExpense > 0);
    assert.ok(p.safeWithdrawalRate > 0);
  }
});