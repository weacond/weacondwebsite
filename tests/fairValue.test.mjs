// tests/fairValue.test.mjs — lib/fairValue.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  peFairValue, ddmFairValue, marginOfSafety, upside,
  mosBand, fairValueSummary, FAIRVALUE_PRESETS, num,
} from "../lib/fairValue.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("peFairValue：FV = EPS × 目标 P/E", () => {
  approx(peFairValue(5, 15), 75);
  approx(peFairValue(0, 15), 0);
  approx(peFairValue(5, 0), 0);
});

test("ddmFairValue：戈登增长 FV = D₀(1+g)/(r−g)", () => {
  approx(ddmFairValue(2, 0.03, 0.08), (2 * 1.03) / (0.08 - 0.03)); // 41.2
  approx(ddmFairValue(0, 0.03, 0.08), 0);
});

test("ddmFairValue：r ≤ g 或 r ≤ 0 时无法收敛 → NaN", () => {
  assert.ok(Number.isNaN(ddmFairValue(2, 0.08, 0.08))); // r == g
  assert.ok(Number.isNaN(ddmFairValue(2, 0.1, 0.08)));  // g > r
  assert.ok(Number.isNaN(ddmFairValue(2, 0.03, 0)));    // r == 0
  assert.ok(Number.isNaN(ddmFairValue(2, 0.03, -0.01))); // r < 0
});

test("marginOfSafety：(FV − 价格)/FV", () => {
  approx(marginOfSafety(75, 60), 0.2);
  approx(marginOfSafety(75, 75), 0);
  approx(marginOfSafety(75, 90), -0.2);
  assert.ok(Number.isNaN(marginOfSafety(0, 60))); // FV ≤ 0
});

test("upside：(FV − 价格)/价格", () => {
  approx(upside(75, 60), 0.25);
  approx(upside(75, 75), 0);
  assert.ok(Number.isNaN(upside(75, 0))); // 价格 ≤ 0
});

test("mosBand：分级", () => {
  assert.equal(mosBand(NaN), "na");
  assert.equal(mosBand(-0.1), "overvalued");
  assert.equal(mosBand(0), "fair");
  assert.equal(mosBand(0.2), "fair");
  assert.equal(mosBand(0.3), "cheap");
  assert.equal(mosBand(0.4), "cheap");
  assert.equal(mosBand(0.5), "deep");
});

test("fairValueSummary：P/E 回归基准 + 安全边际 + 分级", () => {
  const r = fairValueSummary({ price: 60, eps: 5, targetPE: 15 });
  assert.ok(r.valid);
  approx(r.fairValue, 75);
  approx(r.marginOfSafety, 0.2);
  approx(r.upside, 0.25);
  assert.equal(r.band, "fair");
});

test("fairValueSummary：高估情景 → 负安全边际", () => {
  const r = fairValueSummary(FAIRVALUE_PRESETS.overvalued);
  assert.ok(r.valid);
  approx(r.fairValue, 60);
  approx(r.marginOfSafety, -1);
  assert.equal(r.band, "overvalued");
});

test("fairValueSummary：DDM 作为次级估值一并给出", () => {
  const r = fairValueSummary(FAIRVALUE_PRESETS.deepValue);
  approx(r.ddmFairValue, (2 * 1.03) / (0.08 - 0.03));
  assert.ok(r.marginOfSafety > 0.5); // 深度价值
});

test("fairValueSummary：价格 ≤ 0 或 FV ≤ 0 → 无效", () => {
  assert.equal(fairValueSummary({ price: 0, eps: 5, targetPE: 15 }).valid, false);
  assert.equal(fairValueSummary({ price: 60, eps: 0, targetPE: 15 }).valid, false);
});

test("预设：4 个情景，fairValueSummary 均有效", () => {
  const keys = Object.keys(FAIRVALUE_PRESETS);
  assert.equal(keys.length, 4);
  for (const k of keys) {
    const p = FAIRVALUE_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.price) && p.price > 0);
    assert.ok(fairValueSummary(p).valid);
  }
  assert.equal(fairValueSummary(FAIRVALUE_PRESETS.deepValue).band, "deep");
  assert.equal(fairValueSummary(FAIRVALUE_PRESETS.overvalued).band, "overvalued");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});