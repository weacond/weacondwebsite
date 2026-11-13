// tests/inflationGoal.test.mjs — lib/inflationGoal.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nominalFutureValue, realFutureValue, requiredMonthly,
  inflationBand, inflationGoalSummary, INFLATION_GOAL_PRESETS,
} from "../lib/inflationGoal.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("nominalFutureValue：本金+月投复利 > 本金", () => {
  const fv = nominalFutureValue(100000, 1000, 0.07, 30);
  assert.ok(fv > 100000);
  assert.ok(fv > 1900000); // 合理量级
  approx(nominalFutureValue(100000, 0, 0.07, 30), 100000 * Math.pow(1.07, 30), 1);
});

test("realFutureValue：100000 / 1.025^30", () => {
  approx(realFutureValue(100000, 0.025, 30), 100000 / Math.pow(1.025, 30));
  assert.ok(realFutureValue(100000, 0.05, 30) < realFutureValue(100000, 0.02, 30));
  assert.equal(realFutureValue(100000, -1, 30), 0);
});

test("requiredMonthly：达成实际目标需正月投", () => {
  const m = requiredMonthly(100000, 0.07, 0.025, 30, 1000000);
  assert.ok(m > 0);
  assert.equal(requiredMonthly(100000, 0.07, 0.025, 0, 1000000), 0);
  assert.equal(requiredMonthly(100000, 0.07, -1, 30, 1000000), 0);
});

test("inflationBand：分级", () => {
  assert.equal(inflationBand(-0.01), "deflation");
  assert.equal(inflationBand(0.01), "low");
  assert.equal(inflationBand(0.03), "moderate");
  assert.equal(inflationBand(0.06), "high");
  assert.equal(inflationBand(0.1), "very-high");
  assert.equal(inflationBand(NaN), "invalid");
});

test("inflationGoalSummary：退休低通胀", () => {
  const r = inflationGoalSummary({ principal: 100000, monthly: 1000, annualRate: 0.07, inflation: 0.025, years: 30, realGoal: 1000000 });
  assert.ok(r.valid);
  assert.ok(r.nominalFV > 100000);
  assert.ok(r.realFV < r.nominalFV);
  assert.equal(r.inflationBand, "moderate");
  assert.ok(r.requiredMonthly > 0);
});

test("inflationGoalSummary：inflation=-1 → 无效", () => {
  assert.equal(inflationGoalSummary({ principal: 100000, monthly: 1000, annualRate: 0.07, inflation: -1, years: 30 }).valid, false);
});

test("INFLATION_GOAL_PRESETS：5 个场景", () => {
  const keys = Object.keys(INFLATION_GOAL_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = INFLATION_GOAL_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.principal) && p.principal >= 0);
    assert.ok(p.years > 0);
    assert.ok(p.inflation > -1);
  }
});