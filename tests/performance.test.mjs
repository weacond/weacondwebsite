// tests/performance.test.mjs — lib/performance.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tradeScorecard,
  gradePerformance,
  scorecardForPreset,
  getTradePreset,
  TRADE_PRESETS,
} from "../lib/performance.js";

// 手算锚点：[+0.05, -0.02, +0.04, -0.02, +0.06]
// wins=3 (0.05,0.04,0.06), losses=2 (0.02,0.02), winRate=3/5=0.6
// grossProfit=0.15, grossLoss=0.04, profitFactor=3.75
// avgWin=0.05, avgLoss=0.02, payoff=2.5, expectancy=0.6*0.05-0.4*0.02=0.022
const C = [0.05, -0.02, 0.04, -0.02, 0.06];

test("tradeScorecard: 计数与比率与手算一致", () => {
  const s = tradeScorecard(C);
  assert.equal(s.n, 5);
  assert.equal(s.wins, 3);
  assert.equal(s.losses, 2);
  assert.ok(Math.abs(s.winRate - 0.6) < 1e-9);
  assert.ok(Math.abs(s.profitFactor - 3.75) < 1e-9);
  assert.ok(Math.abs(s.payoff - 2.5) < 1e-9);
  assert.ok(Math.abs(s.expectancy - 0.022) < 1e-9);
  // 序列 +,-,+,-,+ 无连续盈利 → 最长连盈 = 1
  assert.equal(s.maxWinStreak, 1);
});

test("tradeScorecard: 连亏/连盈计数", () => {
  const s = tradeScorecard([0.1, -0.1, -0.1, 0.1, -0.1]);
  assert.equal(s.maxLosingStreak, 2);
  assert.equal(s.maxWinStreak, 1);
});

test("totalReturn 为几何复合；空输入返回 empty", () => {
  const s = tradeScorecard([0.1, 0.1]); // (1.1)^2 - 1 = 0.21
  assert.ok(Math.abs(s.totalReturn - 0.21) < 1e-9);
  const e = tradeScorecard([]);
  assert.equal(e.empty, true);
});

test("评级：有优势=优/良好；亏损=差；单调性", () => {
  const good = scorecardForPreset("edge");
  const bad = scorecardForPreset("losing");
  assert.ok(good.profitFactor > 1, "edge has profit factor >1");
  assert.ok(good.expectancy > 0);
  assert.ok(bad.profitFactor < 1, "losing has profit factor <1");
  assert.ok(bad.expectancy < 0);
  assert.ok(gradePerformance(good).grade > gradePerformance(bad).grade);
  assert.equal(gradePerformance({ empty: true }).grade, 0);
});

test("高胜率小赔率：胜率 >0.5 但盈利因子可能 <1", () => {
  const s = scorecardForPreset("highWinLowPayoff");
  assert.ok(s.winRate > 0.5);
  // 8 笔 +0.02 vs 2 笔 -0.15/-0.18 → grossProfit=0.16, grossLoss=0.33 → PF<1
  assert.ok(s.profitFactor < 1, "high win rate can still lose money");
});

test("破产概率：有优势 < 0.5，负优势 > 0.5", () => {
  const good = scorecardForPreset("edge");
  const bad = scorecardForPreset("losing");
  assert.ok(good.probRuin < 0.5);
  assert.ok(bad.probRuin > 0.5);
});

test("未知预设抛错；预设均非空", () => {
  assert.throws(() => getTradePreset("nope"), /Unknown/);
  for (const k of Object.keys(TRADE_PRESETS)) {
    assert.ok(getTradePreset(k).trades.length > 0);
  }
});
