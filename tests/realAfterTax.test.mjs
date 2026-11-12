// tests/realAfterTax.test.mjs — lib/realAfterTax.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  afterTaxRealRate, nominalFV, afterTaxFV, realFV, totalDrag,
  realAfterTaxBand, realAfterTaxSummary, REAL_AFTER_TAX_PRESETS, num,
} from "../lib/realAfterTax.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("afterTaxRealRate：nominal × (1−tax) − inflation", () => {
  approx(afterTaxRealRate(0.08, 0.15, 0.03), 0.08 * 0.85 - 0.03); // 0.038
  approx(afterTaxRealRate(0.08, 0, 0.03), 0.08 - 0.03); // 免税 → 0.05
  approx(afterTaxRealRate(0.08, 0.15, 0), 0.08 * 0.85); // 无通胀 → 0.068
});

test("nominalFV：PV × (1+r)^n", () => {
  approx(nominalFV(100000, 0.08, 20), 100000 * Math.pow(1.08, 20));
  approx(nominalFV(0, 0.08, 20), 0);
  approx(nominalFV(100000, 0.08, 0), 0);
});

test("afterTaxFV：nominalFV × (1−tax)", () => {
  const nom = nominalFV(100000, 0.08, 20);
  approx(afterTaxFV(100000, 0.08, 0.15, 20), nom * 0.85);
  approx(afterTaxFV(100000, 0.08, 0, 20), nom); // 免税
});

test("realFV：afterTaxFV / (1+inflation)^n", () => {
  const atfv = afterTaxFV(100000, 0.08, 0.15, 20);
  approx(realFV(100000, 0.08, 0.15, 0.03, 20), atfv / Math.pow(1.03, 20));
  approx(realFV(100000, 0.08, 0.15, 0, 20), atfv); // 无通胀
});

test("totalDrag：1 − realFV / nominalFV", () => {
  const nom = nominalFV(100000, 0.08, 20);
  const real = realFV(100000, 0.08, 0.15, 0.03, 20);
  approx(totalDrag(100000, 0.08, 0.15, 0.03, 20), 1 - real / nom);
  approx(totalDrag(100000, 0.08, 0, 0, 20), 0); // 无税无通胀 → 0 损耗
});

test("realAfterTaxBand：按实际年化", () => {
  assert.equal(realAfterTaxBand(0), "negative");
  assert.equal(realAfterTaxBand(-0.01), "negative");
  assert.equal(realAfterTaxBand(0.01), "low");
  assert.equal(realAfterTaxBand(0.03), "moderate");
  assert.equal(realAfterTaxBand(0.05), "good");
  assert.equal(realAfterTaxBand(0.07), "excellent");
  assert.equal(realAfterTaxBand(NaN), "negative");
});

test("realAfterTaxSummary：标准 8%/15%/3% → moderate", () => {
  const r = realAfterTaxSummary(REAL_AFTER_TAX_PRESETS.standard);
  assert.ok(r.valid);
  approx(r.afterTaxRealRate, 0.038, 0.001);
  assert.ok(r.nominalFV > r.afterTaxFV);
  assert.ok(r.afterTaxFV > r.realFV);
  assert.equal(r.band, "moderate");
});

test("realAfterTaxSummary：免税 → 更高实际", () => {
  const std = realAfterTaxSummary(REAL_AFTER_TAX_PRESETS.standard);
  const tf = realAfterTaxSummary(REAL_AFTER_TAX_PRESETS.taxFree);
  assert.ok(tf.realFV > std.realFV);
  assert.ok(tf.totalDrag < std.totalDrag);
});

test("realAfterTaxSummary：高通胀 → 更多损耗", () => {
  const std = realAfterTaxSummary(REAL_AFTER_TAX_PRESETS.standard);
  const hi = realAfterTaxSummary(REAL_AFTER_TAX_PRESETS.highInfl);
  assert.ok(hi.totalDrag > std.totalDrag);
  assert.ok(hi.realFV < std.realFV);
});

test("realAfterTaxSummary：非法输入 → 无效", () => {
  assert.equal(realAfterTaxSummary({ pv: 0, rate: 0.08, taxRate: 0.15, inflation: 0.03, years: 20 }).valid, false);
  assert.equal(realAfterTaxSummary({ pv: 100000, rate: 0.08, taxRate: 0.15, inflation: 0.03, years: 0 }).valid, false);
  assert.equal(realAfterTaxSummary({ pv: 100000, rate: 0.08, taxRate: 1.5, inflation: 0.03, years: 20 }).valid, false);
});

test("预设：5 个场景，summary 均有效", () => {
  const keys = Object.keys(REAL_AFTER_TAX_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = REAL_AFTER_TAX_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.pv) && p.pv > 0);
    assert.ok(realAfterTaxSummary(p).valid);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});