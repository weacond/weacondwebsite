// tests/drip.test.mjs — lib/drip.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  yearlyDividend, totalDividends, incomeMultiplier, finalDividend,
  dripBand, dripSummary, DRIP_PRESETS, num,
} from "../lib/drip.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("yearlyDividend：P·y·(1+g)^(t−1)", () => {
  approx(yearlyDividend(10000, 0.04, 0.05, 1), 400); // 10000×0.04×1
  approx(yearlyDividend(10000, 0.04, 0.05, 2), 420); // ×1.05
  approx(yearlyDividend(10000, 0.04, 0.05, 10), 400 * Math.pow(1.05, 9));
  approx(yearlyDividend(10000, 0.04, 0.05, 0), 0); // t<1 → 0
  approx(yearlyDividend(10000, 0.04, 0.05, -1), 0);
});

test("totalDividends：Σ P·y·(1+g)^(t−1)", () => {
  approx(totalDividends(10000, 0.04, 0.05, 1), 400);
  // 10-year sum: 400 + 420 + 441 + ... 
  const expected = 400 + 420 + 441 + 463.05 + 486.2025 + 510.512625 + 536.03825625 + 562.84016906 + 590.98217751 + 620.53128639;
  approx(totalDividends(10000, 0.04, 0.05, 10), expected, 1e-6);
  approx(totalDividends(10000, 0.04, 0.05, 0), 0); // n<1 → 0
});

test("incomeMultiplier：total / principal", () => {
  approx(incomeMultiplier(4000, 10000), 0.4);
  approx(incomeMultiplier(15000, 10000), 1.5);
  approx(incomeMultiplier(4000, 0), 0); // P≤0 → 0
});

test("finalDividend：末年红利", () => {
  approx(finalDividend(10000, 0.04, 0.05, 10), 400 * Math.pow(1.05, 9));
  approx(finalDividend(10000, 0.04, 0.05, 0), 0); // n<1 → 0
});

test("dripBand：按收入倍数", () => {
  assert.equal(dripBand(0), "none");
  assert.equal(dripBand(NaN), "none");
  assert.equal(dripBand(0.3), "low");
  assert.equal(dripBand(0.7), "moderate");
  assert.equal(dripBand(1.5), "high");
});

test("dripSummary：稳健红利 → moderate", () => {
  const r = dripSummary(DRIP_PRESETS.modest);
  assert.ok(r.valid);
  approx(r.firstYearDividend, 400);
  assert.ok(r.totalDividends > 4000 && r.totalDividends < 5500);
  approx(r.incomeMultiplier, r.totalDividends / 10000);
  assert.equal(r.band, "moderate");
});

test("dripSummary：价值股 → moderate", () => {
  const r = dripSummary(DRIP_PRESETS.value);
  assert.ok(r.valid);
  approx(r.firstYearDividend, 500);
  assert.ok(r.incomeMultiplier >= 0.5 && r.incomeMultiplier < 1);
  assert.equal(r.band, "moderate");
});

test("dripSummary：长期激进 → high", () => {
  const r = dripSummary(DRIP_PRESETS.aggressive);
  assert.ok(r.valid);
  assert.ok(r.incomeMultiplier >= 1);
  assert.equal(r.band, "high");
});

test("dripSummary：非法输入 → 无效", () => {
  assert.equal(dripSummary({ principal: 0, yieldRate: 0.04, growthRate: 0.05, years: 10 }).valid, false);
  assert.equal(dripSummary({ principal: 10000, yieldRate: 0.04, growthRate: -1.5, years: 10 }).valid, false);
  assert.equal(dripSummary({ principal: 10000, yieldRate: 0.04, growthRate: 0.05, years: 0 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(DRIP_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = DRIP_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.principal) && p.principal > 0);
    assert.ok(dripSummary(p).valid);
  }
  assert.equal(dripSummary(DRIP_PRESETS.modest).band, "moderate");
  assert.equal(dripSummary(DRIP_PRESETS.aggressive).band, "high");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
