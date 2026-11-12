// tests/breakeven.test.mjs — lib/breakeven.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  breakeven, rrAfterFees, breakevenSummary, rrBand,
  BREAKEVEN_PRESETS, num,
} from "../lib/breakeven.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("breakeven：多头 = entry·(1+fee)/(1−fee)", () => {
  const r = breakeven("long", 100, 0.1); // fee 0.1%
  approx(r.breakeven, 100 * 1.001 / 0.999, 1e-4);
  approx(r.fee, 0.001);
  assert.ok(r.valid);
});

test("breakeven：零手续费时平衡价=入场，移动=0", () => {
  const r = breakeven("long", 100, 0);
  approx(r.breakeven, 100);
  approx(r.movePct, 0);
});

test("breakeven：空头 = entry·(1−fee)/(1+fee)", () => {
  const r = breakeven("short", 200, 0.1);
  approx(r.breakeven, 200 * 0.999 / 1.001, 1e-3);
  assert.ok(r.movePct > 0);
});

test("breakeven：入场≤0 或 fee≥100% → 无效", () => {
  assert.ok(!breakeven("long", 0, 0.1).valid);
  assert.ok(!breakeven("long", 100, 100).valid);
});

test("rrAfterFees：扣费后 R:R 低于毛 R:R", () => {
  const r = rrAfterFees(100, 97, 106, 0.1);
  approx(r.risk, 3);
  approx(r.reward, 6);
  approx(r.feeDrag, 0.2); // 100·0.001·2
  approx(r.grossRr, 2);
  approx(r.rr, 5.8 / 3.2); // 1.8125
  assert.ok(r.rr < r.grossRr);
});

test("rrAfterFees：零手续费时有效 R:R=毛 R:R", () => {
  const r = rrAfterFees(100, 97, 106, 0);
  approx(r.feeDrag, 0);
  approx(r.rr, 2);
  approx(r.grossRr, 2);
});

test("rrBand：分级", () => {
  assert.equal(rrBand(0), "poor");
  assert.equal(rrBand(-1), "poor");
  assert.equal(rrBand(0.5), "thin");
  assert.equal(rrBand(1), "fair");
  assert.equal(rrBand(1.5), "fair");
  assert.equal(rrBand(2), "strong");
  assert.equal(rrBand(3), "strong");
});

test("breakevenSummary：平衡价 + 有效盈亏比", () => {
  const r = breakevenSummary({ side: "long", entry: 100, stop: 97, target: 106, feePct: 0.1 });
  approx(r.breakeven, 100 * 1.001 / 0.999, 1e-4);
  approx(r.rr.grossRr, 2);
  approx(r.rr.rr, 5.8 / 3.2);
  assert.ok(r.valid);
  // 无止损 → rr=null
  assert.equal(breakevenSummary({ side: "long", entry: 100, feePct: 0.1 }).rr, null);
});

test("预设：4 个情景，breakevenSummary 均有效", () => {
  const keys = Object.keys(BREAKEVEN_PRESETS);
  assert.equal(keys.length, 4);
  for (const k of keys) {
    const p = BREAKEVEN_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.entry) && p.entry > 0);
    assert.ok(Number.isFinite(p.feePct) && p.feePct < 100);
    assert.ok(breakevenSummary(p).valid);
  }
  // 零手续费情景：毛 R:R = 有效 R:R
  assert.equal(
    Math.round(breakevenSummary(BREAKEVEN_PRESETS.simple).rr.grossRr * 100),
    Math.round(breakevenSummary(BREAKEVEN_PRESETS.simple).rr.rr * 100),
  );
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});