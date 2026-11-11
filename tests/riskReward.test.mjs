// 风险:收益测试 — lib/riskReward.js
// 测试哲学：用「手算可核对」与「自洽关系」断言。
//   riskReward(100,95,110): risk=5, reward=10, R:R=2, 盈亏平衡胜率=1/3。
import { test } from "node:test";
import assert from "node:assert/strict";
import { riskReward, requiredReward } from "../lib/riskReward.js";

test("riskReward: 多头 R:R=2、盈亏平衡胜率=1/3、edge=1", () => {
  const r = riskReward(100, 95, 110);
  assert.equal(r.valid, true);
  assert.equal(r.direction, "long", "目标在入场上方 → 多头");
  assert.equal(r.risk, 5);
  assert.equal(r.reward, 10);
  assert.equal(r.rr, 2);
  assert.ok(Math.abs(r.breakevenWinRate - 1 / 3) < 1e-9, "盈亏平衡胜率 = 1/(1+R:R)");
  assert.equal(r.edge, 1, "edge = R:R − 1");
});

test("riskReward: 空头方向判定", () => {
  const r = riskReward(100, 105, 90);
  assert.equal(r.direction, "short", "目标在入场下方 → 空头");
  assert.equal(r.rr, 2, "|reward|/|risk| = 10/5");
});

test("riskReward: 自洽关系 requiredReward(盈亏平衡胜率) === R:R", () => {
  const cases = [
    [100, 95, 110],
    [50, 48, 54],
    [200, 190, 215],
  ];
  for (const [e, s, t] of cases) {
    const r = riskReward(e, s, t);
    assert.ok(Number.isFinite(requiredReward(r.breakevenWinRate)), "胜率合法");
    assert.ok(Math.abs(requiredReward(r.breakevenWinRate) - r.rr) < 1e-9, "自洽");
  }
});

test("riskReward: 退化输入 → 明确无效（绝不臆造）", () => {
  assert.equal(riskReward(100, 100, 110).reason, "no_risk", "stop===entry → 无风险");
  assert.equal(riskReward(NaN, 95, 110).valid, false, "非有限数 → invalid");
  assert.equal(riskReward(100, 95, undefined).valid, false, "缺目标 → invalid");
});

test("requiredReward: 盈亏平衡所需 R:R，非法胜率 → null", () => {
  assert.equal(requiredReward(0.5), 1, "50% 胜率需 R:R=1");
  assert.ok(Math.abs(requiredReward(0.6) - 0.4 / 0.6) < 1e-9, "60% → (1−w)/w");
  assert.ok(Math.abs(requiredReward(0.4) - 0.6 / 0.4) < 1e-9, "40% → (1−w)/w");
  assert.equal(requiredReward(0), null, "胜率 0 → null");
  assert.equal(requiredReward(1), null, "胜率 1 → null");
  assert.equal(requiredReward(1.5), null, ">1 → null");
  assert.equal(requiredReward(NaN), null, "NaN → null");
});
