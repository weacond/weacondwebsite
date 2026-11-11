// Kelly 公式测试 — lib/kelly.js
// 取 p=0.6, b=1 → f*=0.2, half=0.1, quarter=0.05；p=0.5,b=1 → 公平赌局 f*=0。
import { test } from "node:test";
import assert from "node:assert/strict";
import { kellyFraction } from "../lib/kelly.js";

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
