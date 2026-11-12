// tests/rPosition.test.mjs — lib/rPosition.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  riskAmount, expectedProfit, maxLoss, perTradeExpectancy,
  rewardRiskRatio, rPositionBand, rPositionSummary, R_POSITION_PRESETS, num,
} from "../lib/rPosition.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("riskAmount：account × riskPct", () => {
  approx(riskAmount(100000, 0.01), 1000);
  approx(riskAmount(0, 0.01), 0);
  approx(riskAmount(100000, 0), 0);
  approx(riskAmount(100000, 0.005), 500);
});

test("expectedProfit：风险金额 × R", () => {
  approx(expectedProfit(100000, 0.01, 2), 2000); // 1000 × 2
  approx(expectedProfit(100000, 0.01, 0), 0); // R=0 → 0
  approx(expectedProfit(0, 0.01, 2), 0); // account=0 → 0
});

test("maxLoss：= 风险金额", () => {
  approx(maxLoss(100000, 0.01), 1000);
  approx(maxLoss(50000, 0.03), 1500);
  approx(maxLoss(0, 0.01), 0);
});

test("perTradeExpectancy：winRate × 盈利 − (1−winRate) × 亏损", () => {
  // 0.5 × 2000 − 0.5 × 1000 = 500
  approx(perTradeExpectancy(100000, 0.01, 2, 0.5), 500);
  // 0.6 × 2000 − 0.4 × 1000 = 1200 − 400 = 800
  approx(perTradeExpectancy(100000, 0.01, 2, 0.6), 800);
  approx(perTradeExpectancy(0, 0.01, 2, 0.5), 0);
});

test("rewardRiskRatio：= R", () => {
  approx(rewardRiskRatio(2), 2);
  approx(rewardRiskRatio(0), 0);
  approx(rewardRiskRatio(-1), 0);
});

test("rPositionBand：按 riskPct", () => {
  assert.equal(rPositionBand(0), "none");
  assert.equal(rPositionBand(0.003), "tiny");
  assert.equal(rPositionBand(0.007), "small");
  assert.equal(rPositionBand(0.015), "moderate");
  assert.equal(rPositionBand(0.03), "large");
  assert.equal(rPositionBand(0.1), "full");
  assert.equal(rPositionBand(NaN), "none");
});

test("rPositionSummary：标准 R=2 → moderate", () => {
  const r = rPositionSummary(R_POSITION_PRESETS.standard);
  assert.ok(r.valid);
  approx(r.riskAmount, 1000);
  approx(r.expectedProfit, 2000);
  approx(r.maxLoss, 1000);
  approx(r.expectancy, 500);
  approx(r.rewardRisk, 2);
  assert.equal(r.band, "moderate");
});

test("rPositionSummary：高 R=4 → profit > loss", () => {
  const r = rPositionSummary(R_POSITION_PRESETS.highR);
  assert.ok(r.valid);
  approx(r.expectedProfit, 4000);
  approx(r.maxLoss, 1000);
  assert.ok(r.expectedProfit > r.maxLoss);
});

test("rPositionSummary：非法输入 → 无效", () => {
  assert.equal(rPositionSummary({ account: 0, riskPct: 0.01, rMultiple: 2 }).valid, false);
  assert.equal(rPositionSummary({ account: 100000, riskPct: 0, rMultiple: 2 }).valid, false);
  assert.equal(rPositionSummary({ account: 100000, riskPct: 0.01, rMultiple: 0 }).valid, false);
});

test("预设：5 个场景，summary 均有效", () => {
  const keys = Object.keys(R_POSITION_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = R_POSITION_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.account) && p.account > 0);
    assert.ok(rPositionSummary(p).valid);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});