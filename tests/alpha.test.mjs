// tests/alpha.test.mjs — lib/alpha.js 单元测试（Jensen's Alpha，防回归）
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  capmExpected,
  jensenAlpha,
  alphaVerdict,
  alphaSummary,
  validAlpha,
  ALPHA_PRESETS,
} from "../lib/alpha.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("capmExpected：Rf + beta × (Rm − Rf)", () => {
  approx(capmExpected(0.10, 0.02, 1.0), 0.10); // 0.02 + 1×0.08
  approx(capmExpected(0.10, 0.02, 1.2), 0.116); // 0.02 + 1.2×0.08
  approx(capmExpected(0.10, 0.02, 0), 0.02); // beta 0 → 仅 Rf
  approx(capmExpected(0.05, 0.02, 2), 0.08); // 0.02 + 2×0.03
});

test("jensenAlpha：Rp − CAPM 预期", () => {
  approx(jensenAlpha(0.18, 0.10, 0.02, 1.0), 0.08); // 0.18 − 0.10
  approx(jensenAlpha(0.12, 0.10, 0.02, 1.2), 0.004); // 0.12 − 0.116
  approx(jensenAlpha(0.06, 0.10, 0.02, 1.0), -0.04); // 0.06 − 0.10
  approx(jensenAlpha(0.14, 0.10, 0.02, 1.8), -0.024); // 0.14 − 0.164
});

test("alphaVerdict：按超额收益分档", () => {
  assert.equal(alphaVerdict(0.08), "strong"); // >1%
  assert.equal(alphaVerdict(0.004), "outperform"); // (0,1%]
  assert.equal(alphaVerdict(-0.004), "underperform"); // [-1%,0)
  assert.equal(alphaVerdict(-0.04), "weak"); // <-1%
  assert.equal(alphaVerdict(NaN), "invalid");
  assert.equal(alphaVerdict(null), "invalid");
});

test("alphaSummary：完整视图 + 默认 rf/beta", () => {
  const r = alphaSummary({ rp: 0.18, rm: 0.10, rf: 0.02, beta: 1.0 });
  assert.ok(r.valid);
  approx(r.marketPremium, 0.08);
  approx(r.expected, 0.10);
  approx(r.alpha, 0.08);
  assert.equal(r.verdict, "strong");
});

test("alphaSummary：rf 缺省 0、beta 缺省 1", () => {
  const r = alphaSummary({ rp: 0.18, rm: 0.10 });
  assert.ok(r.valid);
  approx(r.rf, 0);
  approx(r.beta, 1);
  approx(r.expected, 0.10); // 0 + 1×(0.10−0)
  approx(r.alpha, 0.08);
});

test("alphaSummary：rp/rm 非法 → invalid", () => {
  assert.equal(alphaSummary({ rp: NaN, rm: 0.1 }).valid, false);
  assert.equal(alphaSummary({ rm: 0.1 }).valid, false); // 缺 rp
  assert.equal(alphaSummary({}).valid, false); // 全缺
});

test("validAlpha：便捷校验", () => {
  assert.equal(validAlpha(0.18, 0.10), true);
  assert.equal(validAlpha(NaN, 0.10), false);
  assert.equal(validAlpha(0.18, NaN), false);
});

test("ALPHA_PRESETS：每个预设合法且产出有效视图", () => {
  const keys = Object.keys(ALPHA_PRESETS);
  assert.ok(keys.length >= 4, "至少 4 个预设");
  for (const k of keys) {
    const p = ALPHA_PRESETS[k];
    assert.ok(p.id && p.label && p.labelEn, `预设 ${k} 缺字段`);
    assert.ok(Number.isFinite(p.rp) && Number.isFinite(p.rm), `预设 ${k} 缺 rp/rm`);
    // 预设以 % 存储，调用处换算为小数
    const r = alphaSummary({ rp: p.rp / 100, rm: p.rm / 100, rf: (p.rf || 0) / 100, beta: p.beta });
    assert.ok(r.valid, `预设 ${k} 应有效`);
    assert.ok(Number.isFinite(r.alpha), `预设 ${k} alpha 有限`);
  }
});