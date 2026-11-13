// tests/lotSize.test.mjs — lib/lotSize.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  notional, riskPerLot, unitsFromRisk, riskFromUnits,
  marginRequired, accountExposure, lotSizeBand, lotSizeSummary,
  LOT_SIZE_PRESETS,
} from "../lib/lotSize.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("notional：10 × 100 × 1 = 1000", () => {
  approx(notional(10, 100, 1), 1000);
  approx(notional(10, 100, 10), 10000);
  assert.equal(notional(0, 100, 1), 0);
});

test("riskPerLot：|100−95| × 1 = 5", () => {
  approx(riskPerLot(100, 95, 1), 5);
  approx(riskPerLot(10000, 9900, 10), 1000);
  assert.equal(riskPerLot(100, 100, 1), 0);
});

test("unitsFromRisk：1000 / 5 = 200", () => {
  approx(unitsFromRisk(1000, 100, 95, 1), 200);
  approx(unitsFromRisk(1000, 10000, 9900, 10), 1);
  assert.equal(unitsFromRisk(1000, 100, 100, 1), 0);
});

test("riskFromUnits：200 × 5 = 1000", () => {
  approx(riskFromUnits(200, 100, 95, 1), 1000);
  assert.equal(riskFromUnits(0, 100, 95, 1), 0);
});

test("marginRequired：10000 / 10 = 1000", () => {
  approx(marginRequired(10000, 10), 1000);
  assert.equal(marginRequired(10000, 0), 0);
});

test("accountExposure：10000 / 100000 = 0.1", () => {
  approx(accountExposure(10000, 100000), 0.1);
  assert.equal(accountExposure(10000, 0), 0);
});

test("lotSizeBand：分级", () => {
  assert.equal(lotSizeBand(0), "none");
  assert.equal(lotSizeBand(0.1), "light");
  assert.equal(lotSizeBand(0.3), "moderate");
  assert.equal(lotSizeBand(0.7), "heavy");
  assert.equal(lotSizeBand(1.5), "over-leveraged");
  assert.equal(lotSizeBand(NaN), "invalid");
});

test("lotSizeSummary：股票 1%", () => {
  const r = lotSizeSummary({ account: 100000, riskPct: 0.01, price: 100, stop: 95, multiplier: 1, leverage: 1 });
  assert.ok(r.valid);
  approx(r.riskAmount, 1000);
  approx(r.riskPerLot, 5);
  approx(r.units, 200);
  approx(r.notional, 20000);
  approx(r.margin, 20000);
  approx(r.exposure, 0.2);
  assert.equal(r.band, "light");
});

test("lotSizeSummary：riskPct=0 → 无效", () => {
  assert.equal(lotSizeSummary({ account: 100000, riskPct: 0, price: 100, stop: 95 }).valid, false);
});

test("LOT_SIZE_PRESETS：5 个场景", () => {
  const keys = Object.keys(LOT_SIZE_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = LOT_SIZE_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.account) && p.account > 0);
    assert.ok(Number.isFinite(p.price) && p.price > 0);
    assert.ok(p.leverage > 0);
  }
});