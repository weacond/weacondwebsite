// tests/twrr.test.mjs — lib/twrr.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseReturns, growthMultiple, timeWeightedReturn,
  annualizedTWRR, annualizedArithmetic, volatilityDrag,
  twrrBand, twrrSummary, TWRR_PRESETS,
} from "../lib/twrr.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("parseReturns：逗号/空白分隔；过滤非数字；空数组", () => {
  assert.deepEqual(parseReturns("0.01, 0.02, -0.03"), [0.01, 0.02, -0.03]);
  assert.deepEqual(parseReturns("abc, 0.05, , 0.02"), [0.05, 0.02]);
  assert.deepEqual(parseReturns([]), []);
  assert.deepEqual(parseReturns(0.05), []);
});

test("growthMultiple：Π(1+r)；空 → 1", () => {
  approx(growthMultiple([0.01, -0.01]), 1.01 * 0.99);
  assert.equal(growthMultiple([]), 1);
});

test("timeWeightedReturn：0.01,0.01 → 0.0201；空 → 0", () => {
  approx(timeWeightedReturn([0.01, 0.01]), 1.01 * 1.01 - 1);
  assert.equal(timeWeightedReturn([]), 0);
});

test("annualizedTWRR：单期 0.01 年化12 → 1.01^12−1；空 → 0；累计≤0 → null", () => {
  approx(annualizedTWRR([0.01], 12), Math.pow(1.01, 12) - 1);
  assert.equal(annualizedTWRR([], 12), 0);
  assert.equal(annualizedTWRR([-1.1], 12), null);
});

test("annualizedArithmetic：均值 × 每年期数", () => {
  approx(annualizedArithmetic([0.01, 0.01], 12), 0.01 * 12);
  assert.equal(annualizedArithmetic([], 12), 0);
});

test("volatilityDrag：≥0（AM≥GM）；单点 → 0；累计≤0 → null", () => {
  const d = volatilityDrag([0.1, -0.05]);
  assert.ok(d >= 0, `drag 应≥0, got ${d}`);
  approx(d, 0.025 - (Math.pow(1.045, 0.5) - 1));
  assert.equal(volatilityDrag([0.01]), 0);
  assert.equal(volatilityDrag([-1.1, 0.01]), null);
});

test("twrrBand：按年化分级", () => {
  assert.equal(twrrBand(-0.01), "negative");
  assert.equal(twrrBand(0.02), "low");
  assert.equal(twrrBand(0.07), "moderate");
  assert.equal(twrrBand(0.15), "high");
  assert.equal(twrrBand(0.3), "very-high");
  assert.equal(twrrBand(NaN), "invalid");
});

test("twrrSummary：稳健月+1% → 年化≈0.1268、拖累≈0", () => {
  const r = twrrSummary({ returns: "0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01", periodsPerYear: 12 });
  assert.ok(r.valid);
  assert.equal(r.count, 10);
  approx(r.annualized, Math.pow(1.01, 12) - 1);
  approx(r.drag, 0, 1e-9);
  assert.equal(r.band, "high");
});

test("twrrSummary：累计亏损超100% → 无效", () => {
  const r = twrrSummary({ returns: "-1.1", periodsPerYear: 12 });
  assert.equal(r.valid, false);
  assert.equal(r.annualized, null);
});

test("twrrSummary：单点 → 拖累为 null（需≥2 期）", () => {
  const r = twrrSummary({ returns: "0.05", periodsPerYear: 12 });
  assert.ok(r.valid);
  assert.equal(r.drag, null);
});

test("TWRR_PRESETS：5 个场景，序列可解析", () => {
  const keys = Object.keys(TWRR_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = TWRR_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(parseReturns(p.returns).length >= 1);
    assert.ok(Number.isFinite(p.periodsPerYear));
  }
});