// tests/ear.test.mjs — lib/ear.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  effectiveAnnualRate, continuousEAR, compoundingGap,
  earBand, earSummary, EAR_PRESETS,
} from "../lib/ear.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("effectiveAnnualRate：12% 按月 12 次 ≈ 0.126825", () => {
  approx(effectiveAnnualRate(0.12, 12), 0.12682503);
});

test("effectiveAnnualRate：12% 按年 = 0.12", () => {
  approx(effectiveAnnualRate(0.12, 1), 0.12);
});

test("effectiveAnnualRate：m≤0 退化为单利 r", () => {
  approx(effectiveAnnualRate(0.12, 0), 0.12);
  approx(effectiveAnnualRate(0.12, -1), 0.12);
});

test("continuousEAR：e^0.12 − 1 ≈ 0.127497", () => {
  approx(continuousEAR(0.12), Math.exp(0.12) - 1);
});

test("compoundingGap：连续 − EAR（连续略高）", () => {
  const gap = compoundingGap(0.12, 12);
  assert.ok(gap > 0 && gap < 0.002, `gap=${gap}`);
});

test("earBand：分级", () => {
  assert.equal(earBand(0), "none");
  assert.equal(earBand(0.02), "low");
  assert.equal(earBand(0.05), "moderate");
  assert.equal(earBand(0.08), "high");
  assert.equal(earBand(0.15), "very-high");
  assert.equal(earBand(NaN), "invalid");
});

test("earSummary：6% 按月 → EAR 0.0617", () => {
  const r = earSummary({ nominal: 0.06, periods: 12 });
  assert.ok(r.valid);
  approx(r.ear, Math.pow(1 + 0.06 / 12, 12) - 1, 1e-6);
  approx(r.continuousEar, Math.exp(0.06) - 1, 1e-6);
});

test("earSummary：periods 非法 → 无效", () => {
  const r = earSummary({ nominal: 0.06, periods: 0 });
  assert.equal(r.valid, false);
});

test("EAR_PRESETS：5 个场景", () => {
  const keys = Object.keys(EAR_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = EAR_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.nominal));
    assert.ok(p.periods > 0);
  }
});