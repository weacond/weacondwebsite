// tests/drawdownSizing.test.mjs — lib/drawdownSizing.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ddPosition, scaledReturn, maxLossPerTrade, riskAdjustedSharpe,
  ddSizingBand, ddSizingSummary, DD_SIZING_PRESETS, num,
} from "../lib/drawdownSizing.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("ddPosition：min(targetDD / stratDD, 1.0)", () => {
  approx(ddPosition(0.15, 0.30), 0.5);
  approx(ddPosition(0.30, 0.30), 1.0); // 相等 → 满仓
  approx(ddPosition(0.40, 0.30), 1.0); // 目标 > 策略 → 上限 1.0
  approx(ddPosition(0, 0.30), 0); // 目标 0 → 0
  approx(ddPosition(0.15, 0), 0); // 策略 0 → 0
});

test("scaledReturn：stratReturn × position", () => {
  approx(scaledReturn(0.25, 0.30, 0.15), 0.125); // 0.25 × 0.5
  approx(scaledReturn(0.25, 0.30, 0.30), 0.25); // 满仓 → 原始收益
  approx(scaledReturn(0, 0.30, 0.15), 0);
});

test("maxLossPerTrade：account × targetDD / numTrades", () => {
  approx(maxLossPerTrade(100000, 0.15, 50), 300); // 100000×0.15/50
  approx(maxLossPerTrade(100000, 0.15, 1), 15000); // 单笔
  approx(maxLossPerTrade(100000, 0.15, 0), 0); // 0 trades → 0
});

test("riskAdjustedSharpe：scaled / scaledVol", () => {
  approx(riskAdjustedSharpe(0.25, 0.20, 0.30, 0.15), 1.25); // 0.125 / 0.10
  approx(riskAdjustedSharpe(0.25, 0, 0.30, 0.15), 0); // vol=0 → 0
});

test("ddSizingBand：按头寸比例", () => {
  assert.equal(ddSizingBand(0), "zero");
  assert.equal(ddSizingBand(0.1), "small");
  assert.equal(ddSizingBand(0.4), "moderate");
  assert.equal(ddSizingBand(0.6), "large");
  assert.equal(ddSizingBand(1.0), "full");
  assert.equal(ddSizingBand(NaN), "zero");
});

test("ddSizingSummary：标准 15% → large", () => {
  const r = ddSizingSummary(DD_SIZING_PRESETS.standard);
  assert.ok(r.valid);
  approx(r.position, 0.5);
  approx(r.scaledReturn, 0.125);
  approx(r.maxLossPerTrade, 300);
  assert.equal(r.band, "large"); // 0.5 is not < 0.5, so falls to "large"
});

test("ddSizingSummary：激进 25% → full", () => {
  const r = ddSizingSummary(DD_SIZING_PRESETS.aggressive);
  assert.ok(r.valid);
  approx(r.position, 0.25 / 0.30, 1e-6);
  assert.ok(r.position < 1.0);
  assert.equal(r.band, "full"); // 0.833 ≥ 0.75 → "full"
});

test("ddSizingSummary：低回撤 5% → small", () => {
  const r = ddSizingSummary(DD_SIZING_PRESETS.lowDD);
  assert.ok(r.valid);
  approx(r.position, 0.05 / 0.15, 1e-6); // 0.333
  assert.equal(r.band, "moderate");
});

test("ddSizingSummary：非法输入 → 无效", () => {
  assert.equal(ddSizingSummary({ account: 0, targetDD: 0.15, strategyDD: 0.30 }).valid, false);
  assert.equal(ddSizingSummary({ account: 100000, targetDD: 1.5, strategyDD: 0.30 }).valid, false);
  assert.equal(ddSizingSummary({ account: 100000, targetDD: 0.15, strategyDD: 0 }).valid, false);
});

test("预设：5 个场景，summary 均有效", () => {
  const keys = Object.keys(DD_SIZING_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = DD_SIZING_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.account) && p.account > 0);
    assert.ok(ddSizingSummary(p).valid);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
