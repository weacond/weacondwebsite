// tests/npvCalc.test.mjs — lib/npvCalc.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  npvCalc, discountFactor, perpetuityPV, annuityPV,
  payoffIndex, npvBand, npvSummary, NPV_PRESETS,
} from "../lib/npvCalc.js";

function approx(a, b, eps = 1e-3) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("npvCalc：r=0.1, CF=[-10000,5000,6000,7000] → ≈4763", () => {
  const n = npvCalc(0.1, [-10000, 5000, 6000, 7000]);
  approx(n, 4763.33, 0.1);
});

test("npvCalc：r=0 → 简单求和", () => {
  approx(npvCalc(0, [-10000, 5000, 6000]), 1000);
});

test("npvCalc：非法输入 → 0", () => {
  assert.equal(npvCalc(0.1, []), 0);
  assert.equal(npvCalc(0.1, [100, NaN]), 0);
});

test("discountFactor：r=0.1, n=1 → 0.909", () => {
  approx(discountFactor(0.1, 1), 0.9091, 1e-3);
  approx(discountFactor(0, 5), 1);
});

test("perpetuityPV：CF=1000, r=0.1 → 10000", () => {
  approx(perpetuityPV(1000, 0.1), 10000);
  assert.equal(perpetuityPV(1000, 0), 0); // r=0 → 0
});

test("annuityPV：PMT=1000, r=0.1, n=10 → ≈6145", () => {
  const p = annuityPV(1000, 0.1, 10);
  approx(p, 6144.57, 0.1);
});

test("annuityPV：r=0 → PMT×n", () => {
  approx(annuityPV(1000, 0, 10), 10000);
});

test("payoffIndex：[-10000,5000,6000] → 1.1", () => {
  approx(payoffIndex([-10000, 5000, 6000]), 1.1);
});

test("npvBand：分级", () => {
  assert.equal(npvBand(-100, 1000), "reject");
  assert.equal(npvBand(0, 1000), "break-even");
  assert.equal(npvBand(300, 10000), "low");
  assert.equal(npvBand(1000, 10000), "moderate");
  assert.equal(npvBand(3000, 10000), "good");
  assert.equal(npvBand(NaN, 1000), "invalid");
});

test("npvSummary：简单场景", () => {
  const r = npvSummary({ rate: 0.1, cashflows: [-10000, 5000, 6000, 7000] });
  assert.ok(r.valid);
  assert.ok(r.npv > 0);
  approx(r.payoffIndex, 18000 / 10000); // (5000+6000+7000)/10000 = 1.8
  assert.equal(r.band, "good");
});

test("npvSummary：少于 2 个 CF → 无效", () => {
  assert.equal(npvSummary({ rate: 0.1, cashflows: [100] }).valid, false);
});

test("预设：5 个场景", () => {
  const keys = Object.keys(NPV_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = NPV_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Array.isArray(p.cashflows) && p.cashflows.length >= 2);
    assert.ok(Number.isFinite(p.rate));
  }
});