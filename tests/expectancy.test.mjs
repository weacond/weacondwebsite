// tests/expectancy.test.mjs — lib/expectancy.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  expectedValue, rewardRiskRatio, profitFactor,
  breakEvenWinRate, expectancyBand, expectancySummary, EXPECTANCY_PRESETS, num,
} from "../lib/expectancy.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("expectedValue：p·avgWin − (1−p)·avgLoss", () => {
  approx(expectedValue(0.5, 200, 100), 50);
  approx(expectedValue(0.5, 100, 100), 0); // 盈亏平衡
  approx(expectedValue(0.4, 100, 150), -50);
});

test("rewardRiskRatio：avgWin/avgLoss", () => {
  approx(rewardRiskRatio(200, 100), 2);
  approx(rewardRiskRatio(100, 200), 0.5);
  approx(rewardRiskRatio(100, 0), 0); // 亏损为0 → 0
});

test("profitFactor：(p·avgWin)/((1−p)·avgLoss)", () => {
  approx(profitFactor(0.5, 200, 100), 2);
  approx(profitFactor(0.5, 100, 100), 1); // 平衡
  approx(profitFactor(0.4, 100, 150), 40 / 90);
  assert.equal(profitFactor(1, 100, 100), 999); // 100%胜率 → 封顶
});

test("breakEvenWinRate：avgLoss/(avgWin+avgLoss)", () => {
  approx(breakEvenWinRate(100, 100), 0.5); // R:R=1 → 50%
  approx(breakEvenWinRate(200, 100), 1 / 3);
  approx(breakEvenWinRate(0, 0), 0);
});

test("expectancyBand：按盈亏因子", () => {
  assert.equal(expectancyBand(0.5), "negative");
  assert.equal(expectancyBand(1), "marginal");
  assert.equal(expectancyBand(1.2), "marginal");
  assert.equal(expectancyBand(2), "strong");
  assert.equal(expectancyBand(NaN), "negative");
});

test("expectancySummary：正期望 → strong", () => {
  const r = expectancySummary(EXPECTANCY_PRESETS.positive);
  assert.ok(r.valid);
  approx(r.expectedValue, 50);
  approx(r.profitFactor, 2);
  approx(r.rewardRiskRatio, 2);
  approx(r.breakEvenWinRate, 1 / 3);
  approx(r.totalExpectancy, 5000);
  assert.equal(r.band, "strong");
});

test("expectancySummary：盈亏平衡 → marginal；负期望 → negative", () => {
  assert.equal(expectancySummary(EXPECTANCY_PRESETS.breakeven).band, "marginal");
  assert.equal(expectancySummary(EXPECTANCY_PRESETS.highWin).band, "marginal");
  assert.equal(expectancySummary(EXPECTANCY_PRESETS.negative).band, "negative");
  assert.equal(expectancySummary(EXPECTANCY_PRESETS.scalper).band, "strong");
});

test("expectancySummary：非法输入 → 无效", () => {
  assert.equal(expectancySummary({ winRate: 1.5, avgWin: 100, avgLoss: 100, trades: 100 }).valid, false);
  assert.equal(expectancySummary({ winRate: 0.5, avgWin: 0, avgLoss: 100, trades: 100 }).valid, false);
  assert.equal(expectancySummary({ winRate: 0.5, avgWin: 100, avgLoss: -10, trades: 100 }).valid, false);
  assert.equal(expectancySummary({ winRate: 0.5, avgWin: 100, avgLoss: 100, trades: -5 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(EXPECTANCY_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = EXPECTANCY_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.winRate) && p.winRate >= 0 && p.winRate <= 1);
    assert.ok(expectancySummary(p).valid);
  }
  assert.equal(expectancySummary(EXPECTANCY_PRESETS.positive).band, "strong");
  assert.equal(expectancySummary(EXPECTANCY_PRESETS.negative).band, "negative");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
