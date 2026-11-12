// tests/barrier.test.mjs — lib/barrier.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  barrierProbability, hitBand, barrierSummary,
  BARRIER_PRESETS, num,
} from "../lib/barrier.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("barrierProbability：无漂移时 P(先触目标)=b/(a+b)", () => {
  approx(barrierProbability(1, 1, 0).pTarget, 0.5);
  approx(barrierProbability(2, 1, 0).pTarget, 1 / 3); // 止损更近 → 先触止损
  approx(barrierProbability(1, 2, 0).pTarget, 2 / 3); // 目标更近 → 先触目标
});

test("barrierProbability：P(目标)+P(止损)=1", () => {
  const r = barrierProbability(2, 1, 0);
  approx(r.pTarget + r.pStop, 1);
  const d = barrierProbability(1, 1, 0.02);
  approx(d.pTarget + d.pStop, 1);
});

test("barrierProbability：正向漂移抬升触目标概率，负向降低", () => {
  const noDrift = barrierProbability(1, 1, 0).pTarget;
  const up = barrierProbability(1, 1, 0.01).pTarget;
  const down = barrierProbability(1, 1, -0.01).pTarget;
  approx(up, (1 - Math.exp(-2 * 0.01 * 1)) / (1 - Math.exp(-2 * 0.01 * 2)));
  assert.ok(up > noDrift);
  assert.ok(down < noDrift);
});

test("barrierProbability：越远的止损，触目标概率越高（单调性）", () => {
  const near = barrierProbability(1, 1, 0).pTarget;
  const far = barrierProbability(1, 3, 0).pTarget;
  assert.ok(far > near);
});

test("barrierProbability：概率被裁剪到 [0,1]", () => {
  const r = barrierProbability(1, 1, 100); // 极强漂移
  assert.ok(r.pTarget >= 0 && r.pTarget <= 1);
});

test("barrierProbability：a 或 b ≤0 → 无效", () => {
  assert.ok(!barrierProbability(0, 1, 0).valid);
  assert.ok(!barrierProbability(1, 0, 0).valid);
  assert.ok(!barrierProbability("abc", 1, 0).valid);
});

test("hitBand：分级", () => {
  assert.equal(hitBand(NaN), "na");
  assert.equal(hitBand(0.6), "favorable");
  assert.equal(hitBand(0.9), "favorable");
  assert.equal(hitBand(0.5), "neutral");
  assert.equal(hitBand(0.4), "neutral");
  assert.equal(hitBand(0.3), "unfavorable");
});

test("barrierSummary：组合 + 分级", () => {
  const r = barrierSummary({ target: 1, stop: 3, drift: 0 });
  approx(r.pTarget, 3 / 4);
  assert.equal(r.band, "favorable");
  assert.ok(r.valid);
  assert.equal(barrierSummary({ target: 0, stop: 1 }).band, "na");
});

test("预设：4 个情景，barrierSummary 均有效", () => {
  const keys = Object.keys(BARRIER_PRESETS);
  assert.equal(keys.length, 4);
  for (const k of keys) {
    const p = BARRIER_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.target) && p.target > 0);
    assert.ok(Number.isFinite(p.stop) && p.stop > 0);
    assert.ok(barrierSummary(p).valid);
  }
  assert.equal(barrierSummary(BARRIER_PRESETS.tightStop).band, "unfavorable");
  assert.equal(barrierSummary(BARRIER_PRESETS.wideStop).band, "favorable");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});