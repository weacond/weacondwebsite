// tests/fearIndex.test.mjs — 市场恐惧指数（VIX 风格，确定性）
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fearScore, syntheticVix, fearGauge, validFear, FEAR_PRESETS,
} from "../lib/fearIndex.js";

test("fearScore：VIX 10 → 0 分，平静", () => {
  const s = fearScore(10);
  assert.ok(Math.abs(s.score - 0) < 1e-9, `score=${s.score}`);
  assert.equal(s.label, "平静");
  assert.equal(s.labelEn, "Calm");
});

test("fearScore：VIX 30 → 100 分（封顶）", () => {
  const s = fearScore(30);
  assert.ok(Math.abs(s.score - 100) < 1e-9, `score=${s.score}`);
});

test("fearScore：VIX 45+ → 恐慌", () => {
  assert.equal(fearScore(50).label, "恐慌");
  assert.equal(fearScore(50).labelEn, "Panic");
});

test("fearScore：分数钳制在 [0,100]", () => {
  assert.ok(fearScore(0).score >= 0);
  assert.ok(fearScore(100).score <= 100);
});

test("syntheticVix 确定性：同 seed 同结果", () => {
  const a = syntheticVix(42, 60);
  const b = syntheticVix(42, 60);
  assert.deepEqual(a, b);
});

test("syntheticVix：不同 seed 不同结果", () => {
  const a = syntheticVix(1, 60);
  const b = syntheticVix(2, 60);
  assert.notDeepEqual(a, b);
});

test("syntheticVix：长度 = n，且值 ≥ 下限", () => {
  const s = syntheticVix(5, 50);
  assert.equal(s.length, 50);
  assert.ok(s.every((v) => v >= 2 && Number.isFinite(v)));
});

test("syntheticVix：n=0 → 空数组", () => {
  assert.deepEqual(syntheticVix(1, 0), []);
});

test("fearGauge 返回末值 + 分数 + 序列", () => {
  const g = fearGauge(7, 60);
  assert.equal(g.series.length, 60);
  assert.ok(g.vix === g.series[59]);
  assert.ok(g.score >= 0 && g.score <= 100);
});

test("fearGauge：n=0 → 空序列，vix=0", () => {
  const g = fearGauge(1, 0);
  assert.equal(g.series.length, 0);
  assert.equal(g.vix, 0);
});

test("validFear 边界", () => {
  assert.ok(validFear({ seed: 1, n: 60 }));
  assert.ok(!validFear({ seed: 1, n: -1 }));
  assert.ok(!validFear({ seed: NaN, n: 60 }));
});

test("FEAR_PRESETS 覆盖 3 种情绪", () => {
  assert.equal(FEAR_PRESETS.length, 3);
  for (const p of FEAR_PRESETS) {
    const g = fearGauge(p.seed, p.n, p.opts);
    assert.ok(Number.isFinite(g.vix), p.id);
  }
});
