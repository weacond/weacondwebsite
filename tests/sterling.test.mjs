// tests/sterling.test.mjs — 斯特林比率 Sterling 单元测试
// Sterling = 总收益 ÷ 最长连续亏损交易数；与 lib/risk.js sterlingRatio 同口径。
// 无连亏(≤0)且 totalReturn>0 时按惯例封顶 999；非有限输入 → 0。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sterlingRatio,
  sterlingVerdict,
  sterlingSummary,
  validSterling,
  STERLING_PRESETS,
} from "../lib/sterling.js";

test("sterlingRatio: 60 收益 ÷ 3 连亏 = 20", () => {
  assert.ok(Math.abs(sterlingRatio(60, 3) - 20) < 1e-12);
});

test("sterlingRatio: 负收益 ÷ 连亏为负", () => {
  assert.ok(sterlingRatio(-10, 5) < 0);
});

test("sterlingRatio: 无连亏且正收益封顶 999", () => {
  assert.equal(sterlingRatio(10, 0), 999);
  assert.equal(sterlingRatio(-10, 0), 0);
});

test("sterlingRatio: 非有限输入 → 0；负连亏按无连亏封顶 999", () => {
  assert.equal(sterlingRatio(NaN, 5), 0);
  assert.equal(sterlingRatio(5, NaN), 0);
  assert.equal(sterlingRatio(5, -1), 999); // 负连亏 ≤0 且正收益 → 封顶 999
  assert.equal(sterlingRatio(-5, -1), 0); // 负连亏 ≤0 且非正收益 → 0
});

test("sterlingVerdict: 分档", () => {
  assert.equal(sterlingVerdict(20), "excellent");
  assert.equal(sterlingVerdict(5), "good");
  assert.equal(sterlingVerdict(2), "modest");
  assert.equal(sterlingVerdict(0.5), "poor");
  assert.equal(sterlingVerdict(999), "infinite");
  assert.equal(sterlingVerdict(NaN), "invalid");
});

test("sterlingSummary: 合法/非法/封顶", () => {
  const ok = sterlingSummary({ totalReturn: 60, maxLosingStreak: 3 });
  assert.equal(ok.valid, true);
  assert.ok(Math.abs(ok.sterling - 20) < 1e-12);
  assert.equal(ok.verdict, "excellent");

  assert.equal(sterlingSummary({ totalReturn: NaN, maxLosingStreak: 3 }).valid, false);
  assert.equal(sterlingSummary({ totalReturn: 0, maxLosingStreak: 0 }).valid, false);
  assert.equal(sterlingSummary({ totalReturn: 10, maxLosingStreak: 0 }).sterling, 999);
});

test("STERLING_PRESETS: 至少 3 档判定", () => {
  const verdicts = new Set(Object.values(STERLING_PRESETS).map((p) => sterlingVerdict(sterlingRatio(p.totalReturn, p.maxLosingStreak))));
  assert.ok(verdicts.size >= 3, `expect ≥3 distinct verdicts, got ${[...verdicts].join(",")}`);
});

test("validSterling: 合法/非法", () => {
  assert.equal(validSterling(60, 3), true);
  assert.equal(validSterling(0, 0), false);
  assert.equal(validSterling(NaN, 3), false);
});
