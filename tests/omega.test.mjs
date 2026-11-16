// tests/omega.test.mjs — 欧米伽比率 Omega 单测
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseReturns,
  parseFractions,
  omegaRatio,
  omegaVerdict,
  omegaSummary,
  validOmega,
  OMEGA_PRESETS,
} from "../lib/omega.js";

test("omegaRatio：up / down（阈值以上上行 / 以下下行）", () => {
  assert.ok(Math.abs(omegaRatio([0.1, -0.05, 0.1, 0.1], 0) - 6) < 1e-9); // up .3 / down .05
  assert.equal(omegaRatio([0.1, 0.2], 0.05), 999); // 全在阈值上、无下行 → 封顶 999
});

test("omegaRatio：无下行 → 999；均无 → 0", () => {
  assert.equal(omegaRatio([0.1, 0.2], 0), 999);
  assert.equal(omegaRatio([-0.1, -0.2], 0), 0);
  assert.equal(omegaRatio([0.0, 0.0], 0), 0);
});

test("omegaVerdict：分档（poor/modest/good/excellent/infinite/invalid）", () => {
  assert.equal(omegaVerdict(0.5), "poor");
  assert.equal(omegaVerdict(1.5), "modest");
  assert.equal(omegaVerdict(3), "good");
  assert.equal(omegaVerdict(6), "excellent");
  assert.equal(omegaVerdict(999), "infinite");
  assert.equal(omegaVerdict(null), "invalid");
});

test("omegaSummary：有效 → up / down / omega / verdict", () => {
  const r = omegaSummary({ returns: [0.1, -0.05, 0.1, 0.1], threshold: 0 });
  assert.equal(r.valid, true);
  assert.ok(Math.abs(r.up - 0.3) < 1e-9);
  assert.ok(Math.abs(r.down - 0.05) < 1e-9);
  assert.ok(Math.abs(r.omega - 6) < 1e-9);
  assert.equal(r.verdict, "excellent");
});

test("omegaSummary：非法（<2 个 / 收益 ≤ −1 / 全等于阈值）→ 无效", () => {
  assert.equal(omegaSummary({ returns: [0.1] }).valid, false);
  assert.equal(omegaSummary({ returns: [0.1, -1.5] }).valid, false); // ≤ -1
  assert.equal(omegaSummary({ returns: [0.0, 0.0], threshold: 0 }).valid, false); // 全等于阈值
});

test("validOmega 与 parseReturns / parseFractions", () => {
  assert.equal(validOmega([0.1, -0.05, 0.1], 0), true);
  assert.equal(validOmega([0.1]), false);
  // UI：% → 小数
  assert.deepEqual(parseReturns("1, -0.5, 1").map((x) => +x.toFixed(6)), [0.01, -0.005, 0.01]);
  assert.equal(parseReturns("1, abc"), null);
  // MCP：小数直通
  assert.deepEqual(parseFractions("0.1, -0.05, 0.1"), [0.1, -0.05, 0.1]);
  assert.equal(parseFractions("0.1, abc"), null);
});

test("预设：字段完整、valid、verdict 至少 3 档", () => {
  const verdicts = new Set();
  for (const p of Object.values(OMEGA_PRESETS)) {
    assert.ok(p.id && p.label && p.labelEn);
    assert.ok(Number.isFinite(p.threshold));
    const r = omegaSummary({ returns: parseReturns(p.returns), threshold: p.threshold / 100 });
    assert.equal(r.valid, true, p.id);
    verdicts.add(r.verdict);
  }
  assert.ok(verdicts.size >= 3, "预设应覆盖至少 3 个 verdict 分档");
});
