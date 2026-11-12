// tests/drawdown.test.mjs — lib/drawdown.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  recoveryGainPct,
  recoveryTime,
  RECOVERY_TABLE,
  validDrawdown,
} from "../lib/drawdown.js";

test("回本所需涨幅：不对称关系（-50%->+100%，-33%->+49.3%，-20%->+25%）", () => {
  assert.ok(Math.abs(recoveryGainPct(50) - 100) < 1e-9, "-50% 需 +100%");
  assert.ok(Math.abs(recoveryGainPct(20) - 25) < 1e-9, "-20% 需 +25%");
  assert.ok(Math.abs(recoveryGainPct(33) - 49.2537) < 0.01, "-33% 需 ~+49.3%");
});

test("回本涨幅单调递增；0 回撤需 0 涨幅", () => {
  assert.equal(recoveryGainPct(0), 0);
  for (let dd = 10; dd <= 90; dd += 10) assert.ok(recoveryGainPct(dd + 10) > recoveryGainPct(dd), "单调递增");
});

test("跌 100% 无法回本（Infinity）", () => {
  assert.equal(recoveryGainPct(100), Infinity);
});

test("恢复时间：-50% @10% CAGR ≈ 7.27 年（72 法则）", () => {
  const r = recoveryTime(50, 10);
  assert.ok(r.possible, "可恢复");
  assert.ok(Math.abs(r.years - 7.2725) < 0.01, "≈7.27 年");
});

test("恢复时间：CAGR<=0 无法恢复（possible=false, years=Infinity）", () => {
  assert.equal(recoveryTime(50, 0).possible, false);
  assert.equal(recoveryTime(50, 0).years, Infinity);
  assert.equal(recoveryTime(50, -3).possible, false, "负增长无法恢复");
});

test("无回撤恢复时间为 0；速查表与 validDrawdown 校验", () => {
  assert.equal(recoveryTime(0, 10).years, 0);
  for (const row of RECOVERY_TABLE) assert.ok(row.gain > 0 && Number.isFinite(row.gain));
  assert.equal(validDrawdown(50), true);
  assert.equal(validDrawdown(100), false, "100% 非法");
  assert.equal(validDrawdown(0), false, "0% 非法");
});
