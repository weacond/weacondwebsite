// tests/systemSim.test.mjs — 交易系统模拟器
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  simulateSystem, validSim, simInsight, SIM_PRESETS,
} from "../lib/systemSim.js";

const swing = { winRate: 0.45, rewardRisk: 2, betPct: 5, trades: 200 };

test("有效配置：净值曲线长度 = trades+1", () => {
  const r = simulateSystem(swing, 7);
  assert.equal(r.curve.length, 201);
  assert.equal(r.curve[0], 1);
  assert.ok(Number.isFinite(r.finalReturnPct));
});

test("确定性：同 seed 同输入 → 相同曲线", () => {
  const a = simulateSystem(swing, 7);
  const b = simulateSystem(swing, 7);
  assert.deepEqual(a.curve, b.curve);
  assert.equal(a.finalReturnPct, b.finalReturnPct);
});

test("不同 seed 产生不同曲线", () => {
  const a = simulateSystem(swing, 7);
  const b = simulateSystem(swing, 99);
  assert.notDeepEqual(a.curve, b.curve);
});

test("最大回撤非正", () => {
  const r = simulateSystem(swing, 7);
  assert.ok(r.maxDrawdownPct <= 0);
  assert.ok(r.maxDrawdownPct > -100); // 不会归零
});

test("正期望系统：每笔期望 > 0（0.45×2 − 0.55×1 = 0.35R）", () => {
  const r = simulateSystem(swing, 7);
  assert.ok(Math.abs(r.expectancyR - 0.35) < 1e-9, `expectancyR=${r.expectancyR}`);
  assert.ok(r.expectancyR > 0);
});

test("盈亏平衡配置（胜率0.5 × R1）期望 ≈ 0", () => {
  const r = simulateSystem({ winRate: 0.5, rewardRisk: 1, betPct: 5, trades: 200 }, 3);
  assert.ok(Math.abs(r.expectancyR) < 1e-9, `expectancyR=${r.expectancyR}`);
});

test("破产概率∈[0,1]", () => {
  for (const p of SIM_PRESETS) {
    const r = simulateSystem(p, 5);
    assert.ok(r.probRuin >= 0 && r.probRuin <= 1, `${p.id} ruin=${r.probRuin}`);
  }
});

test("实现胜率落在合理区间", () => {
  const r = simulateSystem({ winRate: 0.6, rewardRisk: 1, betPct: 2, trades: 1000 }, 11);
  assert.ok(r.winRateAchieved > 0.55 && r.winRateAchieved < 0.65, `wr=${r.winRateAchieved}`);
});

test("盈亏比：正收益时 profitFactor 有限且正", () => {
  const r = simulateSystem(swing, 7);
  assert.ok(Number.isFinite(r.profitFactor) || r.profitFactor === Infinity);
  assert.ok(r.profitFactor > 0);
});

test("非法输入：winRate=0 / R≤0 / bet≤0 / trades<1 / seed<0 → 抛错", () => {
  assert.throws(() => simulateSystem({ winRate: 0, rewardRisk: 2, betPct: 5, trades: 100 }));
  assert.throws(() => simulateSystem({ winRate: 0.5, rewardRisk: 0, betPct: 5, trades: 100 }));
  assert.throws(() => simulateSystem({ winRate: 0.5, rewardRisk: 2, betPct: 0, trades: 100 }));
  assert.throws(() => simulateSystem({ winRate: 0.5, rewardRisk: 2, betPct: 5, trades: 0 }));
  assert.throws(() => simulateSystem(swing, -1));
});

test("validSim 边界", () => {
  assert.ok(validSim(swing));
  assert.ok(!validSim({ winRate: 1, rewardRisk: 2, betPct: 5, trades: 10 }));
  assert.ok(!validSim(null));
});

test("SIM_PRESETS 全部通过模拟", () => {
  for (const p of SIM_PRESETS) {
    const r = simulateSystem(p, 7);
    assert.ok(r.curve.length === p.trades + 1);
    assert.ok(typeof simInsight(r) === "string");
  }
});

test("紧下注 vs 松下注：松下注回撤更大（同参数更大 betPct）", () => {
  const tight = simulateSystem({ winRate: 0.45, rewardRisk: 2, betPct: 1, trades: 300 }, 7);
  const loose = simulateSystem({ winRate: 0.45, rewardRisk: 2, betPct: 5, trades: 300 }, 7);
  // 更大下注 → 波动更大，回撤（绝对值）应更大
  assert.ok(Math.abs(loose.maxDrawdownPct) > Math.abs(tight.maxDrawdownPct));
});
