// tests/volTarget.test.mjs — 波动率目标配置器
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  leverageForTarget, positionForTarget, inverseVolWeights,
  portfolioVolApprox, volTargetPortfolio, validVolTarget, volTargetInsight, VOL_PRESETS,
} from "../lib/volTarget.js";

test("杠杆 = 目标/资产波动", () => {
  assert.ok(Math.abs(leverageForTarget(0.1, 0.2) - 0.5) < 1e-9);
});

test("杠杆：资产波动=目标 → 1×", () => {
  assert.ok(Math.abs(leverageForTarget(0.15, 0.15) - 1) < 1e-9);
});

test("杠杆非法输入 → null", () => {
  assert.equal(leverageForTarget(0.1, 0), null);
  assert.equal(leverageForTarget(0.1, -0.1), null);
  assert.equal(leverageForTarget(-0.1, 0.1), null);
});

test("positionForTarget：头寸 = 资金 × 杠杆", () => {
  const r = positionForTarget({ capital: 100000, targetVol: 0.1, assetVol: 0.2 });
  assert.ok(Math.abs(r.leverage - 0.5) < 1e-9);
  assert.ok(Math.abs(r.position - 50000) < 1e-6);
  assert.ok(Math.abs(r.realizedVol - 0.1) < 1e-9);
});

test("inverseVolWeights：高波动资产权重低，和为 1", () => {
  const w = inverseVolWeights([0.1, 0.3]);
  assert.ok(w[0] > w[1]);
  assert.ok(Math.abs(w[0] + w[1] - 1) < 1e-9);
});

test("inverseVolWeights：含 ≤0 → null", () => {
  assert.equal(inverseVolWeights([0.1, 0]), null);
  assert.equal(inverseVolWeights([]), null);
  assert.equal(inverseVolWeights(null), null);
});

test("portfolioVolApprox：等权近似", () => {
  const v = portfolioVolApprox([0.5, 0.5], [0.1, 0.3]);
  assert.ok(Math.abs(v - 0.2) < 1e-9);
});

test("volTargetPortfolio：缩放后组合波动=目标", () => {
  const r = volTargetPortfolio([0.1, 0.3], 0.15);
  assert.ok(r.ok);
  assert.ok(Math.abs(portfolioVolApprox(r.weights, [0.1, 0.3]) - 0.15) < 1e-9);
  assert.ok(Number.isFinite(r.leverage));
});

test("volTargetPortfolio：目标>组合波动 → 杠杆>1", () => {
  const r = volTargetPortfolio([0.1, 0.1], 0.2);
  assert.ok(r.leverage > 1, `leverage=${r.leverage}`);
});

test("volTargetPortfolio 非法波动 → ok=false", () => {
  const r = volTargetPortfolio([0.1, 0], 0.1);
  assert.equal(r.ok, false);
});

test("validVolTarget 边界", () => {
  assert.ok(validVolTarget({ capital: 100000, targetVol: 0.1, assetVol: 0.15 }));
  assert.ok(!validVolTarget({ capital: 100000, targetVol: 0.1, assetVol: 0 }));
  assert.ok(!validVolTarget({ capital: 100000, targetVol: 0.1, assetVol: -0.1 }));
});

test("volTargetInsight 对高杠杆给出警告", () => {
  const r = positionForTarget({ capital: 100000, targetVol: 0.3, assetVol: 0.1 });
  assert.ok(volTargetInsight(r, 0.3, 0.1).includes("偏高"));
});

test("VOL_PRESETS 覆盖 3 种情景", () => {
  assert.equal(VOL_PRESETS.length, 3);
  for (const p of VOL_PRESETS) {
    const r = positionForTarget(p);
    assert.ok(r.leverage != null, p.id);
  }
});
