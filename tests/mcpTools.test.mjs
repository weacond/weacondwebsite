// tests/mcpTools.test.mjs — MCP 工具注册表与 callTool 封装
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TOOLS,
  getTool,
  listToolDefs,
  callTool,
} from "../lib/mcp/tools.js";

test("注册 18 个高风险意图工具，公开定义含 inputSchema 且无 run", () => {
  assert.equal(TOOLS.length, 18);
  const names = TOOLS.map((t) => t.name);
  for (const n of [
    "kelly", "atr_stop", "risk_of_ruin", "risk_budget", "drawdown_sizing", "leverage",
    "expectancy", "breakeven", "r_multiple", "margin", "funding_rate", "npv",
    "slippage", "take_profit", "trailing_stop", "annuity", "yield_to_maturity", "option_payoff",
  ]) {
    assert.ok(names.includes(n), `缺少工具 ${n}`);
  }
  const defs = listToolDefs();
  assert.equal(defs.length, 18);
  for (const d of defs) {
    assert.ok(d.name && d.title && d.description);
    assert.ok(d.inputSchema && d.inputSchema.type === "object");
    assert.equal("run" in d, false); // 公开定义不含 run
  }
});

test("getTool 取到工具且带 run", () => {
  assert.equal(getTool("kelly").name, "kelly");
  assert.equal(typeof getTool("kelly").run, "function");
  assert.equal(getTool("nope"), undefined);
});

test("callTool kelly 计算正确（f* = p − q/b）", () => {
  const r = callTool("kelly", { winRate: 0.55, odds: 1 });
  assert.equal(r.isError, false);
  assert.ok(Array.isArray(r.content) && r.content[0].type === "text");
  assert.ok(Math.abs(r.structuredContent.fStar - 0.1) < 1e-9); // 0.55 − 0.45/1 = 0.1
});

test("callTool kelly 负期望给出负 f*（不下注信号），仍为成功调用", () => {
  const r = callTool("kelly", { winRate: 0.4, odds: 1 });
  assert.equal(r.isError, false);
  assert.ok(r.structuredContent.fStar <= 0);
});

test("callTool 入参非法（越界/缺字段/未知字段）→ isError", () => {
  assert.equal(callTool("kelly", { winRate: 1.5, odds: 1 }).isError, true); // 越界
  assert.equal(callTool("kelly", { odds: 1 }).isError, true); // 缺 winRate
  assert.equal(callTool("kelly", { winRate: 0.5, odds: 1, bogus: 1 }).isError, true); // 未知字段
  assert.equal(callTool("kelly", { winRate: 0.5, odds: 0 }).isError, true); // exclusiveMinimum
});

test("callTool 未知工具 → unknown_tool", () => {
  const r = callTool("does_not_exist", {});
  assert.equal(r.isError, true);
  assert.equal(r.structuredContent.error, "unknown_tool");
});

test("callTool leverage 复合视图（权益变动与分级）", () => {
  const r = callTool("leverage", { leverage: 10, movePct: 5, side: "long" });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.equityPct, 50); // 5% × 10× = 50%
  assert.equal(r.structuredContent.band, "extreme");
  assert.ok(Math.abs(r.structuredContent.liquidationMovePct - 10) < 1e-9); // 100/10
});

test("callTool risk_of_ruin 无盈利目标 → 破产概率 1（winRate 为百分数）", () => {
  const r = callTool("risk_of_ruin", { winRate: 50, rr: 0, bankrollR: 10 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.pRuin, 1);
});

test("callTool atr_stop 合法入参产出结构化结果", () => {
  const r = callTool("atr_stop", { account: 10000, riskPct: 1, side: "long", entry: 100, atrVal: 2 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
});

test("callTool expectancy 正期望（EV 与盈亏因子）", () => {
  const r = callTool("expectancy", { winRate: 0.55, avgWin: 200, avgLoss: 100, trades: 100 });
  assert.equal(r.isError, false);
  assert.ok(Math.abs(r.structuredContent.expectedValue - 65) < 1e-9); // 0.55·200 − 0.45·100 = 65
  assert.ok(r.structuredContent.profitFactor > 1);
});

test("callTool breakeven 含费平衡价（原始 summary 形状）", () => {
  const r = callTool("breakeven", { side: "long", entry: 100, stop: 97, target: 106, feePct: 0.05 });
  assert.equal(r.isError, false);
  assert.ok(Math.abs(r.structuredContent.breakeven - 100.10005) < 1e-4); // 100·1.0005/0.9995
  assert.equal(r.structuredContent.rr.grossRr, 2); // risk=3, reward=6
});

test("callTool r_multiple 风险金额/预期盈利（riskPct 为小数）", () => {
  const r = callTool("r_multiple", { account: 100000, riskPct: 0.01, rMultiple: 2, winRate: 0.5 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.riskAmount, 1000); // 100000 × 0.01
  assert.equal(r.structuredContent.expectedProfit, 2000); // 1000 × 2
});

test("callTool margin 杠杆融资成本", () => {
  const r = callTool("margin", { principal: 10000, leverage: 3, annualInterest: 0.08, days: 30 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.borrowed, 20000); // 10000 × (3−1)
  assert.equal(r.structuredContent.positionValue, 30000); // 10000 × 3
});

test("callTool funding_rate 资金成本与年化", () => {
  const r = callTool("funding_rate", { notional: 100000, fundingRatePct: 0.01, days: 30 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.totalCost, 900); // 100000 × 0.0001 × 90
  assert.ok(Math.abs(r.structuredContent.annualized - 0.1095) < 1e-9); // 0.0001 × 1095
});

test("callTool npv 净现值与回收率", () => {
  const r = callTool("npv", { rate: 0.1, cashflows: [-10000, 5000, 6000, 7000] });
  assert.equal(r.isError, false);
  assert.ok(r.structuredContent.npv > 0);
  assert.equal(r.structuredContent.payoffIndex, 1.8); // (5000+6000+7000)/10000
});

test("callTool npv 现金流不足 2 项 → 入参非法（minItems）", () => {
  const r = callTool("npv", { rate: 0.1, cashflows: [-10000] });
  assert.equal(r.isError, true);
  assert.equal(r.structuredContent.error, "invalid_args");
});

test("callTool slippage 往返成本占名义比与成本分级", () => {
  const r = callTool("slippage", { price: 100, spread: 0.02, slippage: 0.01, grossReturn: 0.05 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  assert.ok(Math.abs(r.structuredContent.roundTripCost - 0.04) < 1e-9); // 0.02 + 2×0.01
  assert.ok(Math.abs(r.structuredContent.costPct - 0.0004) < 1e-9); // 0.04 / 100
  assert.equal(r.structuredContent.band, "low"); // 0.0004 < 0.001
});

test("callTool take_profit 止盈价 / 每单位盈利 / R:R 分级", () => {
  const r = callTool("take_profit", { entry: 100, stop: 95, targetR: 2, side: "long" });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.riskPerUnit, 5); // |100 − 95|
  assert.equal(r.structuredContent.takeProfit, 110); // 100 + 2×5
  assert.equal(r.structuredContent.rewardPerUnit, 10); // 2×5
  assert.equal(r.structuredContent.rrRatio, 2);
  assert.equal(r.structuredContent.band, "good"); // 2 ≤ rr < 3
});

test("callTool trailing_stop 移动止损位 / 已实现 R / 保本触发", () => {
  const r = callTool("trailing_stop", {
    entry: 100, stop: 90, price: 112, trailDistance: 10, side: "long", triggerR: 1,
  });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.riskPerUnit, 10); // |100 − 90|
  assert.equal(r.structuredContent.trailingStop, 102); // max(90, 112−10)
  assert.ok(Math.abs(r.structuredContent.rAchieved - 1.2) < 1e-9); // (112−100)/10
  assert.equal(r.structuredContent.breakEvenTriggered, true); // 1.2 ≥ 1
  assert.ok(Math.abs(r.structuredContent.lockInR - 0.2) < 1e-9); // (102−100)/10
});

test("callTool annuity 年金付款与充足率", () => {
  const r = callTool("annuity", { presentValue: 100000, rate: 0.04, years: 10 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  assert.equal(r.structuredContent.sufficiencyRatio, 1); // 构造即完全摊销
  assert.ok(r.structuredContent.annualPayment > 0 && Number.isFinite(r.structuredContent.annualPayment));
});

test("callTool yield_to_maturity 平价债 YTM≈票息且 fair", () => {
  const r = callTool("yield_to_maturity", { face: 100, couponRate: 0.05, price: 100, years: 10 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  assert.equal(r.structuredContent.fair, true); // 价格=面值
  assert.ok(Math.abs(r.structuredContent.ytm - 0.05) < 1e-6); // 平价 → YTM≈票息
});

test("callTool option_payoff 多头 call 盈亏 / 盈亏平衡 / 最大亏损", () => {
  const r = callTool("option_payoff", { type: "call", side: "long", spot: 105, strike: 100, premium: 3 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  assert.equal(r.structuredContent.intrinsic, 5); // max(105−100, 0)
  assert.equal(r.structuredContent.breakEven, 103); // K + P
  assert.equal(r.structuredContent.maxLoss, -3); // 多头 = −权利金
  assert.equal(r.structuredContent.currentPayoff, 2); // 内在价值 − 权利金
});
