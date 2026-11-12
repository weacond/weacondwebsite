// tests/zscore.test.mjs — lib/zscore.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  erf, normalCdf, zScore, percentileFromZ, zBand, standardize, zView,
  ZSCORE_PRESETS, num,
} from "../lib/zscore.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("erf：偶 0、奇函数、趋于 ±1", () => {
  approx(erf(0), 0);
  approx(erf(1), erf(-1) * -1, 1e-9); // 奇函数
  assert.ok(erf(5) > 0.99999, "erf(5) ≈ 1");
  assert.ok(erf(-5) < -0.99999, "erf(−5) ≈ −1");
});

test("normalCdf：标准正态关键值（对照已知 Φ 表）", () => {
  approx(normalCdf(0), 0.5, 1e-4);
  approx(normalCdf(1), 0.8413, 1e-3);
  approx(normalCdf(1.96), 0.975, 1e-3);
  approx(normalCdf(2), 0.9772, 1e-3);
  approx(normalCdf(-1), 0.1587, 1e-3);
  approx(normalCdf(-1.96), 0.025, 1e-3);
});

test("normalCdf：单调递增、值域 [0,1]", () => {
  const a = normalCdf(-3), b = normalCdf(0), c = normalCdf(3);
  assert.ok(a < b && b < c, "单调");
  assert.ok(a >= 0 && c <= 1, "值域");
});

test("zScore：(x−μ)/σ", () => {
  approx(zScore(10, 0, 2).z, 5);
  approx(zScore(20, 20, 2).z, 0);
  approx(zScore(30, 20, 2).z, 5);
  approx(zScore(0.15, 0.05, 0.02).z, 5); // 收益率离群
  assert.ok(zScore(10, 20, 2).valid);
});

test("zScore：std ≤ 0 → 无效", () => {
  assert.ok(!zScore(10, 20, 0).valid);
  assert.ok(!zScore(10, 20, -2).valid);
});

test("percentileFromZ：z=0→50；±1.96→约 97.5/2.5", () => {
  approx(percentileFromZ(0), 50, 1e-3);
  approx(percentileFromZ(1.96), 97.5, 1e-2);
  approx(percentileFromZ(-1.96), 2.5, 1e-2);
});

test("zBand：分级（|z| 越大越极端）", () => {
  assert.equal(zBand(0), "neutral");
  assert.equal(zBand(0.5), "neutral");
  assert.equal(zBand(1), "notable");
  assert.equal(zBand(1.5), "notable");
  assert.equal(zBand(2), "rare");
  assert.equal(zBand(-2.5), "rare");
  assert.equal(zBand(3), "extreme");
  assert.equal(zBand(-3.2), "extreme");
});

test("standardize：[10,30,50] → 均值 30、std 20、分数 [−1,0,1]", () => {
  const r = standardize([10, 30, 50]);
  approx(r.mean, 30);
  approx(r.std, 20);
  assert.equal(r.scores.length, 3);
  approx(r.scores[0], -1);
  approx(r.scores[1], 0);
  approx(r.scores[2], 1);
  assert.ok(r.valid);
});

test("standardize：少于 2 个元素 → 无效；忽略非法值", () => {
  assert.ok(!standardize([5]).valid);
  assert.ok(!standardize([]).valid);
  const r = standardize([10, "x", 30, 50]); // 非法值被过滤
  assert.equal(r.scores.length, 3);
});

test("zView：单点视图含 z / 百分位 / 分级；std=0 无效", () => {
  const r = zView(10, 20, 2);
  approx(r.z, -5);
  assert.equal(r.band, "extreme");
  assert.ok(r.pctile >= 0 && r.pctile <= 100);
  const bad = zView(10, 20, 0);
  assert.ok(!bad.valid);
  assert.equal(bad.band, "invalid");
});

test("预设：4 个场景，字段完整且 std>0", () => {
  const keys = Object.keys(ZSCORE_PRESETS);
  assert.equal(keys.length, 4);
  for (const k of keys) {
    const p = ZSCORE_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.mean));
    assert.ok(p.std > 0);
    assert.ok(zScore(p.x, p.mean, p.std).valid);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
  assert.equal(num("3.5"), 3.5);
});