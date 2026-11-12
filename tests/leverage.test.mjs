// tests/leverage.test.mjs — 杠杆与强平计算器
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validLeverage, notional, leveragedPnl, liquidationMove, liquidationPrice,
  maxLossForMove, adverseMoveForMaxLoss, leverageBand, leverageInsight,
  LEVERAGE_PRESETS, getLeveragePreset,
} from "../lib/leverage.js";

test("validLeverage：>0 且有限", () => {
  assert.equal(validLeverage(1), true);
  assert.equal(validLeverage(100), true);
  assert.equal(validLeverage(0), false);
  assert.equal(validLeverage(-5), false);
  assert.equal(validLeverage(NaN), false);
  assert.equal(validLeverage(Infinity), false);
});

test("notional：账户 × 杠杆；非法抛错", () => {
  assert.equal(notional(1000, 2), 2000);
  assert.equal(notional(0, 5), 0);
  assert.throws(() => notional(-1, 2));
  assert.throws(() => notional(1000, 0));
  assert.throws(() => notional(1000, NaN));
});

test("leveragedPnl：方向 × 杠杆，封顶 -100", () => {
  assert.equal(leveragedPnl(10, 5, "long"), 50);
  assert.equal(leveragedPnl(-10, 5, "long"), -50);
  assert.equal(leveragedPnl(10, 5, "short"), -50);
  assert.equal(leveragedPnl(-10, 5, "short"), 50);
  // 反向 30% × 5 = -150 → 封顶 -100（已强平）
  assert.equal(leveragedPnl(-30, 5, "long"), -100);
  assert.throws(() => leveragedPnl(10, 0));
  assert.throws(() => leveragedPnl(NaN, 5));
});

test("leveragedPnl 确定性", () => {
  assert.equal(leveragedPnl(12.5, 3, "long"), leveragedPnl(12.5, 3, "long"));
  assert.equal(leveragedPnl(12.5, 3, "long"), 37.5);
});

test("liquidationMove：100/杠杆 − 维持保证金，≤0 归 0", () => {
  assert.equal(liquidationMove(10, 0), 10);
  assert.equal(liquidationMove(10, 1), 9);
  assert.equal(liquidationMove(20, 0), 5);
  assert.equal(liquidationMove(100, 0.5), 0.5);
  // 维持保证金 ≥ 强平幅度 → 0（无缓冲）
  assert.equal(liquidationMove(10, 11), 0);
  assert.throws(() => liquidationMove(0, 0));
  assert.throws(() => liquidationMove(10, -1));
  assert.throws(() => liquidationMove(10, 100));
});

test("liquidationPrice：多在下、空在上", () => {
  assert.ok(Math.abs(liquidationPrice(100, 10, "long", 0) - 90) < 1e-9);
  assert.ok(Math.abs(liquidationPrice(100, 10, "short", 0) - 110) < 1e-9);
  // 维持保证金 1% → 多头 100×(1−9/100)=91
  assert.ok(Math.abs(liquidationPrice(100, 10, "long", 1) - 91) < 1e-9);
  assert.throws(() => liquidationPrice(0, 10));
  assert.throws(() => liquidationPrice(-10, 10));
  assert.throws(() => liquidationPrice(100, 0));
});

test("maxLossForMove：min(变动×杠杆, 100)", () => {
  assert.equal(maxLossForMove(5, 10), 50);
  assert.equal(maxLossForMove(5, 30), 100); // 150 封顶 100
  assert.equal(maxLossForMove(1, 20), 20);
  assert.throws(() => maxLossForMove(0, 10));
  assert.throws(() => maxLossForMove(5, -1));
  assert.throws(() => maxLossForMove(5, NaN));
});

test("adverseMoveForMaxLoss：maxLoss/杠杆", () => {
  assert.ok(Math.abs(adverseMoveForMaxLoss(5, 20) - 4) < 1e-12);
  assert.ok(Math.abs(adverseMoveForMaxLoss(100, 10) - 0.1) < 1e-12);
  assert.throws(() => adverseMoveForMaxLoss(5, 0));
  assert.throws(() => adverseMoveForMaxLoss(5, 101));
  assert.throws(() => adverseMoveForMaxLoss(0, 20));
});

test("leverageBand：分级 + 强平幅度", () => {
  assert.equal(leverageBand(1).band, "low");
  assert.equal(leverageBand(3).band, "moderate");
  assert.equal(leverageBand(7).band, "high");
  assert.equal(leverageBand(20).band, "extreme");
  assert.ok(Math.abs(leverageBand(10).liqMove - 10) < 1e-9);
  assert.equal(leverageBand(20).labelEn, "Extreme");
  assert.throws(() => leverageBand(0));
});

test("leverageInsight：返回字符串，强平/分级文案", () => {
  const s1 = leverageInsight(1, 10, "long");
  const s2 = leverageInsight(10, 10, "long");
  const s3 = leverageInsight(5, -25, "long"); // 反向 -25%×5=-125→强平
  assert.equal(typeof s1, "string");
  assert.ok(s1.length > 0);
  assert.ok(s2.includes("极高"));
  assert.ok(s3.includes("强平"));
});

test("LEVERAGE_PRESETS：5 个 + getLeveragePreset", () => {
  assert.equal(LEVERAGE_PRESETS.length, 5);
  for (const p of LEVERAGE_PRESETS) {
    assert.ok(validLeverage(p.leverage));
    assert.ok(typeof p.label === "string");
  }
  assert.equal(getLeveragePreset("crypto").leverage, 20);
  assert.throws(() => getLeveragePreset("nope"));
});
