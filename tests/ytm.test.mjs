// tests/ytm.test.mjs — lib/ytm.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  priceAtRate, yieldToMaturity, yieldBand, ytmSummary, YTM_PRESETS, num,
} from "../lib/ytm.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("priceAtRate：r=0 → 票息总额+面值", () => {
  // 10 年、5% 票息、面值 100：r=0 → 5×10 + 100 = 150
  approx(priceAtRate(100, 0.05, 10, 0), 150);
});

test("priceAtRate：r=票息 → 平价（价格=面值）", () => {
  approx(priceAtRate(100, 0.05, 10, 0.05), 100, 1e-6);
});

test("priceAtRate：r 越高价格越低（单调递减）", () => {
  const p1 = priceAtRate(100, 0.05, 10, 0.04);
  const p2 = priceAtRate(100, 0.05, 10, 0.06);
  assert.ok(p1 > p2);
});

test("yieldToMaturity：平价 → YTM≈票息", () => {
  const y = yieldToMaturity(100, 0.05, 100, 10);
  approx(y, 0.05, 1e-4);
});

test("yieldToMaturity：溢价 → YTM<票息；折价 → YTM>票息", () => {
  assert.ok(yieldToMaturity(100, 0.06, 110, 10) < 0.06); // 溢价
  assert.ok(yieldToMaturity(100, 0.04, 90, 10) > 0.04);  // 折价
});

test("yieldToMaturity：往返校验 priceAtRate(ytm)≈价格", () => {
  for (const p of Object.values(YTM_PRESETS)) {
    const y = yieldToMaturity(p.face, p.couponRate, p.price, p.years);
    assert.ok(y != null, `${p.id} 有解`);
    approx(priceAtRate(p.face, p.couponRate, p.years, y), p.price, 1e-4);
  }
});

test("yieldToMaturity：越界 → 无解 (null)", () => {
  // 价格低于 r=hi 时的最小可达价（≈2.10）→ 无解
  assert.equal(yieldToMaturity(100, 0.02, 1, 10), null);
  // 非法输入
  assert.equal(yieldToMaturity(0, 0.05, 100, 10), null);
  assert.equal(yieldToMaturity(100, 0.05, 0, 10), null);
  assert.equal(yieldToMaturity(100, 0.05, 100, 0), null);
});

test("yieldBand：分级", () => {
  assert.equal(yieldBand(null), "na");
  assert.equal(yieldBand(-0.01), "negative");
  assert.equal(yieldBand(0.02), "low");
  assert.equal(yieldBand(0.04), "moderate");
  assert.equal(yieldBand(0.08), "high");
});

test("ytmSummary：平价 → fair=true 且 YTM≈票息", () => {
  const r = ytmSummary(YTM_PRESETS.par);
  assert.ok(r.valid);
  assert.equal(r.fair, true);
  approx(r.ytm, 0.05, 1e-4);
  assert.equal(r.band, "moderate");
});

test("ytmSummary：低收益→low，高收益→high", () => {
  assert.equal(ytmSummary(YTM_PRESETS.low).band, "low");
  assert.equal(ytmSummary(YTM_PRESETS.highYield).band, "high");
});

test("ytmSummary：非法输入 → 无效", () => {
  assert.equal(ytmSummary({ face: 0, couponRate: 0.05, price: 100, years: 10 }).valid, false);
  assert.equal(ytmSummary({ face: 100, couponRate: 0.05, price: 0, years: 10 }).valid, false);
  assert.equal(ytmSummary({ face: 100, couponRate: 0.05, price: 100, years: 0 }).valid, false);
});

test("预设：5 个情景，summary 均有效且有解", () => {
  const keys = Object.keys(YTM_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = YTM_PRESETS[k];
    assert.ok(p.id && p.label);
    const r = ytmSummary(p);
    assert.ok(r.valid);
    assert.ok(r.ytm != null);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
