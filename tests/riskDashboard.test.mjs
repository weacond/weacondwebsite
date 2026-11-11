// tests/riskDashboard.test.mjs — lib/riskDashboard.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanCurve,
  returnsFromCurve,
  totalReturn,
  cagr,
  buildRiskDashboard,
  riskTier,
  getCurvePreset,
  CURVE_PRESETS,
} from "../lib/riskDashboard.js";

// 手算锚点：[100,110,90,100,120]
// returns = [0.10, -20/110, 10/90, 0.20]
// mdd = (110-90)/110 = 0.181818；recovery：trough idx2(90)→首个≥110 为 idx4(120) → 4-2=2
const C = [100, 110, 90, 100, 120];

test("returnsFromCurve: 长度 = 点数-1，且数值正确", () => {
  const r = returnsFromCurve(C);
  assert.equal(r.length, 4);
  assert.ok(Math.abs(r[0] - 0.1) < 1e-9);
  assert.ok(Math.abs(r[1] - (-20 / 110)) < 1e-9);
  assert.ok(Math.abs(r[3] - 0.2) < 1e-9);
});

test("cleanCurve: 过滤非有限值与 {value} 解包", () => {
  assert.deepEqual(cleanCurve([100, NaN, "x", 110, Infinity, { value: 120 }, null]), [100, 110, 120]);
  assert.deepEqual(cleanCurve("notarray"), []);
  assert.deepEqual(cleanCurve([{ value: 5 }, { value: 6 }]), [5, 6]);
});

test("totalReturn: [100→120] = 20%", () => {
  assert.ok(Math.abs(totalReturn(C) - 20) < 1e-9);
  assert.equal(totalReturn([100]), 0); // 单点
  assert.equal(totalReturn([0, 5]), 0); // 首点 0
});

test("cagr: years=1 时 = 总收益；首末≤0 或 years≤0 → 0", () => {
  assert.ok(Math.abs(cagr(C, 1) - 20) < 1e-9);
  assert.equal(cagr(C, 0), 0);
  assert.equal(cagr([100, 101], -1), 0);
});

test("buildRiskDashboard: mdd / recovery / recovered 与手算一致", () => {
  const d = buildRiskDashboard(C, { years: 1 });
  assert.ok(Math.abs(d.drawdown.mdd - 20 / 110) < 1e-6);
  assert.ok(Math.abs(d.drawdown.mddPct - 2000 / 110) < 1e-6);
  assert.equal(d.drawdown.recovery, 2);
  assert.equal(d.drawdown.recovered, true);
  assert.equal(d.n, 5);
});

test("riskTier: 按 mdd 分 4 档边界", () => {
  const t1 = buildRiskDashboard([100, 105, 99], { years: 1 }); // mdd ≈ 0.0526 < 0.1
  const t2 = buildRiskDashboard(C, { years: 1 }); // mdd 0.1818
  const t3 = buildRiskDashboard([100, 100, 70], { years: 1 }); // mdd 0.30
  const t4 = buildRiskDashboard([100, 100, 55], { years: 1 }); // mdd 0.45
  assert.equal(riskTier(t1).tier, 1);
  assert.equal(riskTier(t2).tier, 2);
  assert.equal(riskTier(t3).tier, 3);
  assert.equal(riskTier(t4).tier, 4);
  assert.equal(riskTier({ drawdown: { mdd: NaN } }).tier, 0);
});

test("不变式: var99 ≥ var95 且 cvar95 ≥ var95", () => {
  const d = buildRiskDashboard(C, { years: 1 });
  assert.ok(d.tail.var99 >= d.tail.var95 - 1e-12);
  assert.ok(d.tail.cvar95 >= d.tail.var95 - 1e-12);
});

test("单调上升: mdd=0，calmar 与 omega 封顶 999，tier=1", () => {
  const d = buildRiskDashboard([100, 101, 102, 103, 104], { years: 1 });
  assert.equal(d.drawdown.mdd, 0);
  assert.equal(d.ratios.calmar, 999);
  assert.equal(d.ratios.omega, 999);
  assert.equal(riskTier(d).tier, 1);
});

test("点数不足 2 抛错；未知预设抛错", () => {
  assert.throws(() => buildRiskDashboard([100]), /at least 2/);
  assert.throws(() => buildRiskDashboard([]), /at least 2/);
  assert.throws(() => getCurvePreset("nope"), /Unknown/);
});

test("内置预设都能生成有效仪表盘（n≥2，含回撤/尾部/比率三块）", () => {
  for (const key of Object.keys(CURVE_PRESETS)) {
    const p = getCurvePreset(key);
    const d = buildRiskDashboard(p.curve, { years: p.years });
    assert.ok(d.n >= 2, `${key}: n`);
    assert.ok(d.tail.var95 > 0, `${key}: var95`);
    assert.ok(typeof d.ratios.sharpe === "number", `${key}: sharpe`);
    assert.ok(typeof d.drawdown.mdd === "number", `${key}: mdd`);
  }
});
