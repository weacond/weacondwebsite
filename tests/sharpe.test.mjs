// tests/sharpe.test.mjs — lib/sharpe.js 单元测试（夏普比率，防回归）
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stdev,
  annualizedVol,
  sharpeVerdict,
  sharpeSummary,
  validSharpe,
  parseReturns,
  parseFractions,
  SHARPE_PRESETS,
} from "../lib/sharpe.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("stdev：样本标准差(n−1)", () => {
  approx(stdev([1, 1, 1, 1]), 0); // 常数 → 0
  approx(stdev([1, 3]), Math.SQRT2); // var=2/1=2 → √2
  assert.equal(stdev([1]), null); // n<2
  assert.equal(stdev([]), null);
  assert.equal(stdev([1, NaN]), null); // 非有限
});

test("annualizedVol：每周期标准差 × sqrt(freq)", () => {
  // stdev([0,0.1])=√0.005，× √4 = ×2
  approx(annualizedVol([0, 0.1], 4), 2 * Math.sqrt(0.005));
  approx(annualizedVol([0.1, 0.1], 12), 0); // 零波动
  assert.equal(annualizedVol([0.1], 1), null); // n<2
  assert.equal(annualizedVol([0, 0.1], 0), null); // freq≤0
});

test("sharpeVerdict：分档", () => {
  assert.equal(sharpeVerdict(3.0), "excellent"); // ≥3
  assert.equal(sharpeVerdict(1.5), "good"); // [1,3)
  assert.equal(sharpeVerdict(0.5), "modest"); // [0,1)
  assert.equal(sharpeVerdict(0), "modest");
  assert.equal(sharpeVerdict(-0.5), "poor");
  assert.equal(sharpeVerdict(null), "infinite");
  assert.equal(sharpeVerdict(NaN), "infinite");
});

test("sharpeSummary：完整视图", () => {
  const r = sharpeSummary({ returns: [0.0, 0.1], freq: 1, rf: 0 });
  assert.ok(r.valid);
  approx(r.annualized, Math.sqrt(1.1) - 1); // CAGR
  approx(r.volatility, Math.sqrt(0.005)); // √方差
  approx(r.sharpe, (Math.sqrt(1.1) - 1) / Math.sqrt(0.005));
  assert.equal(r.verdict, "modest"); // 0.69 < 1
  assert.equal(r.n, 2);
});

test("sharpeSummary：零波动 → sharpe null(infinite)", () => {
  const r = sharpeSummary({ returns: [0.1, 0.1], freq: 1, rf: 0 });
  assert.ok(r.valid);
  assert.equal(r.sharpe, null);
  assert.equal(r.verdict, "infinite");
});

test("sharpeSummary：各种非法 → invalid", () => {
  assert.equal(sharpeSummary({ returns: [0.1], freq: 1 }).valid, false); // n<2
  assert.equal(sharpeSummary({ returns: [0.0, 0.1], freq: 0 }).valid, false); // freq≤0
  assert.equal(sharpeSummary({ returns: [0.1, NaN], freq: 1 }).valid, false); // 非有限
  assert.equal(sharpeSummary({ returns: [-1.1, 0.1], freq: 1 }).valid, false); // 收益 ≤ −100%
  assert.equal(sharpeSummary({ returns: [], freq: 12 }).valid, false); // 空
});

test("validSharpe：便捷校验", () => {
  assert.equal(validSharpe([0.0, 0.1], 1, 0), true);
  assert.equal(validSharpe([0.1], 1, 0), false);
  assert.equal(validSharpe([0.0, 0.1], 0, 0), false);
});

test("parseReturns / parseFractions：% 与小数两套约定", () => {
  assert.deepEqual(parseReturns("1, 2, 3"), [0.01, 0.02, 0.03]);
  assert.equal(parseReturns("abc"), null);
  assert.equal(parseReturns("1, x, 3"), null);
  assert.deepEqual(parseFractions("0.01, 0.02"), [0.01, 0.02]);
  assert.deepEqual(parseFractions([0.01, 0.02, 0.03]), [0.01, 0.02, 0.03]);
  assert.equal(parseFractions("0.1, x"), null);
});

test("SHARPE_PRESETS：每个预设收益各异(波动>0)、合法", () => {
  const keys = Object.keys(SHARPE_PRESETS);
  assert.ok(keys.length >= 4, "至少 4 个预设");
  for (const k of keys) {
    const p = SHARPE_PRESETS[k];
    assert.ok(p.id && p.label && p.labelEn, `预设 ${k} 缺字段`);
    const rr = parseReturns(p.returns);
    assert.ok(rr && rr.length >= 2, `预设 ${k} 至少 2 个收益`);
    const r = sharpeSummary({ returns: rr, freq: p.freq, rf: p.rf });
    assert.ok(r.valid, `预设 ${k} 应有效`);
    assert.ok(Number.isFinite(r.sharpe), `预设 ${k} Sharpe 有限(波动>0)`);
  }
});