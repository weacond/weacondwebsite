// tests/infoRatio.test.mjs — lib/infoRatio.js 单元测试（信息比率，防回归）
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stdev,
  activeReturns,
  informationRatio,
  irVerdict,
  informationRatioSummary,
  validInfoRatio,
  parseReturns,
  parseFractions,
  INFO_RATIO_PRESETS,
} from "../lib/infoRatio.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("stdev：样本标准差(n−1)", () => {
  approx(stdev([1, 2, 3, 4, 5]), Math.sqrt(2.5)); // var=10/4=2.5
  approx(stdev([5, 5, 5]), 0); // 常数 → 0
  assert.equal(stdev([5]), null); // n<2
  assert.equal(stdev([]), null);
  assert.equal(stdev([1, 2]), Math.SQRT1_2); // [(−0.5)²+(0.5)²]/1 → sqrt(0.5)
});

test("activeReturns：逐期相减", () => {
  assert.deepEqual(activeReturns([0.1, 0.2, 0.3], [0.05, 0.1, 0.15]), [0.05, 0.1, 0.15]);
  // 长度取较短
  assert.equal(activeReturns([0.1, 0.2], [0.05]).length, 1);
});

test("informationRatio：sqrt(freq) × mean/te", () => {
  // active=[0.01,0.03], mean=0.02, te=sqrt(0.0002)=0.0141421, freq=1 → IR=sqrt(2)
  approx(informationRatio([0.05, 0.07], [0.04, 0.04], 1), Math.SQRT2);
  // freq=4 → ×sqrt(4)=×2
  approx(informationRatio([0.05, 0.07], [0.04, 0.04], 4), 2 * Math.SQRT2);
  // 追踪误差为 0 → null
  assert.equal(informationRatio([0.05, 0.05], [0.04, 0.04], 1), null);
  // n<2 → null
  assert.equal(informationRatio([0.05], [0.04], 1), null);
  // freq≤0 → null
  assert.equal(informationRatio([0.05, 0.07], [0.04, 0.04], 0), null);
});

test("irVerdict：分档", () => {
  assert.equal(irVerdict(1.0), "excellent"); // ≥0.75
  assert.equal(irVerdict(0.6), "good"); // [0.5,0.75)
  assert.equal(irVerdict(0.3), "modest"); // (0,0.5)
  assert.equal(irVerdict(0), "neutral");
  assert.equal(irVerdict(-0.5), "poor");
  assert.equal(irVerdict(null), "undefined");
  assert.equal(irVerdict(NaN), "undefined");
});

test("informationRatioSummary：完整视图", () => {
  const r = informationRatioSummary({ portfolio: [0.05, 0.07], benchmark: [0.04, 0.04], freq: 1 });
  assert.ok(r.valid);
  approx(r.ir, Math.SQRT2);
  approx(r.activeReturn, 0.02); // 0.02 × 1
  approx(r.trackingError, Math.sqrt(0.0002));
  assert.equal(r.verdict, "excellent");
  assert.equal(r.n, 2);
});

test("informationRatioSummary：各种非法 → invalid", () => {
  // 长度不一致
  const a = informationRatioSummary({ portfolio: [0.05], benchmark: [0.04, 0.04], freq: 1 });
  assert.equal(a.valid, false);
  assert.match(a.reason, /same number/);
  // 缺序列
  assert.equal(informationRatioSummary({ portfolio: [], benchmark: [] }).valid, false);
  // 追踪误差为 0
  const z = informationRatioSummary({ portfolio: [0.05, 0.05], benchmark: [0.04, 0.04], freq: 1 });
  assert.equal(z.valid, false);
  assert.match(z.reason, /tracking error is zero/);
  // 非有限
  assert.equal(informationRatioSummary({ portfolio: [0.05, NaN], benchmark: [0.04, 0.04], freq: 1 }).valid, false);
  // n<2
  assert.equal(informationRatioSummary({ portfolio: [0.05], benchmark: [0.04], freq: 1 }).valid, false);
  // freq≤0
  assert.equal(informationRatioSummary({ portfolio: [0.05, 0.07], benchmark: [0.04, 0.04], freq: 0 }).valid, false);
});

test("validInfoRatio：便捷校验", () => {
  assert.equal(validInfoRatio([0.05, 0.07], [0.04, 0.04], 1), true);
  assert.equal(validInfoRatio([0.05], [0.04], 1), false);
  assert.equal(validInfoRatio([0.05, 0.05], [0.04, 0.04], 1), false); // TE=0
});

test("parseReturns / parseFractions：% 与小数两套约定", () => {
  assert.deepEqual(parseReturns("1, 2, 3"), [0.01, 0.02, 0.03]); // % → 小数
  assert.equal(parseReturns("abc"), null);
  assert.equal(parseReturns("1, x, 3"), null); // 任一非法 → null
  assert.deepEqual(parseFractions("0.01, 0.02"), [0.01, 0.02]); // 小数，不 /100
  assert.deepEqual(parseFractions([0.01, 0.02, 0.03]), [0.01, 0.02, 0.03]);
  assert.equal(parseFractions("0.1, x"), null);
});

test("INFO_RATIO_PRESETS：每个预设两序列同长、追踪误差>0、IR 有限", () => {
  const keys = Object.keys(INFO_RATIO_PRESETS);
  assert.ok(keys.length >= 4, "至少 4 个预设");
  for (const k of keys) {
    const p = INFO_RATIO_PRESETS[k];
    assert.ok(p.id && p.label && p.labelEn, `预设 ${k} 缺字段`);
    const pf = parseReturns(p.portfolio);
    const bm = parseReturns(p.benchmark);
    assert.equal(pf.length, bm.length, `预设 ${k} 两序列长度应一致`);
    const r = informationRatioSummary({ portfolio: pf, benchmark: bm, freq: p.freq });
    assert.ok(r.valid, `预设 ${k} 应有效`);
    assert.ok(Number.isFinite(r.ir), `预设 ${k} IR 有限`);
  }
});