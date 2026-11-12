// tests/optionsPayoff.test.mjs — lib/optionsPayoff.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  intrinsic, optionPayoff, breakEven, maxLoss, maxProfit,
  payoffSummary, PAYOFF_PRESETS, num,
} from "../lib/optionsPayoff.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("intrinsic：内在价值", () => {
  approx(intrinsic("call", 105, 100), 5);
  approx(intrinsic("call", 95, 100), 0);
  approx(intrinsic("put", 98, 100), 2);
  approx(intrinsic("put", 105, 100), 0);
});

test("optionPayoff：多头/空头 × call/put", () => {
  approx(optionPayoff("call", "long", 105, 100, 3), 2);   // 5−3
  approx(optionPayoff("call", "short", 105, 100, 3), -2); // 3−5
  approx(optionPayoff("put", "long", 98, 100, 3), -1);    // 2−3
  approx(optionPayoff("put", "short", 100, 90, 2), 2);    // 2−0 最大盈利
});

test("breakEven：四组", () => {
  approx(breakEven("call", "long", 100, 3), 103);
  approx(breakEven("call", "short", 100, 3), 97);
  approx(breakEven("put", "long", 100, 3), 97);
  approx(breakEven("put", "short", 90, 2), 92);
});

test("maxLoss：多头有限，空头 call 无限", () => {
  approx(maxLoss("call", "long", 100, 3), -3);
  assert.equal(maxLoss("call", "short", 100, 3), -Infinity);
  approx(maxLoss("put", "short", 90, 2), -88); // −(K−P)
  approx(maxLoss("put", "long", 100, 3), -3);
});

test("maxProfit：买 call 无限，买 put=K−P，空头=权利金", () => {
  assert.equal(maxProfit("call", "long", 100, 3), Infinity);
  approx(maxProfit("put", "long", 100, 3), 97);
  approx(maxProfit("call", "short", 110, 2), 2);
  approx(maxProfit("put", "short", 90, 2), 2);
});

test("payoffSummary：买权 call 有效", () => {
  const r = payoffSummary(PAYOFF_PRESETS.longCall);
  assert.ok(r.valid);
  approx(r.intrinsic, 5);
  approx(r.breakEven, 103);
  approx(r.maxLoss, -3);
  assert.equal(r.maxProfit, Infinity);
  approx(r.currentPayoff, 2);
});

test("payoffSummary：卖权 call 无限亏损；atTheMoney 判定", () => {
  const r = payoffSummary(PAYOFF_PRESETS.shortCall);
  assert.ok(r.valid);
  assert.equal(r.maxLoss, -Infinity);
  approx(r.maxProfit, 2);
  assert.equal(payoffSummary({ type: "call", side: "long", spot: 101, strike: 100, premium: 3 }).atTheMoney, true);
  assert.equal(payoffSummary({ type: "call", side: "long", spot: 120, strike: 100, premium: 3 }).atTheMoney, false);
});

test("payoffSummary：非法输入 → 无效", () => {
  assert.equal(payoffSummary({ type: "x", side: "long", spot: 100, strike: 100, premium: 3 }).valid, false);
  assert.equal(payoffSummary({ type: "call", side: "x", spot: 100, strike: 100, premium: 3 }).valid, false);
  assert.equal(payoffSummary({ type: "call", side: "long", spot: 100, strike: 0, premium: 3 }).valid, false);
  assert.equal(payoffSummary({ type: "call", side: "long", spot: 100, strike: 100, premium: -1 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(PAYOFF_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = PAYOFF_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(payoffSummary(p).valid);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
