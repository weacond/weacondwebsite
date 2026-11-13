// tests/trailingStop.test.mjs — lib/trailingStop.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  riskPerUnit, trailingStopPct, currentProfit, rAchieved,
  trailingStopLevel, breakEvenTriggered, lockInR, trailingStopSummary,
  TRAILING_STOP_PRESETS,
} from "../lib/trailingStop.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("riskPerUnit：|100−95| = 5", () => {
  approx(riskPerUnit(100, 95), 5);
  approx(riskPerUnit(100, 105), 5);
  assert.equal(riskPerUnit(100, 100), 0);
});

test("trailingStopPct：5/100 = 0.05", () => {
  approx(trailingStopPct(100, 95), 0.05);
  assert.equal(trailingStopPct(100, 100), 0);
  assert.equal(trailingStopPct(0, 95), 0);
});

test("currentProfit：多头 108−100 = 8；空头 100−92 = 8", () => {
  approx(currentProfit(100, 108, "long"), 8);
  approx(currentProfit(100, 92, "short"), 8);
  approx(currentProfit(100, 90, "long"), -10);
});

test("rAchieved：多头 12/10 = 1.2；空头 8/5 = 1.6", () => {
  approx(rAchieved(100, 90, 112, "long"), 1.2);
  approx(rAchieved(100, 105, 92, "short"), 1.6);
  assert.equal(rAchieved(100, 100, 110, "long"), 0);
});

test("trailingStopLevel：多头 max(90, 112−10)=102", () => {
  approx(trailingStopLevel(100, 90, 112, 10, "long"), 102);
  approx(trailingStopLevel(100, 95, 96, 5, "long"), 95); // 价格低于初始止损则不动
  approx(trailingStopLevel(100, 105, 92, 5, "short"), 97); // 空头 min(105, 92+5)=97
});

test("breakEvenTriggered：R=2.2≥1 → true", () => {
  assert.equal(breakEvenTriggered(100, 90, 112, "long", 1), true);
  assert.equal(breakEvenTriggered(100, 90, 104, "long", 1), false); // R=0.4
});

test("lockInR：按 102 平仓 = 2/10 = 0.2", () => {
  approx(lockInR(100, 90, 102, "long"), 0.2);
  assert.equal(lockInR(100, 100, 102, "long"), 0);
});

test("trailingStopSummary：多头 100/90/112/10", () => {
  const r = trailingStopSummary({ entry: 100, stop: 90, price: 112, trailDistance: 10, side: "long" });
  assert.ok(r.valid);
  approx(r.riskPerUnit, 10);
  approx(r.stopPct, 0.1);
  approx(r.rAchieved, 1.2);
  approx(r.trailingStop, 102);
  assert.equal(r.breakEvenTriggered, true);
  approx(r.lockInR, 0.2);
  approx(r.profit, 12);
});

test("trailingStopSummary：stop=entry → 无效", () => {
  assert.equal(trailingStopSummary({ entry: 100, stop: 100, price: 110, trailDistance: 5 }).valid, false);
});

test("TRAILING_STOP_PRESETS：5 个场景", () => {
  const keys = Object.keys(TRAILING_STOP_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = TRAILING_STOP_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.entry) && p.entry > 0);
    assert.ok(p.side === "long" || p.side === "short");
    assert.ok(p.trailDistance > 0);
  }
});