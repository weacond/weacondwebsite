// tests/correlationLab.test.mjs — lib/correlationLab.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hhi,
  inverseVolWeights,
  classifyPair,
  diversifyPlan,
  drFromMatrix,
  getCorrPreset,
  CORR_PRESETS,
} from "../lib/correlationLab.js";

test("hhi: 等权 = 1/N；单资产集中 = 1", () => {
  assert.ok(Math.abs(hhi(null, 3) - 1 / 3) < 1e-9);
  assert.ok(Math.abs(hhi([0.5, 0.5], 2) - 0.5) < 1e-9);
  assert.ok(Math.abs(hhi([1, 0, 0], 3) - 1) < 1e-9);
  assert.equal(hhi(null, 0), 0);
});

test("inverseVolWeights: 和=1，低波动高权重；全 0 → 等权", () => {
  const w = inverseVolWeights([15, 5, 10]);
  assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(w[1] > w[0] && w[1] > w[2]); // 最低波动（5）权重最大
  const eq = inverseVolWeights([0, 0, 0]);
  assert.deepEqual(eq, [1 / 3, 1 / 3, 1 / 3]);
});

test("classifyPair: 强度 × 方向阈值", () => {
  assert.equal(classifyPair(0.05).strength, "none");
  assert.equal(classifyPair(0.2).strength, "weak");
  assert.equal(classifyPair(0.4).strength, "moderate");
  assert.equal(classifyPair(0.6).strength, "strong");
  assert.equal(classifyPair(0.9).strength, "veryStrong");
  assert.equal(classifyPair(-0.6).dir, "negative");
  assert.equal(classifyPair(0.6).dir, "positive");
  assert.equal(classifyPair(0).dir, "none");
});

test("DR 不变式：全 1 矩阵 = 1；3 个不相关等波动 = √3", () => {
  assert.ok(Math.abs(drFromMatrix([[1, 1, 1], [1, 1, 1], [1, 1, 1]], [15, 6, 12]) - 1) < 1e-9);
  const idm = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  assert.ok(Math.abs(drFromMatrix(idm, [10, 10, 10]) - Math.sqrt(3)) < 1e-9);
});

test("diversifyPlan: 等权权重和=1，DR>1，逐对数 = C(N,2)", () => {
  const p = diversifyPlan("equityBonds", "equal");
  assert.ok(Math.abs(p.weights.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(p.dr > 1);
  assert.equal(p.nPairs, 3); // C(3,2)
  assert.ok(Math.abs(p.hhi - 1 / 3) < 1e-9);
});

test("逆波动配权提升分散化（DR 高于等权）", () => {
  const eq = diversifyPlan("equityBonds", "equal");
  const iv = diversifyPlan("equityBonds", "invVol");
  assert.ok(iv.dr > eq.dr);
  assert.ok(Math.abs(iv.weights.reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

test("高相关篮子（加密）DR 接近 1；预设矩阵对角=1、对称", () => {
  const cb = diversifyPlan("cryptoBasket", "equal");
  assert.ok(cb.dr < 1.2); // 高正相关 → 分散化有限
  for (const key of Object.keys(CORR_PRESETS)) {
    const p = getCorrPreset(key);
    const m = p.corr;
    for (let i = 0; i < m.length; i++) {
      assert.equal(m[i][i], 1);
      for (let j = 0; j < m.length; j++) assert.equal(m[i][j], m[j][i]);
    }
    assert.equal(p.vols.length, m.length);
  }
});

test("未知预设抛错", () => {
  assert.throws(() => getCorrPreset("nope"), /Unknown/);
  assert.throws(() => diversifyPlan("nope"), /Unknown/);
});
