// tests/annuity.test.mjs — lib/annuity.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  annuityPayment, savingsRequired, payoutYears, sufficiencyRatio,
  annuityBand, annuitySummary, ANNUITY_PRESETS, num,
} from "../lib/annuity.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("annuityPayment：PMT = PV·r / (1 − (1+r)^(-n))", () => {
  const pmt = annuityPayment(100000, 0.04, 20);
  approx(pmt, 4000 / (1 - Math.pow(1.04, -20)));
  approx(pmt, 7358.7, 1); // ~7359
  approx(annuityPayment(100000, 0, 20), 5000); // r=0 → PV/n
  approx(annuityPayment(100000, 0.04, 0), 0); // n≤0 → 0
});

test("savingsRequired：PMT·(1 − (1+r)^(-n)) / r", () => {
  const pmt = annuityPayment(100000, 0.04, 20);
  approx(savingsRequired(pmt, 0.04, 20), 100000, 1); // 往返一致
  approx(savingsRequired(5000, 0, 20), 100000); // r=0 → PMT×n
  approx(savingsRequired(5000, 0.04, 0), 0); // n≤0 → 0
});

test("payoutYears：−ln(1 − PV·r/PMT) / ln(1+r)", () => {
  const pmt = annuityPayment(100000, 0.04, 20);
  approx(payoutYears(100000, 0.04, pmt), 20, 1e-4); // 往返一致
  approx(payoutYears(100000, 0, 5000), 20); // r=0 → PV/PMT
  approx(payoutYears(100000, 0.04, 0), 0); // PMT≤0 → 0
  // ratio≥1 意味着给付额 ≤ 利息 → 永不到期 → 0
  approx(payoutYears(100000, 0.04, 1000), 0); // 100000×0.04/1000 = 4 ≥1 → 0
});

test("sufficiencyRatio：PV / 所需储蓄", () => {
  const pmt = annuityPayment(100000, 0.04, 20);
  approx(sufficiencyRatio(100000, 0.04, pmt, 20), 1);
  approx(sufficiencyRatio(200000, 0.04, pmt, 20), 2); // 2x savings → 2x ratio
  approx(sufficiencyRatio(0, 0.04, pmt, 20), 0);
});

test("annuityBand：按充足率", () => {
  assert.equal(annuityBand(0), "insufficient");
  assert.equal(annuityBand(0.5), "tight");
  assert.equal(annuityBand(1.0), "adequate");
  assert.equal(annuityBand(1.5), "surplus");
  assert.equal(annuityBand(NaN), "insufficient");
});

test("annuitySummary：标准 4% → adequate", () => {
  const r = annuitySummary(ANNUITY_PRESETS.standard);
  assert.ok(r.valid);
  approx(r.annualPayment, 7358.7, 1);
  approx(r.totalPaid, r.annualPayment * 20, 1);
  approx(r.sufficiencyRatio, 1);
  assert.equal(r.band, "adequate");
});

test("annuitySummary：低利率 → 给付更少", () => {
  const std = annuitySummary(ANNUITY_PRESETS.standard);
  const low = annuitySummary(ANNUITY_PRESETS.lowRate);
  assert.ok(low.annualPayment < std.annualPayment); // 更低利率 → 更少给付
});

test("annuitySummary：非法输入 → 无效", () => {
  assert.equal(annuitySummary({ presentValue: 0, rate: 0.04, years: 20 }).valid, false);
  assert.equal(annuitySummary({ presentValue: 100000, rate: -1.5, years: 20 }).valid, false);
  assert.equal(annuitySummary({ presentValue: 100000, rate: 0.04, years: 0 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(ANNUITY_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = ANNUITY_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.presentValue) && p.presentValue > 0);
    assert.ok(annuitySummary(p).valid);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
