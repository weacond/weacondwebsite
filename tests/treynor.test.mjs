// tests/treynor.test.mjs — Treynor 比率单测
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  excessReturn,
  treynor,
  treynorVerdict,
  treynorSummary,
  validTreynor,
  TREYNOR_PRESETS,
} from "../lib/treynor.js";

test("excessReturn：Rp − Rf（小数）", () => {
  assert.ok(Math.abs(excessReturn(0.18, 0.02) - 0.16) < 1e-9);
  assert.ok(Math.abs(excessReturn(0.1, 0) - 0.1) < 1e-9);
});

test("treynor：(Rp − Rf) ÷ beta", () => {
  assert.ok(Math.abs(treynor(0.18, 0.02, 1.0) - 0.16) < 1e-9);
  assert.ok(Math.abs(treynor(0.14, 0.02, 1.8) - 0.12 / 1.8) < 1e-9);
});

test("treynor：beta 为 0 或非有限 → null", () => {
  assert.equal(treynor(0.18, 0.02, 0), null);
  assert.equal(treynor(0.18, 0.02, NaN), null);
});

test("treynorVerdict：分档（poor/modest/good/excellent/invalid）", () => {
  assert.equal(treynorVerdict(-0.01), "poor");
  assert.equal(treynorVerdict(0.02), "modest");
  assert.equal(treynorVerdict(0.07), "good");
  assert.equal(treynorVerdict(0.16), "excellent");
  assert.equal(treynorVerdict(null), "invalid");
});

test("treynorSummary：有效 → excessReturn / treynor / verdict", () => {
  const r = treynorSummary({ rp: 0.18, rf: 0.02, beta: 1.0 });
  assert.equal(r.valid, true);
  assert.ok(Math.abs(r.excessReturn - 0.16) < 1e-9);
  assert.ok(Math.abs(r.treynor - 0.16) < 1e-9);
  assert.equal(r.verdict, "excellent");
});

test("treynorSummary：rf/beta 缺省 → 0 / 1", () => {
  const r = treynorSummary({ rp: 0.1 });
  assert.equal(r.valid, true);
  assert.equal(r.rf, 0);
  assert.equal(r.beta, 1);
  assert.ok(Math.abs(r.treynor - 0.1) < 1e-9);
});

test("treynorSummary：rp 非有限 / beta 为 0 → 无效", () => {
  assert.equal(treynorSummary({ rp: NaN, rf: 0.02, beta: 1 }).valid, false);
  assert.equal(treynorSummary({ rp: 0.18, rf: 0.02, beta: 0 }).valid, false);
});

test("validTreynor 与预设：字段完整、beta 非零、verdict 各异", () => {
  assert.equal(validTreynor(0.18, 0.02, 1.0), true);
  assert.equal(validTreynor(0.18, 0.02, 0), false);
  const verdicts = new Set();
  for (const p of Object.values(TREYNOR_PRESETS)) {
    assert.ok(p.id && p.label && p.labelEn && p.beta);
    assert.ok(Number.isFinite(p.rp) && Number.isFinite(p.rf));
    const r = treynorSummary({ rp: p.rp / 100, rf: p.rf / 100, beta: p.beta });
    assert.equal(r.valid, true);
    verdicts.add(r.verdict);
  }
  assert.ok(verdicts.size >= 3, "预设应覆盖多个 verdict 分档");
});
