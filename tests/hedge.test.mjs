// tests/hedge.test.mjs — 最小方差对冲比率
import { test } from "node:test";
import assert from "node:assert/strict";
import { hedgeRatio, validHedge, hedgeInsight, HEDGE_PRESETS } from "../lib/hedge.js";

test("对冲比率 h = ρ·σ_a/σ_b", () => {
  const r = hedgeRatio({ rho: 0.5, volA: 10, volB: 20 });
  assert.ok(Math.abs(r.hedgeRatio - 0.25) < 1e-9, `h=${r.hedgeRatio}`);
});

test("完全相关 ρ=1 时残余方差 = 0", () => {
  const r = hedgeRatio({ rho: 1, volA: 15, volB: 15 });
  assert.ok(Math.abs(r.residualVar) < 1e-9, `residualVar=${r.residualVar}`);
  assert.ok(Math.abs(r.residualVol) < 1e-9);
});

test("无关 ρ=0 时对冲比率 = 0，残余波动 = σ_a", () => {
  const r = hedgeRatio({ rho: 0, volA: 15, volB: 10 });
  assert.ok(Math.abs(r.hedgeRatio) < 1e-9);
  assert.ok(Math.abs(r.residualVol - 15) < 1e-9, `residualVol=${r.residualVol}`);
});

test("最小方差权重之和 = 1", () => {
  for (const p of HEDGE_PRESETS) {
    const r = hedgeRatio(p);
    assert.ok(Math.abs(r.wA + r.wB - 1) < 1e-9, `${p.id}: ${r.wA}+${r.wB}`);
  }
});

test("最小方差组合波动 ≤ 朴素 50/50（reductionPct ≥ 0）", () => {
  for (const p of HEDGE_PRESETS) {
    const r = hedgeRatio(p);
    assert.ok(r.reductionPct >= -1e-9, `${p.id}: reduction=${r.reductionPct}`);
  }
});

test("高相关 ρ=0.9 且波动相近 → 对冲比率接近 1", () => {
  const r = hedgeRatio({ rho: 0.9, volA: 20, volB: 22 });
  assert.ok(Math.abs(r.hedgeRatio - 0.9 * 20 / 22) < 1e-9);
  assert.ok(Math.abs(r.hedgeRatio - 0.8182) < 1e-3);
});

test("负相关 σ 仍正（residualVol 有限）", () => {
  const r = hedgeRatio({ rho: -0.5, volA: 15, volB: 18 });
  assert.ok(Number.isFinite(r.residualVol));
  assert.ok(r.residualVol >= 0);
});

test("非法输入：σ≤0 / ρ 越界 → 抛错", () => {
  assert.throws(() => hedgeRatio({ rho: 0.5, volA: 0, volB: 10 }));
  assert.throws(() => hedgeRatio({ rho: 2, volA: 10, volB: 10 }));
  assert.throws(() => hedgeRatio({ rho: -1.5, volA: 10, volB: 10 }));
});

test("validHedge 边界", () => {
  assert.ok(validHedge({ rho: -1, volA: 10, volB: 10 }));
  assert.ok(validHedge({ rho: 1, volA: 10, volB: 10 }));
  assert.ok(!validHedge({ rho: 0, volA: -1, volB: 10 }));
  assert.ok(!validHedge(null));
});

test("hedgeInsight 返回字符串且对完全相关给出 1:1 结论", () => {
  const r = hedgeRatio({ rho: 1, volA: 20, volB: 20 });
  assert.equal(typeof hedgeInsight(r, 1), "string");
  assert.ok(hedgeInsight(r, 1).includes("1:1"));
});
