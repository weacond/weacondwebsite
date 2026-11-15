// tests/calmar.test.mjs — lib/calmar.js 单元测试（Calmar 比率，防回归）
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  maxDrawdown,
  wealthIndex,
  cagr,
  parseReturns,
  calmarSummary,
  calmarVerdict,
  validCalmar,
  CALMAR_PRESETS,
} from "../lib/calmar.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("maxDrawdown：最深峰谷跌幅（正数 0..1）", () => {
  approx(maxDrawdown([3, 2, 1]), 2 / 3); // (3-1)/3
  approx(maxDrawdown([1, 2, 1, 2]), 0.5); // 峰 2 → 谷 1：(2-1)/2
  approx(maxDrawdown([4, 3, 3, 3]), 0.25); // (4-3)/4
  approx(maxDrawdown([1, 2, 3, 4]), 0); // 单调上升 → 0
});

test("maxDrawdown：短序列/空序列 → 0", () => {
  approx(maxDrawdown([]), 0);
  approx(maxDrawdown([5]), 0);
});

test("wealthIndex：[1, W1, ...] = 逐期 (1+r) 累乘", () => {
  assert.deepEqual(wealthIndex([]), [1]);
  assert.deepEqual(wealthIndex([0.01]), [1, 1.01]);
  approx(wealthIndex([1.0, -0.5, 0.5, 0.0])[4], 1.5); // 1→2→1→1.5→1.5
});

test("cagr：几何年化收益 + 非法输入 → null", () => {
  approx(cagr(1, 4, 2), 1.0); // 4^(1/2)-1
  approx(cagr(1, 8, 3), 1.0); // 8^(1/3)-1
  approx(cagr(1, 2, 1), 1.0);
  assert.equal(cagr(1, 0, 1), null); // end ≤ 0
  assert.equal(cagr(1, 2, 0), null); // years ≤ 0
  assert.equal(cagr(0, 2, 1), null); // start ≤ 0
});

test("parseReturns：多分隔符 + % → 小数；非法整串拒绝", () => {
  assert.deepEqual(parseReturns("1.0, 0.8, -0.5, 1.2"), [0.01, 0.008, -0.005, 0.012]);
  assert.deepEqual(parseReturns("  1 ; 2 \n 3 "), [0.01, 0.02, 0.03]);
  assert.equal(parseReturns("abc"), null);
  assert.equal(parseReturns(""), null);
  assert.equal(parseReturns(null), null);
  assert.equal(parseReturns("1, 2, x, 3"), null); // 任一 token 非法 → 整串拒绝
});

// 干净样例：季度收益 [100%, -50%, 50%, 0%] → 财富 [1,2,1,1.5,1.5]
// 终值 1.5、CAGR 0.5（1 年）、MDD 0.5（峰 2→谷 1）、Calmar = 0.5/0.5 = 1.0
test("calmarSummary：已知样例（CAGR/MDD/Calmar）", () => {
  const r = calmarSummary({ returns: [1.0, -0.5, 0.5, 0.0], freq: 4, rf: 0 });
  assert.ok(r.valid);
  approx(r.end, 1.5);
  approx(r.annualized, 0.5);
  approx(r.mdd, 0.5);
  approx(r.calmar, 1.0); // 0.5 / 0.5
  assert.equal(r.verdict, "good"); // [1,3)
});

test("calmarSummary：无回撤 → Calmar 为 null、verdict infinite", () => {
  const r = calmarSummary({ returns: [0.1, 0.1, 0.1], freq: 12 });
  assert.ok(r.valid);
  approx(r.mdd, 0);
  assert.equal(r.calmar, null);
  assert.equal(r.calmarRf, null);
  assert.equal(r.verdict, "infinite");
});

test("calmarSummary：净 Calmar 用 (CAGR − rf) / |MDD|", () => {
  const r = calmarSummary({ returns: [1.0, -0.5, 0.5, 0.0], freq: 4, rf: 0.1 });
  assert.ok(r.valid);
  approx(r.calmarRf, (0.5 - 0.1) / 0.5); // = 0.8
  assert.ok(r.calmarRf < r.calmar); // 扣无风险利率后更低
});

test("calmarSummary：非法输入 → invalid + reason", () => {
  assert.equal(calmarSummary({ returns: [0.1], freq: 12 }).valid, false); // <2 个收益
  assert.equal(calmarSummary({ returns: [0.1, 0.1], freq: 0 }).valid, false); // freq ≤ 0
  assert.equal(calmarSummary({ returns: [0.1, -1], freq: 12 }).valid, false); // 收益 ≤ -1
  assert.equal(calmarSummary({ returns: [1.0, -1.0], freq: 12 }).valid, false); // 归零 → 终值≤0
});

test("calmarVerdict：分档 + 非有限", () => {
  assert.equal(calmarVerdict(-0.5), "poor");
  assert.equal(calmarVerdict(0.5), "modest");
  assert.equal(calmarVerdict(2), "good");
  assert.equal(calmarVerdict(4), "excellent");
  assert.equal(calmarVerdict(null), "infinite");
  assert.equal(calmarVerdict(NaN), "infinite");
});

test("validCalmar：便捷校验", () => {
  assert.equal(validCalmar([0.1, 0.1], 12), true);
  assert.equal(validCalmar([0.1], 12), false);
  assert.equal(validCalmar([0.1, -1], 12), false);
});

test("CALMAR_PRESETS：每个预设合法且产出有效 Calmar 视图", () => {
  const keys = Object.keys(CALMAR_PRESETS);
  assert.ok(keys.length >= 4, "至少 4 个预设");
  for (const k of keys) {
    const p = CALMAR_PRESETS[k];
    assert.ok(p.id && p.label && p.labelEn, `预设 ${k} 缺字段`);
    assert.ok(Number.isFinite(p.freq) && p.freq > 0, `预设 ${k} freq 非法`);
    const r = calmarSummary({ returns: parseReturns(p.returns), freq: p.freq, rf: p.rf });
    assert.ok(r.valid, `预设 ${k} 应可解析并有效`);
    assert.ok(Number.isFinite(r.mdd) && r.mdd >= 0, `预设 ${k} MDD 非负`);
  }
});