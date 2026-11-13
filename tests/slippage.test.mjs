// tests/slippage.test.mjs — lib/slippage.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  roundTripSlippage, roundTripCost, costPctOfNotional,
  netReturn, slippageBand, slippageSummary, SLIPPAGE_PRESETS,
} from "../lib/slippage.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("roundTripSlippage：0.01 × 2 = 0.02", () => {
  approx(roundTripSlippage(0.01), 0.02);
  assert.equal(roundTripSlippage(0), 0);
});

test("roundTripCost：0.02 + 2×0.01 = 0.04", () => {
  approx(roundTripCost(0.02, 0.01), 0.04);
  approx(roundTripCost(0, 0), 0);
});

test("costPctOfNotional：0.04 / 100 = 0.0004", () => {
  approx(costPctOfNotional(0.04, 100), 0.0004);
  assert.equal(costPctOfNotional(0.04, 0), 0);
});

test("netReturn：0.05 − 0.0004 = 0.0496", () => {
  approx(netReturn(0.05, 0.0004), 0.0496);
  assert.equal(netReturn(0.05, NaN), 0.05);
});

test("slippageBand：分级", () => {
  assert.equal(slippageBand(0), "zero");
  assert.equal(slippageBand(0.0004), "low");
  assert.equal(slippageBand(0.003), "moderate");
  assert.equal(slippageBand(0.008), "high");
  assert.equal(slippageBand(0.02), "very-high");
  assert.equal(slippageBand(NaN), "invalid");
});

test("slippageSummary：高流动性股票", () => {
  const r = slippageSummary({ price: 100, spread: 0.02, slippage: 0.01, grossReturn: 0.05 });
  assert.ok(r.valid);
  approx(r.roundTripCost, 0.04);
  approx(r.costPct, 0.0004);
  approx(r.netReturn, 0.0496);
  assert.equal(r.band, "low");
});

test("slippageSummary：低流动性高成本", () => {
  const r = slippageSummary({ price: 50, spread: 0.5, slippage: 0.2, grossReturn: 0.05 });
  assert.ok(r.valid);
  approx(r.roundTripCost, 0.9);
  approx(r.costPct, 0.018);
  assert.equal(r.band, "very-high");
});

test("SLIPPAGE_PRESETS：5 个场景", () => {
  const keys = Object.keys(SLIPPAGE_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = SLIPPAGE_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.price) && p.price > 0);
    assert.ok(p.spread >= 0 && p.slippage >= 0);
  }
});