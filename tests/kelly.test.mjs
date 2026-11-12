// Kelly 公式测试 — lib/kelly.js
// 取 p=0.6, b=1 → f*=0.2, half=0.1, quarter=0.05；p=0.5,b=1 → 公平赌局 f*=0。
import { test } from "node:test";
import assert from "node:assert/strict";
import { kellyFraction, growthRate, optimalGrowth, kellyBand, kellySummary, KELLY_PRESETS } from "../lib/kelly.js";

test("kellyFraction: p=0.6,b=1 → f*=0.2、half=0.1、quarter=0.05", () => {
  const r = kellyFraction(0.6, 1);
  assert.equal(r.valid, true);
  assert.ok(Math.abs(r.fStar - 0.2) < 1e-9, "f* = p − q/b = 0.6 − 0.4 = 0.2");
  assert.ok(Math.abs(r.half - 0.1) < 1e-9);
  assert.ok(Math.abs(r.quarter - 0.05) < 1e-9);
  assert.ok(Math.abs(r.expectation - 0.2) < 1e-9, "期望 = p·b − q = 0.2");
});

test("kellyFraction: 自洽关系 f* === expectation / b", () => {
  for (const [p, b] of [[0.6, 1], [0.7, 2], [0.55, 3], [0.9, 0.5]]) {
    const r = kellyFraction(p, b);
    assert.ok(Math.abs(r.fStar - r.expectation / b) < 1e-9, `p=${p},b=${b} 自洽`);
    assert.ok(Math.abs(r.half - r.fStar / 2) < 1e-9, "half = f*/2");
    assert.ok(Math.abs(r.quarter - r.fStar / 4) < 1e-9, "quarter = f*/4");
  }
});

test("kellyFraction: 公平赌局 p=0.5,b=1 → f*=0（不下注）", () => {
  const r = kellyFraction(0.5, 1);
  assert.ok(Math.abs(r.fStar) < 1e-9, "无优势 → 仓位为 0");
  assert.ok(Math.abs(r.expectation) < 1e-9, "期望为 0");
});

test("kellyFraction: 负期望 p=0.4,b=1 → f*<0（应跳过）", () => {
  const r = kellyFraction(0.4, 1);
  assert.ok(r.fStar < 0, "负期望 → f* 为负");
  assert.ok(r.expectation < 0, "期望为负");
});

test("kellyFraction: 非法输入 → 明确无效", () => {
  assert.equal(kellyFraction(0.5, 0).reason, "invalid_odds", "赔率 0 → invalid");
  assert.equal(kellyFraction(0.6, -1).reason, "invalid_odds", "负赔率 → invalid");
  assert.equal(kellyFraction(1.5, 1).reason, "invalid_winrate", "胜率>1 → invalid");
  assert.equal(kellyFraction(-0.1, 1).reason, "invalid_winrate", "胜率<0 → invalid");
  assert.equal(kellyFraction(NaN, 1).reason, "invalid_winrate", "NaN 胜率 → invalid");
});

test("growthRate: p=0.6,b=1,f=0.2", () => {
  const g = growthRate(0.6, 1, 0.2);
  const expected = 0.6 * Math.log(1.2) + 0.4 * Math.log(0.8);
  assert.ok(Math.abs(g - expected) < 1e-9, `g = ${expected}, got ${g}`);
});

test("growthRate: 非法输入 → null", () => {
  assert.equal(growthRate(0.5, 0, 0.1), null);
  assert.equal(growthRate(0.5, 1, 1.5), null);
  assert.equal(growthRate(1.2, 1, 0.1), null);
});

test("optimalGrowth: p=0.6,b=1 → g > 0", () => {
  const g = optimalGrowth(0.6, 1);
  assert.ok(g > 0);
  const expected = 0.6 * Math.log(1.2) + 0.4 * Math.log(0.8);
  assert.ok(Math.abs(g - expected) < 1e-9);
});

test("optimalGrowth: 公平/负期望 → 0", () => {
  assert.equal(optimalGrowth(0.5, 1), 0);
  assert.equal(optimalGrowth(0.4, 1), 0);
});

test("kellyBand：分级", () => {
  assert.equal(kellyBand(0), "none");
  assert.equal(kellyBand(-0.1), "none");
  assert.equal(kellyBand(0.03), "low");
  assert.equal(kellyBand(0.10), "moderate");
  assert.equal(kellyBand(0.20), "high");
  assert.equal(kellyBand(0.50), "aggressive");
  assert.equal(kellyBand(NaN), "invalid");
});

test("kellySummary：p=0.6,b=1", () => {
  const r = kellySummary({ winRate: 0.6, odds: 1 });
  assert.ok(r.valid);
  assert.ok(Math.abs(r.fStar - 0.2) < 1e-9);
  assert.ok(Math.abs(r.half - 0.1) < 1e-9);
  assert.ok(r.growth > 0);
  assert.equal(r.band, "high"); // 0.2 is in [0.15, 0.30) → high
});

test("kellySummary：非法 → invalid", () => {
  assert.equal(kellySummary({ winRate: 1.5, odds: 1 }).valid, false);
  assert.equal(kellySummary({ winRate: 0.5, odds: 0 }).valid, false);
});

test("KELLY_PRESETS：5 个场景", () => {
  const keys = Object.keys(KELLY_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = KELLY_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.winRate) && p.winRate >= 0 && p.winRate <= 1);
    assert.ok(Number.isFinite(p.odds) && p.odds > 0);
  }
});
