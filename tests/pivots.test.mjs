// 支点测试 — lib/pivots.js
// 测试哲学：用「手算可验证的公式关系」断言，而非背下常数。
//   取 H=110, L=100, C=105 → P=105, 振幅 range=10，各档可手算核对。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classicPivots,
  woodiePivots,
  camarillaPivots,
  fibonacciPivots,
  pivotLevels,
  pivotTrend,
} from "../lib/pivots.js";

const H = 110;
const L = 100;
const C = 105; // P = 105, range = 10

test("classicPivots: 经典公式各档可手算核对", () => {
  const p = classicPivots(H, L, C);
  assert.equal(p.pivot, 105);
  assert.equal(p.range, 10);
  assert.equal(p.r1, 110); // 2P − L
  assert.equal(p.s1, 100); // 2P − H
  assert.equal(p.r2, 115); // P + range
  assert.equal(p.s2, 95); //  P − range
  assert.equal(p.r3, 120); // H + range
  assert.equal(p.s3, 90); //  L − range
  // 对称性：R1−P == P−S1 == range/... ；R2−P == P−S2 == range
  assert.equal(p.r2 - p.pivot, p.pivot - p.s2);
  assert.equal(p.r3 - p.pivot, p.pivot - p.s3);
});

test("classicPivots: 任一入参非有限数 → null（绝不臆造）", () => {
  assert.equal(classicPivots(NaN, L, C), null);
  assert.equal(classicPivots(H, NaN, C), null);
  assert.equal(classicPivots(H, L, NaN), null);
  assert.equal(classicPivots(undefined, L, C), null);
});

test("woodiePivots: 含 prevClose；缺 prevClose → null", () => {
  const pc = 103;
  const w = woodiePivots(H, L, C, pc);
  // P = (H+L+2C+pc)/4 = (110+100+210+103)/4 = 523/4 = 130.75
  assert.equal(w.pivot, 130.75);
  assert.equal(w.r1, 130.75 + 0.5 * 10); // 135.75
  assert.equal(w.s1, 130.75 - 0.5 * 10); // 125.75
  assert.equal(w.r2, 130.75 + 10);
  assert.equal(woodiePivots(H, L, C, NaN), null, "缺 prevClose → null");
  assert.equal(woodiePivots(H, L, C), null, "无 prevClose → null");
});

test("camarillaPivots: 分母 12/6/4/2 的 1~4 档", () => {
  const c = camarillaPivots(H, L, C);
  assert.equal(c.pivot, 105);
  assert.ok(Math.abs(c.r1 - (105 + 10 / 12)) < 1e-9, "R1 = P + range/12");
  assert.ok(Math.abs(c.r2 - (105 + 10 / 6)) < 1e-9, "R2 = P + range/6");
  assert.ok(Math.abs(c.r3 - (105 + 10 / 4)) < 1e-9, "R3 = P + range/4");
  assert.ok(Math.abs(c.r4 - (105 + 10 / 2)) < 1e-9, "R4 = P + range/2");
  assert.ok(Math.abs(c.s4 - (105 - 10 / 2)) < 1e-9, "S4 = P − range/2");
  // 档位单调：R1<R2<R3<R4，且 S1>S2>S3>S4
  assert.ok(c.r1 < c.r2 && c.r2 < c.r3 && c.r3 < c.r4);
  assert.ok(c.s1 > c.s2 && c.s2 > c.s3 && c.s3 > c.s4);
});

test("fibonacciPivots: 0.382/0.618/1.0 回撤，对称于 P", () => {
  const f = fibonacciPivots(H, L, C);
  assert.equal(f.pivot, 105);
  assert.ok(Math.abs(f.rF1 - (105 + 0.382 * 10)) < 1e-9, "rF1 = P + 0.382·range");
  assert.ok(Math.abs(f.sF1 - (105 - 0.382 * 10)) < 1e-9, "sF1 = P − 0.382·range");
  assert.ok(Math.abs(f.rF2 - (105 + 0.618 * 10)) < 1e-9, "rF2 = P + 0.618·range");
  assert.ok(Math.abs(f.rF3 - 115) < 1e-9, "rF3 = P + 1.0·range");
  // 对称
  assert.ok(Math.abs(f.rF1 + f.sF1 - 2 * 105) < 1e-9, "rF1/sF1 关于 P 对称");
});

test("pivotLevels: 按名称分发，未知回退 classic", () => {
  assert.deepEqual(
    Object.keys(pivotLevels("classic", H, L, C)),
    ["pivot", "r1", "s1", "r2", "s2", "r3", "s3", "range"]
  );
  assert.equal(pivotLevels("woodie", H, L, C, 103).pivot, 130.75);
  assert.equal(pivotLevels("camarilla", H, L, C).r4, 110);
  assert.equal(pivotLevels("fibonacci", H, L, C).rF1, 105 + 3.82);
  // 未知 variant → classic
  assert.equal(pivotLevels("nonsense", H, L, C).pivot, 105);
  // 非法输入透传 null
  assert.equal(pivotLevels("classic", NaN, L, C), null);
});

test("pivotTrend: 依据 R1/S1 区间判定多空", () => {
  const { r1, s1 } = classicPivots(H, L, C); // r1=110, s1=100
  assert.equal(pivotTrend(112, { r1, s1 }), "bullish", "≥ R1 → 偏多");
  assert.equal(pivotTrend(110, { r1, s1 }), "bullish", "恰为 R1 → 偏多");
  assert.equal(pivotTrend(105, { r1, s1 }), "neutral", "S1≤价<R1 → 中性");
  assert.equal(pivotTrend(99, { r1, s1 }), "bearish", "< S1 → 偏空");
  assert.equal(pivotTrend(100, { r1, s1 }), "neutral", "恰为 S1 → 中性");
  // 退化 → unknown
  assert.equal(pivotTrend(NaN, { r1, s1 }), "unknown");
  assert.equal(pivotTrend(105, null), "unknown");
  assert.equal(pivotTrend(105, {}), "unknown");
});
