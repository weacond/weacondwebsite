// tests/mcpTools.test.mjs — MCP 工具注册表与 callTool 封装
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TOOLS,
  getTool,
  listToolDefs,
  callTool,
} from "../lib/mcp/tools.js";

test("注册 32 个高风险意图工具，公开定义含 inputSchema 且无 run", () => {
  assert.equal(TOOLS.length, 32);
  const names = TOOLS.map((t) => t.name);
  for (const n of [
    "kelly", "atr_stop", "risk_of_ruin", "risk_budget", "drawdown_sizing", "leverage",
    "expectancy", "breakeven", "r_multiple", "margin", "funding_rate", "npv",
    "slippage", "take_profit", "trailing_stop", "annuity", "yield_to_maturity", "option_payoff",
    "fire", "time_weighted_return", "fx_pip", "fx_cross", "interest_parity",
    "rebalance", "beta", "real_after_tax", "real_return", "tax_drag", "prob_return",
    "loan", "ear", "drip",
  ]) {
    assert.ok(names.includes(n), `缺少工具 ${n}`);
  }
  const defs = listToolDefs();
  assert.equal(defs.length, 32);
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

test("callTool fire 计算 FIRE 目标与年数", () => {
  const r = callTool("fire", {
    annualExpense: 60000, safeWithdrawalRate: 0.04, currentSavings: 100000, savingsRate: 0.25, realGrowth: 0.05,
  });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  assert.ok(Number.isFinite(r.structuredContent.fireTarget) && r.structuredContent.fireTarget > 0);
  assert.ok(Number.isFinite(r.structuredContent.years));
});

test("callTool time_weighted_return 计算序列 TWRR", () => {
  const r = callTool("time_weighted_return", { returns: "0.01,0.01,0.01", periodsPerYear: 12 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  assert.equal(r.structuredContent.count, 3);
  assert.ok(r.structuredContent.growthMultiple > 1); // 连续正收益 → 增长倍数 >1
});

test("callTool fx_pip 计算点值与手数", () => {
  const r = callTool("fx_pip", { pipSize: 0.0001, positionSize: 100000, rate: 1.085, pips: 10 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  assert.equal(r.structuredContent.lots, 1); // positionSize / 100000
});

test("callTool fx_cross 交叉汇率与倒数恒等", () => {
  const r = callTool("fx_cross", { rateAB: 1.085, rateBC: 1.27, amount: 1000, pipSize: 0.0001, notional: 100000 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  assert.equal(r.structuredContent.rateAB, 1.085);
  // invertedRate = 1/crossRate → 恒等（与具体公式无关）
  assert.ok(Math.abs(r.structuredContent.invertedRate * r.structuredContent.crossRate - 1) < 1e-9);
});

test("callTool interest_parity 计算理论远期（利率为百分数）", () => {
  const r = callTool("interest_parity", { spot: 1.2, domRatePct: 4, forRatePct: 2, years: 1 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  assert.equal(r.structuredContent.spot, 1.2);
  assert.equal(r.structuredContent.domRate, 0.04); // 4% → 内部 /100
  assert.equal(r.structuredContent.forRate, 0.02);
});

test("callTool rebalance 两资产再平衡溢价（ρ=0 → 溢价>0）", () => {
  const r = callTool("rebalance", { w1: 0.5, s1: 0.2, s2: 0.1, rho: 0, years: 10 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  assert.equal(r.structuredContent.w1, 0.5);
  assert.equal(r.structuredContent.w2, 0.5); // 1 - w1
  assert.ok(r.structuredContent.bonus > 0); // s1≠s2 且 ρ=0 → 溢价为正
  // 累计溢价 = 年化溢价 × 年数（公式无关不变式）
  assert.equal(r.structuredContent.totalBonus, r.structuredContent.bonus * 10);
});

test("callTool beta 组合 beta=1（权重归一）与系统回报", () => {
  const r = callTool("beta", { weights: [0.5, 0.5], betas: [1.0, 1.0] });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  // 权重和=1、各 beta=1 → 组合 beta=1.0
  assert.ok(Math.abs(r.structuredContent.beta - 1) < 1e-9);
  // 系统回报 = beta × 市场回报（默认 0.1）
  assert.ok(Math.abs(r.structuredContent.systematicReturn - 0.1) < 1e-9);
  assert.equal(r.structuredContent.band, "market");
});

test("callTool real_after_tax 税后实际终值与总损耗", () => {
  const r = callTool("real_after_tax", { pv: 100000, rate: 0.08, taxRate: 0.15, inflation: 0.03, years: 20 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  // 税后终值 = 名义终值 × (1 − taxRate)（公式无关不变式）
  assert.ok(Math.abs(r.structuredContent.afterTaxFV - r.structuredContent.nominalFV * 0.85) < 1e-6);
  assert.ok(r.structuredContent.totalDrag > 0); // 有税 + 通胀 → 损耗为正
  assert.ok(r.structuredContent.realFV < r.structuredContent.nominalFV); // 实际 < 名义
});

test("callTool real_return 实际年化与购买力（Fisher）", () => {
  const r = callTool("real_return", { nominal: 0.08, inflation: 0.03, years: 10, principal: 10000 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  // 实际年化 = (1+名义)/(1+通胀) − 1
  assert.ok(Math.abs(r.structuredContent.real - (1.08 / 1.03 - 1)) < 1e-9);
  // 未来实际 = 未来名义 × 购买力（公式无关不变式）
  assert.ok(
    Math.abs(r.structuredContent.futureReal - r.structuredContent.futureNominal * r.structuredContent.purchasingPower) < 1e-6,
  );
  assert.equal(r.structuredContent.band, "good");
});

test("callTool tax_drag 税后终值与拖累", () => {
  const r = callTool("tax_drag", { principal: 10000, rate: 0.1, taxRate: 0.15, years: 10 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  // 税后年化 = 名义 × (1 − 税率) = 0.1 × 0.85 = 0.085
  assert.ok(Math.abs(r.structuredContent.afterTaxRate - 0.085) < 1e-9);
  // 拖累 = (名义终值 − 税后终值) / 名义终值（公式无关不变式）
  const { nominalFuture, afterTaxFuture, taxDrag } = r.structuredContent;
  assert.ok(Math.abs(taxDrag - (nominalFuture - afterTaxFuture) / nominalFuture) < 1e-9);
  assert.ok(taxDrag > 0);
});

test("callTool prob_return 概率加权期望与方差", () => {
  const r = callTool("prob_return", { probs: [0.6, 0.4], outcomes: [1, -1] });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  // 期望 = 0.6×1 + 0.4×(−1) ≈ 0.2
  assert.ok(Math.abs(r.structuredContent.expected - 0.2) < 1e-9);
  // σ² = 方差（公式无关不变式）
  assert.ok(Math.abs(r.structuredContent.stdDev * r.structuredContent.stdDev - r.structuredContent.variance) < 1e-9);
  assert.equal(r.structuredContent.band, "excellent");
});

test("callTool loan 等额本息月供与利息占比", () => {
  const r = callTool("loan", { principal: 20000, annualRate: 0.05, years: 5 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  assert.ok(r.structuredContent.payment > 0);
  // 利息占比 = 利息 / 总还款（公式无关不变式）
  const { interest, totalPaid, interestRatio } = r.structuredContent;
  assert.ok(Math.abs(interestRatio - interest / totalPaid) < 1e-12);
  // 总利息 = 总还款 − 本金
  assert.ok(Math.abs(interest - (totalPaid - 20000)) < 1e-6);
});

test("callTool ear 有效年利率与连续复利差", () => {
  const r = callTool("ear", { nominal: 0.12, periods: 12 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  // gap = 连续复利 − 有效年化（公式无关不变式）
  assert.ok(Math.abs(r.structuredContent.gap - (r.structuredContent.continuousEar - r.structuredContent.ear)) < 1e-12);
  // 有限复利的 EAR < 连续复利
  assert.ok(r.structuredContent.ear < r.structuredContent.continuousEar);
  assert.equal(r.structuredContent.band, "very-high");
});

test("callTool drip 红利累计与收入倍数", () => {
  const r = callTool("drip", { principal: 10000, yieldRate: 0.04, growthRate: 0.05, years: 10 });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.valid, true);
  // 首年红利 = 本金 × 收益率（(1+g)^0 = 1）
  assert.ok(Math.abs(r.structuredContent.firstYearDividend - 10000 * 0.04) < 1e-9);
  // 收入倍数 = 累计红利 / 本金（公式无关不变式）
  assert.ok(Math.abs(r.structuredContent.incomeMultiplier - r.structuredContent.totalDividends / 10000) < 1e-12);
  assert.ok(r.structuredContent.totalDividends > r.structuredContent.firstYearDividend);
});
