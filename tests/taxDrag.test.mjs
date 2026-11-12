// tests/taxDrag.test.mjs — lib/taxDrag.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  afterTaxRate, nominalFuture, afterTaxFuture, taxDrag,
  dragBand, taxDragSummary, TAXDRAG_PRESETS, num,
} from "../lib/taxDrag.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("afterTaxRate：r·(1−t)", () => {
  approx(afterTaxRate(0.1, 0.15), 0.085);
  approx(afterTaxRate(0.1, 0), 0.1);
  approx(afterTaxRate(0.1, 1), 0); // 全税 → 0
});

test("nominalFuture：P·(1+r)^n", () => {
  approx(nominalFuture(10000, 0.1, 10), 10000 * Math.pow(1.1, 10));
  approx(nominalFuture(10000, 0.1, 0), 10000); // 0 年 → 本金
});

test("afterTaxFuture：P·(1+r')^n", () => {
  approx(afterTaxFuture(10000, 0.1, 0.15, 10), 10000 * Math.pow(1.085, 10));
  approx(afterTaxFuture(10000, 0.1, 0, 10), 10000 * Math.pow(1.1, 10)); // 免税 = 名义
});

test("taxDrag：(名义 − 税后)/名义", () => {
  const nom = 10000 * Math.pow(1.1, 10);
  const aft = 10000 * Math.pow(1.085, 10);
  approx(taxDrag(nom, aft), (nom - aft) / nom);
  approx(taxDrag(nom, nom), 0); // 无税 → 无拖累
  approx(taxDrag(0, 0), 0);     // 名义 ≤0 → 0
});

test("dragBand：分级", () => {
  assert.equal(dragBand(0), "none");
  assert.equal(dragBand(NaN), "none");
  assert.equal(dragBand(0.03), "low");
  assert.equal(dragBand(0.1), "moderate");
  assert.equal(dragBand(0.3), "high");
});

test("taxDragSummary：免税 → 零拖累", () => {
  const r = taxDragSummary(TAXDRAG_PRESETS.noTax);
  assert.ok(r.valid);
  approx(r.afterTaxRate, 0.1);
  approx(r.taxDrag, 0);
  assert.equal(r.band, "none");
});

test("taxDragSummary：中税 15% → 中等拖累", () => {
  const r = taxDragSummary(TAXDRAG_PRESETS.midTax);
  assert.ok(r.valid);
  approx(r.afterTaxRate, 0.085);
  assert.ok(r.taxDrag > 0.05 && r.taxDrag < 0.15);
  assert.equal(r.band, "moderate");
  approx(r.nominalFuture, 10000 * Math.pow(1.1, 10));
  approx(r.afterTaxFuture, 10000 * Math.pow(1.085, 10));
});

test("taxDragSummary：高税 → 高拖累；免税终值 ≥ 有税", () => {
  assert.equal(taxDragSummary(TAXDRAG_PRESETS.highTax).band, "high");
  assert.ok(taxDragSummary(TAXDRAG_PRESETS.noTax).afterTaxFuture >= taxDragSummary(TAXDRAG_PRESETS.highTax).afterTaxFuture);
});

test("taxDragSummary：本金≤0 / 税率越界 → 无效", () => {
  assert.equal(taxDragSummary({ principal: 0, rate: 0.1, taxRate: 0.1, years: 10 }).valid, false);
  assert.equal(taxDragSummary({ principal: 10000, rate: 0.1, taxRate: 1.2, years: 10 }).valid, false);
  assert.equal(taxDragSummary({ principal: 10000, rate: 0.1, taxRate: -0.1, years: 10 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(TAXDRAG_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = TAXDRAG_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.principal) && p.principal > 0);
    assert.ok(taxDragSummary(p).valid);
  }
  assert.equal(taxDragSummary(TAXDRAG_PRESETS.noTax).band, "none");
  assert.equal(taxDragSummary(TAXDRAG_PRESETS.highTax).band, "high");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
