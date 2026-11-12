// tests/volDrag.test.mjs — lib/volDrag.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arithmeticMean, geometricMean, volatilityDrag, dragSummary,
  dragBand, VOL_DRAG_PRESETS, num,
} from "../lib/volDrag.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("arithmeticMean：等收益 → 均值；空/非法 → 无效", () => {
  approx(arithmeticMean([0.05, 0.05, 0.05, 0.05]).mean, 0.05);
  assert.ok(!arithmeticMean([]).valid);
  assert.equal(arithmeticMean([-1, -1]).n, 0); // (1+r)<=0 被剔除
});

test("geometricMean：等收益 0.05 → 几何 0.05；∏=1 → 0", () => {
  approx(geometricMean([0.05, 0.05, 0.05, 0.05]).mean, 0.05);
  approx(geometricMean([0.05, 0.05, 0.05, 0.05]).product, 1.05 ** 4, 1e-9);
  // −50% 后 +100% 净值不变：∏=1 → 几何均值 0
  approx(geometricMean([-0.5, 1, 0, 0]).mean, 0, 1e-9);
  approx(geometricMean([-0.5, 1, 0, 0]).product, 1, 1e-9);
});

test("volatilityDrag：等收益无拖累；高波动有正拖累", () => {
  approx(volatilityDrag([0.05, 0.05, 0.05, 0.05]).drag, 0, 1e-9);
  const d = volatilityDrag([0.3, -0.3, 0.3, -0.3]);
  assert.ok(d.valid);
  assert.ok(d.drag > 0.04, "高波动拖累应显著为正");
});

test("dragSummary：稳健上涨 终值相等、拖累 0", () => {
  const r = dragSummary([0.05, 0.05, 0.05, 0.05], 100);
  assert.ok(r.valid);
  approx(r.arith, 0.05);
  approx(r.geom, 0.05);
  approx(r.drag, 0, 1e-9);
  approx(r.fvGeom, 100 * 1.05 ** 4, 1e-6);
  approx(r.fvArith, r.fvGeom, 1e-6);
  approx(r.overstatePct, 0, 1e-6);
});

test("dragSummary：高波动 算术 0 但几何为负、终值缩水", () => {
  const r = dragSummary([0.3, -0.3, 0.3, -0.3], 100);
  approx(r.arith, 0, 1e-9);
  assert.ok(r.geom < 0, "几何均值为负");
  approx(r.fvGeom, 100 * 0.8281, 1e-4); // 1.3*0.7*1.3*0.7 = 0.8281
  assert.ok(r.fvArith > r.fvGeom, "按算术复合虚高");
  approx(r.overstatePct, (100 - 82.81) / 82.81 * 100, 1e-2);
});

test("dragSummary：先崩后涨 算术 +12.5% 但几何 0", () => {
  const r = dragSummary([-0.5, 1, 0, 0], 100);
  approx(r.arith, 0.125, 1e-9);
  approx(r.geom, 0, 1e-9);
  approx(r.drag, 0.125, 1e-9);
  approx(r.fvGeom, 100, 1e-6);
});

test("dragSummary：空序列 → 无效", () => {
  assert.ok(!dragSummary([], 100).valid);
});

test("dragBand：稳健=low、混合=high、空=invalid", () => {
  assert.equal(dragBand([0.05, 0.05, 0.05, 0.05]), "low");
  assert.equal(dragBand([0.1, -0.2, 0.15, 0.08, -0.1]), "high");
  assert.equal(dragBand([]), "invalid");
});

test("剔除 (1+r)<=0 的极端亏损", () => {
  // -1 使 1+r=0 无法复合，被剔除，仅剩 0.1
  const a = arithmeticMean([-1, 0.1]);
  assert.equal(a.n, 1);
  approx(a.mean, 0.1);
});

test("预设：4 个场景，字段完整", () => {
  const keys = Object.keys(VOL_DRAG_PRESETS);
  assert.equal(keys.length, 4);
  for (const k of keys) {
    const p = VOL_DRAG_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Array.isArray(p.returns) && p.returns.length > 0);
    assert.ok(Number.isFinite(p.initial) && p.initial > 0);
    assert.ok(dragSummary(p.returns, p.initial).valid);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
  assert.equal(num("3.5"), 3.5);
});