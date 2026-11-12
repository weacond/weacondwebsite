// tests/staking.test.mjs — lib/staking.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stakingReward, netYield, inflationEroded, annualReward,
  stakeBand, stakeSummary, STAKING_PRESETS, num,
} from "../lib/staking.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("stakingReward：P·((1+apy)^n − 1)", () => {
  approx(stakingReward(10, 0.035, 3), 10 * (Math.pow(1.035, 3) - 1));
  approx(stakingReward(100, 0.06, 3), 100 * (Math.pow(1.06, 3) - 1));
  approx(stakingReward(10, 0.035, 0), 0); // n≤0 → 0
  approx(stakingReward(10, 0, 5), 0); // apy=0 → 0
});

test("netYield：apy − infl", () => {
  approx(netYield(0.035, 0.02), 0.015);
  approx(netYield(0.08, 0.15), -0.07); // 负净收益
  approx(netYield(0.04, 0), 0.04);
});

test("inflationEroded：P·(1+net)^n", () => {
  approx(inflationEroded(10, 0.015, 3), 10 * Math.pow(1.015, 3));
  approx(inflationEroded(100, 0, 5), 100); // net=0 → 不变
  approx(inflationEroded(10, -0.05, 2), 10 * Math.pow(0.95, 2)); // 负净收益 → 缩水
});

test("annualReward：P·apy", () => {
  approx(annualReward(10, 0.035), 0.35);
  approx(annualReward(100, 0.06), 6);
  approx(annualReward(10, 0), 0);
});

test("stakeBand：按净收益率", () => {
  assert.equal(stakeBand(-0.05), "negative");
  assert.equal(stakeBand(0), "low");
  assert.equal(stakeBand(0.02), "low");
  assert.equal(stakeBand(0.05), "moderate");
  assert.equal(stakeBand(0.1), "high");
  assert.equal(stakeBand(NaN), "low"); // NaN → num→0 → low
});

test("stakeSummary：ETH 质押 → low", () => {
  const r = stakeSummary(STAKING_PRESETS.ethStake);
  assert.ok(r.valid);
  approx(r.stakingReward, 10 * (Math.pow(1.035, 3) - 1));
  approx(r.netYield, 0.015);
  approx(r.inflationEroded, 10 * Math.pow(1.015, 3));
  assert.equal(r.band, "low");
});

test("stakeSummary：高通胀 → negative", () => {
  const r = stakeSummary(STAKING_PRESETS.highInfl);
  assert.ok(r.valid);
  approx(r.netYield, -0.07);
  assert.equal(r.band, "negative");
});

test("stakeSummary：非法输入 → 无效", () => {
  assert.equal(stakeSummary({ principal: 0, apy: 0.04, inflationRate: 0.02, years: 3 }).valid, false);
  assert.equal(stakeSummary({ principal: 10, apy: -1.5, inflationRate: 0.02, years: 3 }).valid, false);
  assert.equal(stakeSummary({ principal: 10, apy: 0.04, inflationRate: 0.02, years: -1 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(STAKING_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = STAKING_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.principal) && p.principal > 0);
    assert.ok(stakeSummary(p).valid);
  }
  assert.equal(stakeSummary(STAKING_PRESETS.ethStake).band, "low");
  assert.equal(stakeSummary(STAKING_PRESETS.highInfl).band, "negative");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
