// tests/martin.test.mjs — 马丁比率 Martin 单元测试
// Martin = (算术平均收益 − 每周期无风险) ÷ 每周期下行偏差 × √freq；与 lib/risk.js 同口径。
// 仅惩罚低于 0 的下行（阈值 0，Sortino 同族）；无下行 → 0。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  martinRatio,
  martinVerdict,
  martinSummary,
  validMartin,
  downsideDeviation,
  parseReturns,
  parseFractions,
  MARTIN_PRESETS,
} from "../lib/martin.js";

test("martinRatio: 已知案例 ≈ 0.25", () => {
  // returns [0.01,0.01,0.01,-0.02], freq 1, rf 0: mean=0.0025, dd=0.01 → (0.0025/0.01)*1 = 0.25
  assert.ok(Math.abs(martinRatio([0.01, 0.01, 0.01, -0.02], 1, 0) - 0.25) < 1e-9);
});

test("martinRatio: 全非负 → 无下行 → 0", () => {
  assert.equal(martinRatio([0.01, 0.02, 0.015], 12, 0), 0);
});

test("martinRatio: 非有限输入 → 0", () => {
  assert.equal(martinRatio([0.01, NaN], 12, 0), 0);
  assert.equal(martinRatio([0.01], 12, 0), 0); // <2
});

test("downsideDeviation: 仅统计低于 0 的亏损", () => {
  // [0.01, -0.02, 0.03] → only -0.02 counts: sqrt(0.0004/3)
  const dd = downsideDeviation([0.01, -0.02, 0.03]);
  assert.ok(Math.abs(dd - Math.sqrt(0.0004 / 3)) < 1e-12);
});

test("martinVerdict: 分档", () => {
  assert.equal(martinVerdict(5), "excellent");
  assert.equal(martinVerdict(2), "good");
  assert.equal(martinVerdict(0.5), "modest");
  assert.equal(martinVerdict(-1), "poor");
  assert.equal(martinVerdict(null), "infinite");
});

test("martinSummary: 合法/非法/无下行", () => {
  const ok = martinSummary({ returns: parseReturns("1, 2, -1, 3"), freq: 12, rf: 0 });
  assert.equal(ok.valid, true);
  assert.ok(ok.martin >= 0);

  assert.equal(martinSummary({ returns: [0.01], freq: 12, rf: 0 }).valid, false); // <2
  assert.equal(martinSummary({ returns: [0.01, -1.5], freq: 12, rf: 0 }).valid, false); // ≤ -1
  assert.equal(martinSummary({ returns: [0.01, 0.02], freq: 0, rf: 0 }).valid, false); // freq≤0
});

test("MARTIN_PRESETS: 至少 3 档判定", () => {
  const verdicts = new Set(
    Object.values(MARTIN_PRESETS).map((p) =>
      martinVerdict(martinSummary({ returns: parseReturns(p.returns), freq: p.freq, rf: p.rf }).martin),
    ),
  );
  assert.ok(verdicts.size >= 3, `expect ≥3 distinct verdicts, got ${[...verdicts].join(",")}`);
});

test("parseReturns / parseFractions: 单位差异", () => {
  assert.equal(parseReturns("1.5")[0], 0.015); // % → 小数
  assert.equal(parseFractions("0.015")[0], 0.015); // 小数不变
  assert.equal(parseReturns("x"), null);
  assert.deepEqual(parseFractions([]), []);
});

test("validMartin: 合法/非法", () => {
  assert.equal(validMartin(parseReturns("1, 2, -1"), 12, 0), true);
  assert.equal(validMartin([0.01], 12, 0), false);
  assert.equal(validMartin([0.01, -1.5], 12, 0), false);
});
