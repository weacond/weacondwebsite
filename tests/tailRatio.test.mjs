// tests/tailRatio.test.mjs — 尾部比率 Tail Ratio 单元测试
// Tail = 上分位 ÷ |下分位|（默认 95% ÷ |5%|）；与 lib/risk.js tailRatio 同口径。
// 下分位 0 / 空序列 / 非有限 → 0。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tailRatio,
  tailVerdict,
  tailSummary,
  validTail,
  quantile,
  parseReturns,
  parseFractions,
  TAIL_PRESETS,
} from "../lib/tailRatio.js";

test("quantile: 线性插值与边界", () => {
  assert.ok(Math.abs(quantile([1, 2, 3, 4], 0.5) - 2.5) < 1e-12);
  assert.equal(quantile([1, 2, 3, 4], 0), 1);
  assert.equal(quantile([1, 2, 3, 4], 1), 4);
  assert.equal(quantile([7], 0.3), 7); // 单元素
  assert.ok(Number.isNaN(quantile([], 0.5))); // 空
});

test("tailRatio: 已知案例 ≈ 2.143", () => {
  // 上 95% 分位 0.0375 ÷ |下 5% 分位 0.0175| = 2.143
  assert.ok(Math.abs(tailRatio([0.01, 0.02, -0.01, 0.03, -0.02, 0.04], 0.05, 0.95) - 2.142857) < 1e-4);
});

test("tailRatio: 下分位 0 / 空序列 → 0", () => {
  assert.equal(tailRatio([], 0.05, 0.95), 0);
  assert.equal(tailRatio([NaN, NaN], 0.05, 0.95), 0);
});

test("tailVerdict: 分档", () => {
  assert.equal(tailVerdict(5), "excellent");
  assert.equal(tailVerdict(3), "good");
  assert.equal(tailVerdict(1.5), "modest");
  assert.equal(tailVerdict(0.5), "poor");
  assert.equal(tailVerdict(0), "infinite"); // 下分位 0 → 无可测量下行
  assert.equal(tailVerdict(NaN), "invalid");
});

test("tailSummary: 合法/非法/分位序", () => {
  const ok = tailSummary({ returns: parseReturns("1, 2, -1, 3, -2, 4"), lowerQ: 0.05, upperQ: 0.95 });
  assert.equal(ok.valid, true);
  assert.ok(ok.tail > 0);

  assert.equal(tailSummary({ returns: [0.01], lowerQ: 0.05, upperQ: 0.95 }).valid, false); // <2
  assert.equal(tailSummary({ returns: [0.01, 0.02], lowerQ: 0.95, upperQ: 0.05 }).valid, false); // upperQ ≤ lowerQ
  assert.equal(tailSummary({ returns: [0.01, NaN], lowerQ: 0.05, upperQ: 0.95 }).valid, false); // 非有限
});

test("TAIL_PRESETS: 至少 3 档判定", () => {
  const verdicts = new Set(
    Object.values(TAIL_PRESETS).map((p) =>
      tailVerdict(tailSummary({ returns: parseReturns(p.returns), lowerQ: p.lowerQ, upperQ: p.upperQ }).tail),
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

test("validTail: 合法/非法", () => {
  assert.equal(validTail(parseReturns("1, 2, -1"), 0.05, 0.95), true);
  assert.equal(validTail([0.01], 0.05, 0.95), false);
  assert.equal(validTail([0.01, 0.02], 0.95, 0.05), false);
});
