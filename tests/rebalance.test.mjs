// tests/rebalance.test.mjs — lib/rebalance.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  portfolioVol, rebalancingBonus, totalBonus, bonusBand,
  rebalanceSummary, REBALANCE_PRESETS, num,
} from "../lib/rebalance.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("portfolioVol：静态两资产波动 √(w₁²σ₁²+w₂²σ₂²+2w₁w₂ρσ₁σ₂)", () => {
  approx(portfolioVol(0.5, 0.2, 0.1, 0), Math.sqrt(0.0125));
  approx(portfolioVol(1, 0.2, 0.1, 0), 0.2); // 全仓资产1
  approx(portfolioVol(0, 0.2, 0.1, 0), 0.1); // 全仓资产2
});

test("rebalancingBonus：w₁w₂(σ₁²+σ₂²−2ρσ₁σ₂)", () => {
  approx(rebalancingBonus(0.5, 0.2, 0.1, 0), 0.25 * 0.05); // 0.0125
  approx(rebalancingBonus(0.5, 0.15, 0.15, 1), 0);   // 完全相关无溢价
  approx(rebalancingBonus(0.5, 0.2, 0.2, -1), 0.04); // 负相关溢价最高
  approx(rebalancingBonus(0, 0.2, 0.1, 0), 0);       // 权重 0 无溢价
  approx(rebalancingBonus(1, 0.2, 0.1, 0), 0);       // 权重 1 无溢价
});

test("totalBonus：年化×年数", () => {
  approx(totalBonus(0.0125, 10), 0.125);
  approx(totalBonus(0.01, 0), 0);
});

test("bonusBand：分级", () => {
  assert.equal(bonusBand(NaN), "na");
  assert.equal(bonusBand(0), "none");
  assert.equal(bonusBand(0.003), "low");
  assert.equal(bonusBand(0.01), "moderate");
  assert.equal(bonusBand(0.04), "high");
});

test("rebalanceSummary：平衡 50/50 综合视图", () => {
  const r = rebalanceSummary(REBALANCE_PRESETS.balanced);
  assert.ok(r.valid);
  approx(r.w1, 0.5);
  approx(r.w2, 0.5);
  approx(r.bonus, 0.0125);
  approx(r.totalBonus, 0.125);
  assert.equal(r.band, "moderate");
  approx(r.portfolioVol, Math.sqrt(0.0125));
});

test("rebalanceSummary：完全相同 → 零溢价", () => {
  const r = rebalanceSummary(REBALANCE_PRESETS.identical);
  assert.ok(r.valid);
  approx(r.bonus, 0);
  assert.equal(r.band, "none");
});

test("rebalanceSummary：负相关 → 高溢价", () => {
  const r = rebalanceSummary(REBALANCE_PRESETS.antiCorrelated);
  assert.ok(r.valid);
  approx(r.bonus, 0.04);
  assert.equal(r.band, "high");
});

test("rebalanceSummary：权重越界 → 无效", () => {
  assert.equal(rebalanceSummary({ w1: 1.5, s1: 0.2, s2: 0.1, rho: 0, years: 10 }).valid, false);
  assert.equal(rebalanceSummary({ w1: -0.1, s1: 0.2, s2: 0.1, rho: 0, years: 10 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(REBALANCE_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = REBALANCE_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(p.w1 >= 0 && p.w1 <= 1);
    assert.ok(rebalanceSummary(p).valid);
  }
  assert.equal(rebalanceSummary(REBALANCE_PRESETS.identical).band, "none");
  assert.equal(rebalanceSummary(REBALANCE_PRESETS.antiCorrelated).band, "high");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});