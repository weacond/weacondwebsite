// tests/payoff.test.mjs — 盈亏比 Payoff Ratio 单测
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  payoffRatio,
  payoffVerdict,
  payoffSummary,
  validPayoff,
  PAYOFF_PRESETS,
} from "../lib/payoff.js";

test("payoffRatio：avgWin / avgLoss", () => {
  assert.ok(Math.abs(payoffRatio(3, 1) - 3) < 1e-9);
  assert.ok(Math.abs(payoffRatio(2, 0.5) - 4) < 1e-9);
  assert.ok(Math.abs(payoffRatio(1, 1) - 1) < 1e-9);
});

test("payoffRatio：无亏损 → 999；无盈利 → 0；非有限 → 0", () => {
  assert.equal(payoffRatio(2, 0), 999); // 无亏损封顶
  assert.equal(payoffRatio(0, 1), 0); // 无盈利
  assert.equal(payoffRatio(0, 0), 0);
  assert.equal(payoffRatio(NaN, 1), 0);
  assert.equal(payoffRatio(2, NaN), 0);
});

test("payoffVerdict：分档（poor/modest/good/excellent/infinite/invalid）", () => {
  assert.equal(payoffVerdict(0.5), "poor");
  assert.equal(payoffVerdict(1.5), "modest");
  assert.equal(payoffVerdict(2.5), "good");
  assert.equal(payoffVerdict(3), "excellent");
  assert.equal(payoffVerdict(999), "infinite");
  assert.equal(payoffVerdict(null), "invalid");
});

test("payoffSummary：有效 → payoff / verdict", () => {
  const r = payoffSummary({ avgWin: 3, avgLoss: 1 });
  assert.equal(r.valid, true);
  assert.ok(Math.abs(r.payoff - 3) < 1e-9);
  assert.equal(r.verdict, "excellent");
});

test("payoffSummary：非法（非有限 / 负 / 两者皆 0）→ 无效", () => {
  assert.equal(payoffSummary({ avgWin: NaN, avgLoss: 1 }).valid, false);
  assert.equal(payoffSummary({ avgWin: 1, avgLoss: -1 }).valid, false); // 负幅
  assert.equal(payoffSummary({ avgWin: 0, avgLoss: 0 }).valid, false); // 皆 0
  assert.equal(payoffSummary({ avgWin: 2, avgLoss: 0 }).valid, true); // 无亏损 → 封顶
});

test("validPayoff 校验", () => {
  assert.equal(validPayoff(3, 1), true);
  assert.equal(validPayoff(0, 0), false);
  assert.equal(validPayoff(-1, 1), false);
});

test("预设：字段完整、valid、verdict 至少 3 档", () => {
  const verdicts = new Set();
  for (const p of Object.values(PAYOFF_PRESETS)) {
    assert.ok(p.id && p.label && p.labelEn);
    assert.ok(Number.isFinite(p.avgWin) && Number.isFinite(p.avgLoss));
    const r = payoffSummary({ avgWin: p.avgWin, avgLoss: p.avgLoss });
    assert.equal(r.valid, true, p.id);
    verdicts.add(r.verdict);
  }
  assert.ok(verdicts.size >= 3, "预设应覆盖至少 3 个 verdict 分档");
});
