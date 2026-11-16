// tests/sortino.test.mjs — lib/sortino.js 单元测试（Sortino 比率，防回归）
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  wealthIndex,
  cagr,
  parseReturns,
  downsideDeviation,
  sortinoSummary,
  sortinoVerdict,
  validSortino,
  SORTINO_PRESETS,
} from "../lib/sortino.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("wealthIndex：逐期 (1+r) 累乘", () => {
  assert.deepEqual(wealthIndex([]), [1]);
  assert.deepEqual(wealthIndex([0.01]), [1, 1.01]);
  approx(wealthIndex([1.0, -0.5, 0.5, 0.0])[4], 1.5);
});

test("cagr：几何年化收益 + 非法输入 → null", () => {
  approx(cagr(1, 4, 2), 1.0);
  approx(cagr(1, 2, 1), 1.0);
  assert.equal(cagr(1, 0, 1), null);
  assert.equal(cagr(1, 2, 0), null);
  assert.equal(cagr(0, 2, 1), null);
});

test("parseReturns：多分隔符 + % → 小数；非法整串拒绝", () => {
  assert.deepEqual(parseReturns("10, -5, 10, 10"), [0.1, -0.05, 0.1, 0.1]);
  assert.deepEqual(parseReturns("  1 ; 2 \n 3 "), [0.01, 0.02, 0.03]);
  assert.equal(parseReturns("abc"), null);
  assert.equal(parseReturns(""), null);
  assert.equal(parseReturns(null), null);
  assert.equal(parseReturns("1, x, 3"), null);
});

test("downsideDeviation：仅统计低于 MAR 的下行（年化）", () => {
  // [10%, -5%, 10%, 10%]，每周期 MAR=0：唯一下行 -5% → var=0.0025/4，年化×√4
  approx(downsideDeviation([0.1, -0.05, 0.1, 0.1], 0, 4), 0.05);
  // MAR=1.25%/期(年化 5%)：下行 6.25% → 年化 0.0625
  approx(downsideDeviation([0.1, -0.05, 0.1, 0.1], 0.0125, 4), 0.0625);
  // 无下行 → 0
  approx(downsideDeviation([0.1, 0.1], 0, 12), 0);
  // 边界
  assert.equal(downsideDeviation([0.1], 0, 12), null); // <2 个周期
  assert.equal(downsideDeviation([0.1, 0.1], 0, 0), null); // freq≤0
});

test("sortinoSummary：MAR=0 已知样例", () => {
  const r = sortinoSummary({ returns: [0.1, -0.05, 0.1, 0.1], freq: 4, mar: 0 });
  assert.ok(r.valid);
  approx(r.annualized, 0.26445);
  approx(r.downsideDeviation, 0.05);
  approx(r.sortino, 0.26445 / 0.05); // ≈ 5.289
  assert.equal(r.verdict, "excellent");
});

test("sortinoSummary：MAR>0 扣减可接受收益", () => {
  const r = sortinoSummary({ returns: [0.1, -0.05, 0.1, 0.1], freq: 4, mar: 0.05 });
  assert.ok(r.valid);
  approx(r.downsideDeviation, 0.0625);
  approx(r.sortino, (0.26445 - 0.05) / 0.0625); // ≈ 3.4312
  assert.equal(r.verdict, "excellent");
});

test("sortinoSummary：无下行 → Sortino null、verdict infinite", () => {
  const r = sortinoSummary({ returns: [0.1, 0.1, 0.1], freq: 12, mar: 0 });
  assert.ok(r.valid);
  approx(r.downsideDeviation, 0);
  assert.equal(r.sortino, null);
  assert.equal(r.verdict, "infinite");
});

test("sortinoSummary：非法输入 → invalid + reason", () => {
  assert.equal(sortinoSummary({ returns: [0.1], freq: 12 }).valid, false); // <2 个
  assert.equal(sortinoSummary({ returns: [0.1, 0.1], freq: 0 }).valid, false); // freq≤0
  assert.equal(sortinoSummary({ returns: [0.1, -1], freq: 12 }).valid, false); // ≤ -1
  assert.equal(sortinoSummary({ returns: [1.0, -1.0], freq: 12 }).valid, false); // 归零
});

test("sortinoVerdict：分档 + 非有限", () => {
  assert.equal(sortinoVerdict(-0.5), "poor");
  assert.equal(sortinoVerdict(0.5), "modest");
  assert.equal(sortinoVerdict(2), "good");
  assert.equal(sortinoVerdict(4), "excellent");
  assert.equal(sortinoVerdict(null), "infinite");
  assert.equal(sortinoVerdict(NaN), "infinite");
});

test("validSortino：便捷校验", () => {
  assert.equal(validSortino([0.1, 0.1], 12), true);
  assert.equal(validSortino([0.1], 12), false);
  assert.equal(validSortino([0.1, -1], 12), false);
});

test("SORTINO_PRESETS：每个预设合法且产出有效视图", () => {
  const keys = Object.keys(SORTINO_PRESETS);
  assert.ok(keys.length >= 4, "至少 4 个预设");
  for (const k of keys) {
    const p = SORTINO_PRESETS[k];
    assert.ok(p.id && p.label && p.labelEn, `预设 ${k} 缺字段`);
    assert.ok(Number.isFinite(p.freq) && p.freq > 0, `预设 ${k} freq 非法`);
    const r = sortinoSummary({ returns: parseReturns(p.returns), freq: p.freq, mar: p.mar });
    assert.ok(r.valid, `预设 ${k} 应可解析并有效`);
    assert.ok(Number.isFinite(r.downsideDeviation) && r.downsideDeviation >= 0, `预设 ${k} 下行偏差非负`);
  }
});