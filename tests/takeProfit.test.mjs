// tests/takeProfit.test.mjs — lib/takeProfit.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  riskPerUnit, takeProfitPrice, rewardPerUnit, rrRatio,
  tpReturnPct, takeProfitBand, takeProfitSummary, TAKE_PROFIT_PRESETS,
} from "../lib/takeProfit.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("riskPerUnit：|100−95| = 5", () => {
  approx(riskPerUnit(100, 95), 5);
  approx(riskPerUnit(100, 105), 5);
  assert.equal(riskPerUnit(100, 100), 0);
});

test("takeProfitPrice：多头 100+2×5=110；空头 100−2×5=90", () => {
  approx(takeProfitPrice(100, 95, 2, "long"), 110);
  approx(takeProfitPrice(100, 105, 2, "short"), 90);
  assert.equal(takeProfitPrice(100, 100, 2, "long"), 0);
});

test("rewardPerUnit：2 × 5 = 10", () => {
  approx(rewardPerUnit(2, 5), 10);
  assert.equal(rewardPerUnit(2, 0), 0);
});

test("rrRatio：|110−100|/5 = 2", () => {
  approx(rrRatio(100, 95, 110, "long"), 2);
  approx(rrRatio(100, 105, 90, "short"), 2);
  assert.equal(rrRatio(100, 100, 110, "long"), 0);
});

test("tpReturnPct：10/100 = 0.1", () => {
  approx(tpReturnPct(100, 95, 2, "long"), 0.1);
  assert.equal(tpReturnPct(0, 95, 2, "long"), 0);
});

test("takeProfitBand：分级", () => {
  assert.equal(takeProfitBand(0), "zero");
  assert.equal(takeProfitBand(0.5), "poor");
  assert.equal(takeProfitBand(1.5), "fair");
  assert.equal(takeProfitBand(2.5), "good");
  assert.equal(takeProfitBand(4), "excellent");
  assert.equal(takeProfitBand(NaN), "invalid");
});

test("takeProfitSummary：多头 100/95/2", () => {
  const r = takeProfitSummary({ entry: 100, stop: 95, targetR: 2, side: "long" });
  assert.ok(r.valid);
  approx(r.riskPerUnit, 5);
  approx(r.takeProfit, 110);
  approx(r.rewardPerUnit, 10);
  approx(r.rrRatio, 2);
  approx(r.tpReturnPct, 0.1);
  assert.equal(r.band, "good");
});

test("takeProfitSummary：stop=entry → 无效", () => {
  assert.equal(takeProfitSummary({ entry: 100, stop: 100, targetR: 2 }).valid, false);
});

test("takeProfitSummary：空头 100/105/2", () => {
  const r = takeProfitSummary({ entry: 100, stop: 105, targetR: 2, side: "short" });
  assert.ok(r.valid);
  approx(r.riskPerUnit, 5);
  approx(r.takeProfit, 90);
  approx(r.rewardPerUnit, 10);
  approx(r.rrRatio, 2);
  assert.equal(r.band, "good");
});

test("TAKE_PROFIT_PRESETS：5 个场景", () => {
  const keys = Object.keys(TAKE_PROFIT_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = TAKE_PROFIT_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.entry) && p.entry > 0);
    assert.ok(p.targetR > 0);
    assert.ok(p.side === "long" || p.side === "short");
  }
});