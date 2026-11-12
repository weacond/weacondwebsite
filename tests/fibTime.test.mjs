// tests/fibTime.test.mjs — lib/fibTime.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fibTimePeriods, fibTimePredict, nextTimeZone,
  timeZoneStatus, fibTimeSummary, FIB_TIME_PRESETS,
} from "../lib/fibTime.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("fibTimePeriods：T=10 → 6 个偏移", () => {
  const p = fibTimePeriods(10);
  assert.equal(p.length, 6);
  approx(p[0], 6.18);
  approx(p[1], 10);
  approx(p[2], 16.18);
  approx(p[5], 68.54);
  assert.equal(fibTimePeriods(0).length, 0);
  assert.equal(fibTimePeriods(-1).length, 0);
});

test("fibTimePredict：t2=50, T=10 → 6 个预测点", () => {
  const p = fibTimePredict(50, 10);
  assert.equal(p.length, 6);
  approx(p[0], 56.18);
  approx(p[1], 60);
  approx(p[5], 118.54);
  assert.equal(fibTimePredict(50, 0).length, 0);
});

test("nextTimeZone：55 → 56.18", () => {
  approx(nextTimeZone(50, 10, 55), 56.18);
  approx(nextTimeZone(50, 10, 60), 60); // 60 ≥ 60
  assert.equal(nextTimeZone(50, 10, 200), null); // 已超越
});

test("timeZoneStatus：t2=50, T=10, cur=55", () => {
  const s = timeZoneStatus(50, 10, 55);
  assert.ok(s.valid);
  approx(s.next, 56.18);
  approx(s.last, 50); // no pred ≤ 55 → last = t2
  approx(s.progress, 5 / 6.18);
  assert.equal(s.zoneIndex, 0);
  assert.equal(s.zonesPassed, 0); // no zone fully passed yet
});

test("timeZoneStatus：cur 在中间", () => {
  const s = timeZoneStatus(50, 10, 66);
  assert.ok(s.valid);
  approx(s.last, 60); // preds[1]=60 ≤ 66, preds[2]=66.18 > 66
  approx(s.next, 66.18);
  approx(s.progress, 6 / 6.18);
  assert.equal(s.zoneIndex, 1);
});

test("timeZoneStatus：cur 超越所有点 → next=null", () => {
  const s = timeZoneStatus(50, 10, 200);
  assert.ok(s.valid);
  assert.equal(s.next, null);
});

test("timeZoneStatus：无效 T → valid=false", () => {
  assert.equal(timeZoneStatus(50, 0, 55).valid, false);
});

test("fibTimeSummary：t2=50, T=10, cur=55", () => {
  const r = fibTimeSummary({ t2: 50, T: 10, currentTime: 55 });
  assert.ok(r.valid);
  assert.equal(r.predictions.length, 6);
  approx(r.next, 56.18);
  assert.ok(r.status.valid);
});

test("fibTimeSummary：T=0 → 无效", () => {
  assert.equal(fibTimeSummary({ t2: 50, T: 0 }).valid, false);
});

test("预设：5 个场景", () => {
  const keys = Object.keys(FIB_TIME_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = FIB_TIME_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.t2) && Number.isFinite(p.T));
    assert.ok(p.T > 0);
  }
});