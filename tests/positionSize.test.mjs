// 头寸规模 / 风险预算测试（lib/positionSize.js）。
// 用算术不变式断言：风险金额、止损距离、取整后的头寸、集中度判断。
import { test } from "node:test";
import assert from "node:assert/strict";
import { positionSize, assessPosition } from "../lib/positionSize.js";

// ---------- 基本行为 ----------
test("positionSize: 标准例（10 万账户、1% 风险、止损 5%）→ 头寸=200", () => {
  // riskAmount = 100000×0.01 = 1000；stopDistance = 100−95 = 5；units = 1000/5 = 200
  const r = positionSize({ account: 100000, riskPct: 0.01, entry: 100, stop: 95 });
  assert.ok(r.valid, "应为合法");
  assert.ok(Math.abs(r.riskAmount - 1000) < 1e-9, "riskAmount=1000");
  assert.ok(Math.abs(r.stopDistance - 5) < 1e-9, "stopDistance=5");
  assert.equal(r.units, 200, "units=200");
  assert.ok(Math.abs(r.notional - 20000) < 1e-9, "notional=20000");
  assert.ok(Math.abs(r.positionPct - 0.2) < 1e-9, "positionPct=0.2");
  assert.ok(Math.abs(r.maxLoss - 1000) < 1e-9, "maxLoss=1000（整除时=max risk）");
});

test("positionSize: 不整除时向下取整，maxLoss ≤ riskAmount", () => {
  // riskAmount=1000；stopDistance=3 → units=⌊1000/3⌋=333；maxLoss=333×3=999 ≤ 1000
  const r = positionSize({ account: 100000, riskPct: 0.01, entry: 100, stop: 97 });
  assert.equal(r.units, 333, "units=⌊1000/3⌋=333");
  assert.ok(r.maxLoss < r.riskAmount, "maxLoss < riskAmount（取整后不超预算）");
  assert.ok(Math.abs(r.maxLoss - 999) < 1e-9, "maxLoss=999");
});

test("positionSize: 止损在入场价上方（做多止损高于入场）距离取绝对值", () => {
  const r = positionSize({ account: 100000, riskPct: 0.01, entry: 100, stop: 105 });
  assert.ok(r.valid, "合法");
  assert.ok(Math.abs(r.stopDistance - 5) < 1e-9, "stopDistance=|100−105|=5");
  assert.equal(r.units, 200, "units=200");
});

test("positionSize: 非法入参 → valid:false", () => {
  assert.equal(positionSize({ account: 0, riskPct: 0.01, entry: 100, stop: 95 }).valid, false, "账户≤0 非法");
  assert.equal(positionSize({ account: 100000, riskPct: 0, entry: 100, stop: 95 }).valid, false, "风险≤0 非法");
  assert.equal(positionSize({ account: 100000, riskPct: 0.01, entry: 0, stop: 95 }).valid, false, "入场≤0 非法");
  assert.equal(positionSize({ account: 100000, riskPct: 0.01, entry: 100, stop: 100 }).valid, false, "止损=入场 非法");
  assert.equal(positionSize({ account: 100000, riskPct: 0.01, entry: 100, stop: NaN }).valid, false, "止损 NaN 非法");
});

// ---------- 集中度判断 ----------
test("assessPosition: 集中度过高（>3×）→ overSized", () => {
  // 1% 风险、止损仅 0.3%（100→99.7）→ units=⌊1000/0.3⌋=3333；notional=333300；positionPct=3.333 > 3
  const r = positionSize({ account: 100000, riskPct: 0.01, entry: 100, stop: 99.7 });
  const a = assessPosition(r);
  assert.equal(a.verdict, "overSized", "verdict=overSized");
  assert.ok(a.overSized, "overSized=true");
  assert.ok(a.needsLeverage, "needsLeverage=true（>1×）");
});

test("assessPosition: 杠杆（1×~3×）→ leveraged", () => {
  // 1% 风险、止损 0.5%（100→99.5）→ units=⌊1000/0.5⌋=2000；positionPct=2.0 ∈ (1,3]
  const r = positionSize({ account: 100000, riskPct: 0.01, entry: 100, stop: 99.5 });
  const a = assessPosition(r);
  assert.equal(a.verdict, "leveraged", "verdict=leveraged");
  assert.ok(a.needsLeverage, "needsLeverage=true");
  assert.equal(a.overSized, false, "overSized=false");
});

test("assessPosition: 常规仓位 → ok；非法 → invalid", () => {
  const r = positionSize({ account: 100000, riskPct: 0.01, entry: 100, stop: 95 });
  assert.equal(assessPosition(r).verdict, "ok", "positionPct=0.2 → ok");
  assert.equal(assessPosition({ valid: false }).verdict, "invalid", "非法 → invalid");
  assert.equal(assessPosition(null).verdict, "invalid", "null → invalid");
});
