// tests/goalSolver.test.mjs — lib/goalSolver.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  requiredRate, requiredYears, requiredContribution, sufficiency,
  goalBand, goalSolverSummary, GOAL_PRESETS, num,
} from "../lib/goalSolver.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("requiredRate：(FV/PV)^(1/n) − 1", () => {
  // 50000 → 1000000 in 20y → ~14.87%
  approx(requiredRate(50000, 1000000, 20), Math.pow(20, 1 / 20) - 1);
  // FV ≤ PV → 0
  approx(requiredRate(100000, 50000, 10), 0);
  // PV ≤ 0 → 0
  approx(requiredRate(0, 100000, 10), 0);
  // years ≤ 0 → 0
  approx(requiredRate(10000, 100000, 0), 0);
});

test("requiredYears：ln(FV/PV) / ln(1+r)", () => {
  // 50000 → 1000000 at 5% → ~61.4y
  approx(requiredYears(50000, 1000000, 0.05), Math.log(20) / Math.log(1.05));
  // FV ≤ PV → 0
  approx(requiredYears(100000, 50000, 0.05), 0);
  // r ≤ 0 → 0
  approx(requiredYears(50000, 1000000, 0), 0);
});

test("requiredContribution：(FV − PV·(1+r)^n) / annuityFactor", () => {
  const r = 0.05, n = 20, pv = 50000, fv = 1000000;
  const pmt = requiredContribution(pv, fv, r, n);
  const annuityFactor = (Math.pow(1 + r, n) - 1) / r;
  approx(pmt, (fv - pv * Math.pow(1 + r, n)) / annuityFactor);
  // r=0 退化
  approx(requiredContribution(10000, 100000, 0, 10), (100000 - 10000 * 10) / 10);
  // PV 已够 → 0
  approx(requiredContribution(100000, 50000, 0.05, 10), 0);
});

test("sufficiency：总 FV / 目标 FV", () => {
  const r = 0.05, n = 20, pv = 50000, fv = 1000000;
  const pmt = requiredContribution(pv, fv, r, n);
  approx(sufficiency(pv, fv, r, n, pmt), 1, 1e-6); // 精确达标
  approx(sufficiency(pv, fv, r, n, 0), 0, 1); // 无定投 → 不足
  approx(sufficiency(0, 0, 0, 0, 0), 0);
});

test("goalBand：按充足率", () => {
  assert.equal(goalBand(0), "insufficient");
  assert.equal(goalBand(0.5), "behind");
  assert.equal(goalBand(1.0), "onTrack");
  assert.equal(goalBand(1.5), "ahead");
  assert.equal(goalBand(NaN), "insufficient");
});

test("goalSolverSummary：退休 100万 → 需 ~16.16% 利率", () => {
  const r = goalSolverSummary(GOAL_PRESETS.retirement);
  assert.ok(r.valid);
  approx(r.requiredRate, 0.1616, 0.001);
  assert.ok(r.requiredContribution > 0);
  assert.equal(r.band, "onTrack");
});

test("goalSolverSummary：快速翻倍 → 需 ~14.87%", () => {
  const r = goalSolverSummary(GOAL_PRESETS.quick);
  assert.ok(r.valid);
  // 100000 → 200000 in 5y → (2)^(1/5)-1 ≈ 0.1487
  approx(r.requiredRate, Math.pow(2, 1 / 5) - 1);
});

test("goalSolverSummary：非法输入 → 无效", () => {
  assert.equal(goalSolverSummary({ fv: 0, years: 20 }).valid, false);
  assert.equal(goalSolverSummary({ fv: 1000000, years: 0 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(GOAL_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = GOAL_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.fv) && p.fv > 0);
    assert.ok(goalSolverSummary(p).valid);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
