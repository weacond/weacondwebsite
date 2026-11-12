// tests/riskBudget.test.mjs — lib/riskBudget.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  riskAmount, maxUnits, positionNotional, positionPct,
  perStrategyRisk, riskBudgetBand, riskBudgetSummary, RISK_BUDGET_PRESETS,
} from "../lib/riskBudget.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("riskAmount：100000 × 0.01 = 1000", () => {
  approx(riskAmount(100000, 0.01), 1000);
  assert.equal(riskAmount(100000, 0), 0);
  assert.equal(riskAmount(100000, -0.01), 0);
});

test("maxUnits：1000 / 10 = 100", () => {
  approx(maxUnits(1000, 10), 100);
  assert.equal(maxUnits(1000, 0), 0);
  assert.equal(maxUnits(1000, -1), 0);
});

test("positionNotional：100 × 100 = 10000", () => {
  approx(positionNotional(100, 100), 10000);
  assert.equal(positionNotional(0, 100), 0);
});

test("positionPct：10000 / 100000 = 0.1", () => {
  approx(positionPct(10000, 100000), 0.1);
  assert.equal(positionPct(10000, 0), 0);
});

test("perStrategyRisk：1000 / 4 = 250", () => {
  approx(perStrategyRisk(1000, 4), 250);
  assert.equal(perStrategyRisk(1000, 0), 0);
  assert.equal(perStrategyRisk(1000, -1), 0);
});

test("riskBudgetBand：分级", () => {
  assert.equal(riskBudgetBand(0), "zero");
  assert.equal(riskBudgetBand(0.005), "conservative");
  assert.equal(riskBudgetBand(0.01), "moderate");
  assert.equal(riskBudgetBand(0.03), "aggressive");
  assert.equal(riskBudgetBand(0.10), "over-leveraged");
  assert.equal(riskBudgetBand(NaN), "invalid");
});

test("riskBudgetSummary：100000, 1%, VaR=10, price=100", () => {
  const r = riskBudgetSummary({ account: 100000, riskPct: 0.01, varPerUnit: 10, price: 100 });
  assert.ok(r.valid);
  approx(r.riskAmount, 1000);
  approx(r.units, 100);
  approx(r.notional, 10000);
  approx(r.positionPct, 0.1);
  assert.equal(r.band, "moderate");
  assert.equal(r.perStrategy, null); // numStrategies not set
});

test("riskBudgetSummary：多策略", () => {
  const r = riskBudgetSummary({ account: 100000, riskPct: 0.01, varPerUnit: 5, price: 50, numStrategies: 4 });
  assert.ok(r.valid);
  approx(r.perStrategy, 250);
});

test("riskBudgetSummary：riskPct=0 → 无效", () => {
  assert.equal(riskBudgetSummary({ account: 100000, riskPct: 0, varPerUnit: 10 }).valid, false);
});

test("RISK_BUDGET_PRESETS：5 个场景", () => {
  const keys = Object.keys(RISK_BUDGET_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = RISK_BUDGET_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.account) && p.account > 0);
    assert.ok(Number.isFinite(p.riskPct) && p.riskPct > 0);
  }
});