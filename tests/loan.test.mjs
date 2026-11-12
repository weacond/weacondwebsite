// tests/loan.test.mjs — lib/loan.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  monthlyPayment, totalPaid, totalInterest, payoffMonths,
  payoffBand, loanSummary, LOAN_PRESETS, num,
} from "../lib/loan.js";

function approx(a, b, eps = 1e-4) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("monthlyPayment：r=0 → P/n", () => {
  approx(monthlyPayment(10000, 0, 1), 10000 / 12);
});

test("monthlyPayment：1 年 12% → ≈888.49", () => {
  approx(monthlyPayment(10000, 0.12, 1), 888.487, 1e-2);
});

test("monthlyPayment：P=0 / years=0 → null", () => {
  assert.equal(monthlyPayment(0, 0.12, 1), null);
  assert.equal(monthlyPayment(10000, 0.12, 0), null);
});

test("monthlyPayment：利率越高月供越高（单调）", () => {
  assert.ok(monthlyPayment(10000, 0.06, 5) < monthlyPayment(10000, 0.18, 5));
});

test("totalInterest = 总还款 − 本金", () => {
  const pmt = monthlyPayment(10000, 0.12, 1);
  approx(totalInterest(pmt, 12, 10000), totalPaid(pmt, 12) - 10000);
  approx(totalInterest(pmt, 12, 10000), 661.88, 1);
});

test("payoffMonths：固定月供 ≈ 原期数（往返）", () => {
  const pmt = monthlyPayment(10000, 0.12, 1);
  approx(payoffMonths(10000, 0.12, pmt), 12, 0.5);
});

test("payoffMonths：r=0 → P/pmt；月供≤利息 → null", () => {
  approx(payoffMonths(10000, 0, 500), 20);
  assert.equal(payoffMonths(10000, 0.12, 100), null); // 月供=当期利息，永远还不完
});

test("payoffBand：分级", () => {
  assert.equal(payoffBand(null), "unbounded");
  assert.equal(payoffBand(12), "fast");
  assert.equal(payoffBand(60), "medium");
  assert.equal(payoffBand(360), "slow");
});

test("loanSummary：各预设状态", () => {
  const car = loanSummary(LOAN_PRESETS.car);
  assert.ok(car.valid);
  assert.ok(car.payment > 0 && car.interest > 0);
  assert.equal(car.payoffBand, "medium"); // 60 月
  assert.equal(loanSummary(LOAN_PRESETS.mortgage).payoffBand, "slow"); // 360 月
  assert.equal(loanSummary(LOAN_PRESETS.highRate).payoffBand, "fast"); // 24 月
  approx(loanSummary(LOAN_PRESETS.zeroRate).interest, 0); // 零利率无利息
});

test("loanSummary：非法输入 → 无效", () => {
  assert.equal(loanSummary({ principal: 0, annualRate: 0.05, years: 5 }).valid, false);
  assert.equal(loanSummary({ principal: 10000, annualRate: -0.05, years: 5 }).valid, false);
});

test("预设：5 个情景，summary 均有效且有月供", () => {
  const keys = Object.keys(LOAN_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = LOAN_PRESETS[k];
    assert.ok(p.id && p.label);
    const r = loanSummary(p);
    assert.ok(r.valid);
    assert.ok(r.payment != null && r.payment > 0);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
