// tests/margin.test.mjs — lib/margin.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  borrowed, positionValue, financingCost, costRatio,
  costBand, marginSummary, MARGIN_PRESETS, num,
} from "../lib/margin.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("borrowed：P·(L−1)", () => {
  approx(borrowed(10000, 2), 10000);
  approx(borrowed(10000, 1), 0); // 无杠杆 → 0
  approx(borrowed(10000, 10), 90000);
});

test("positionValue：P·L", () => {
  approx(positionValue(10000, 2), 20000);
  approx(positionValue(10000, 1), 10000);
});

test("financingCost：借入·利率·(天/365)", () => {
  approx(financingCost(10000, 0.08, 1), (10000 * 0.08 * 1) / 365);
  approx(financingCost(0, 0.08, 100), 0); // 无借入 → 0
  approx(financingCost(10000, 0.08, 0), 0); // 0 天 → 0
});

test("costRatio：融资/本金", () => {
  const fc = (10000 * 0.08 * 1) / 365;
  approx(costRatio(fc, 10000), fc / 10000);
  approx(costRatio(500, 0), 0); // 本金 ≤0 → 0
});

test("costBand：分级", () => {
  assert.equal(costBand(0), "none");
  assert.equal(costBand(NaN), "none");
  assert.equal(costBand(0.005), "low");
  assert.equal(costBand(0.03), "moderate");
  assert.equal(costBand(0.2), "high");
});

test("marginSummary：无杠杆 → 零融资", () => {
  const r = marginSummary(MARGIN_PRESETS.noLev);
  assert.ok(r.valid);
  approx(r.borrowed, 0);
  approx(r.financingCost, 0);
  assert.equal(r.band, "none");
});

test("marginSummary：日内 → 低；波段 → 中；长期/高杠杆 → 高", () => {
  assert.equal(marginSummary(MARGIN_PRESETS.dayTrade).band, "low");
  assert.equal(marginSummary(MARGIN_PRESETS.swing).band, "moderate");
  assert.equal(marginSummary(MARGIN_PRESETS.long).band, "high");
  assert.equal(marginSummary(MARGIN_PRESETS.highLev).band, "high");
});

test("marginSummary：高杠杆融资成本 > 低杠杆", () => {
  const hi = marginSummary(MARGIN_PRESETS.highLev);
  const lo = marginSummary(MARGIN_PRESETS.dayTrade);
  assert.ok(hi.financingCost > lo.financingCost);
  approx(hi.borrowed, 90000); // L=10
  approx(hi.positionValue, 100000);
});

test("marginSummary：非法输入 → 无效", () => {
  assert.equal(marginSummary({ principal: 0, leverage: 2, annualInterest: 0.08, days: 30 }).valid, false);
  assert.equal(marginSummary({ principal: 10000, leverage: 0.5, annualInterest: 0.08, days: 30 }).valid, false);
  assert.equal(marginSummary({ principal: 10000, leverage: 2, annualInterest: -0.01, days: 30 }).valid, false);
  assert.equal(marginSummary({ principal: 10000, leverage: 2, annualInterest: 0.08, days: -5 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(MARGIN_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = MARGIN_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.principal) && p.principal > 0);
    assert.ok(marginSummary(p).valid);
  }
  assert.equal(marginSummary(MARGIN_PRESETS.noLev).band, "none");
  assert.equal(marginSummary(MARGIN_PRESETS.long).band, "high");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
