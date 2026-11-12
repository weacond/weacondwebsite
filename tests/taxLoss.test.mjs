// tests/taxLoss.test.mjs — lib/taxLoss.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  effectiveOffset, taxSavings, afterTaxCost, carryforwardYears,
  savingsBand, harvestSummary, HARVEST_PRESETS, num,
} from "../lib/taxLoss.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("effectiveOffset：min(亏损, 上限)，cap≤0 视为无限", () => {
  approx(effectiveOffset(10000, 3000), 3000);
  approx(effectiveOffset(2000, 3000), 2000);
  approx(effectiveOffset(10000, 0), 10000); // 无限
  approx(effectiveOffset(10000, -5), 10000); // 负数视为无限
});

test("taxSavings：可抵免 × 税率", () => {
  approx(taxSavings(10000, 0.3, 3000), 900);
  approx(taxSavings(10000, 0.3, 0), 3000);
  approx(taxSavings(5000, 0, 3000), 0);
});

test("afterTaxCost：亏损 − 当年节省", () => {
  approx(afterTaxCost(10000, 0.3, 3000), 9100);
  approx(afterTaxCost(10000, 0.3, 0), 7000);
});

test("carryforwardYears：结转所需年数", () => {
  assert.equal(carryforwardYears(10000, 3000), 4); // ceil(3.33)
  assert.equal(carryforwardYears(2000, 3000), 1);
  assert.equal(carryforwardYears(10000, 0), 1);    // 无限，当年结清
  assert.equal(carryforwardYears(0, 3000), 0);      // 无亏损
  assert.equal(carryforwardYears(50000, 3000), 17);
});

test("savingsBand：相对分级", () => {
  assert.equal(savingsBand(0, 0), "na");
  assert.equal(savingsBand(5000, 0), "none");
  assert.equal(savingsBand(10000, 900), "low");     // 0.09
  assert.equal(savingsBand(2000, 400), "moderate");  // 0.2
  assert.equal(savingsBand(10000, 3000), "high");    // 0.3
});

test("harvestSummary：受限抵免", () => {
  const r = harvestSummary(HARVEST_PRESETS.capped);
  assert.ok(r.valid);
  approx(r.effectiveOffset, 3000);
  approx(r.taxSavings, 900);
  approx(r.afterTaxCost, 9100);
  assert.equal(r.carryforwardYears, 4);
  assert.equal(r.band, "low");
});

test("harvestSummary：无限抵免", () => {
  const r = harvestSummary(HARVEST_PRESETS.unlimited);
  assert.ok(r.valid);
  approx(r.taxSavings, 3500);
  assert.equal(r.carryforwardYears, 1);
  assert.equal(r.band, "high");
});

test("harvestSummary：免税 → 零节省", () => {
  const r = harvestSummary(HARVEST_PRESETS.noTax);
  assert.ok(r.valid);
  approx(r.taxSavings, 0);
  assert.equal(r.band, "none");
});

test("harvestSummary：亏损 ≤ 0 → 无效", () => {
  assert.equal(harvestSummary({ loss: 0, taxRate: 0.3, cap: 3000 }).valid, false);
  assert.equal(harvestSummary({ loss: -100, taxRate: 0.3, cap: 3000 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(HARVEST_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = HARVEST_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.loss) && p.loss > 0);
    assert.ok(harvestSummary(p).valid);
  }
  assert.equal(harvestSummary(HARVEST_PRESETS.smallLoss).band, "moderate");
  assert.equal(harvestSummary(HARVEST_PRESETS.capped).carryforwardYears, 4);
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});