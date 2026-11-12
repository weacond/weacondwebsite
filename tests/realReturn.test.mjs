// tests/realReturn.test.mjs — lib/realReturn.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  realRate, magicNumber, purchasingPower,
  realBand, realReturnSummary, REAL_PRESETS, num,
} from "../lib/realReturn.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("realRate：Fisher 实际利率 = (1+nominal)/(1+inflation) − 1", () => {
  approx(realRate(0.08, 0.02), (1.08 / 1.02) - 1);
  approx(realRate(0, 0), 0);
  approx(realRate(0, 0.05), (1 / 1.05) - 1); // 通胀侵蚀现金
  assert.ok(realRate(0.06, 0.07) < 0);        // 通胀 > 名义 → 实际为负
});

test("realRate：分母 (1+inflation)≤0 → NaN", () => {
  assert.ok(Number.isNaN(realRate(0.08, -1)));
  assert.ok(Number.isNaN(realRate(0.08, -2)));
});

test("realRate：名义越高实际越高；通胀越高实际越低", () => {
  assert.ok(realRate(0.1, 0.02) > realRate(0.05, 0.02));
  assert.ok(realRate(0.08, 0.01) > realRate(0.08, 0.06));
});

test("magicNumber：Bogle 魔数 = nominal − inflation + 2", () => {
  approx(magicNumber(0.07, 0.03), 2.04);
  approx(magicNumber(0.08, 0.02), 2.06);
  approx(magicNumber(0, 0.05), 1.95);
});

test("purchasingPower：1/(1+inflation)^N", () => {
  approx(purchasingPower(0.02, 20), 1 / Math.pow(1.02, 20));
  approx(purchasingPower(0, 30), 1);          // 零通胀购买力不变
  approx(purchasingPower(0.05, 30), 1 / Math.pow(1.05, 30));
  assert.ok(Number.isNaN(purchasingPower(-1, 5)));
});

test("realBand：分级", () => {
  assert.equal(realBand(NaN), "na");
  assert.equal(realBand(-0.01), "losing");
  assert.equal(realBand(0), "low");
  assert.equal(realBand(0.02), "low");
  assert.equal(realBand(0.03), "good");
  assert.equal(realBand(0.05), "good");
});

test("realReturnSummary：bogle 情景，未来实际价值恒等式", () => {
  const p = REAL_PRESETS.bogle;
  const r = realReturnSummary(p);
  assert.ok(r.valid);
  approx(r.real, realRate(0.07, 0.03));
  approx(r.magic, 2.04);
  approx(r.futureNominal, 10000 * Math.pow(1.07, 30));
  // 未来实际价值 = 本金 · ((1+nominal)/(1+inflation))^N
  approx(r.futureReal, 10000 * Math.pow(1.07 / 1.03, 30), 1e-6);
  approx(r.futureReal, r.futureNominal * r.purchasingPower);
  assert.equal(r.band, "good");
});

test("realReturnSummary：未来实际价值 < 未来名义价值（正通胀）", () => {
  const r = realReturnSummary({ nominal: 0.06, inflation: 0.03, years: 20, principal: 10000 });
  assert.ok(r.futureReal < r.futureNominal);
});

test("realReturnSummary：通胀侵蚀情景 → 实际为负", () => {
  const r = realReturnSummary(REAL_PRESETS.erode);
  assert.ok(r.valid);
  assert.ok(r.real < 0);
  assert.equal(r.band, "losing");
});

test("realReturnSummary：分母非法 → 无效", () => {
  assert.equal(realReturnSummary({ nominal: 0.08, inflation: -1 }).valid, false);
});

test("预设：4 个情景，realReturnSummary 均有效", () => {
  const keys = Object.keys(REAL_PRESETS);
  assert.equal(keys.length, 4);
  for (const k of keys) {
    const p = REAL_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.nominal) && Number.isFinite(p.inflation));
    assert.ok(Number.isFinite(p.years) && p.years >= 0);
    assert.ok(realReturnSummary(p).valid);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});