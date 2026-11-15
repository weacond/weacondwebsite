// tests/dcf.test.mjs — lib/dcf.js 现金流折现估值 DCF 测试
import test from "node:test";
import assert from "node:assert/strict";
import {
  num,
  buildFcfs,
  presentValue,
  explicitPv,
  terminalValue,
  dcfSummary,
  dcfThreeScenarios,
  dcfBand,
  DCF_PRESETS,
} from "../lib/dcf.js";

test("num：字符串/数字归一化，非法回退", () => {
  assert.equal(num("0.1", 0), 0.1);
  assert.equal(num("abc", 5), 5);
  assert.equal(num(0.1), 0.1);
});

test("buildFcfs：由 fcf0+增长率+年数生成期末 FCF 序列", () => {
  const s = buildFcfs(100, 0.1, 3);
  assert.equal(s.length, 3);
  assert.ok(Math.abs(s[0] - 110) < 1e-9);
  assert.ok(Math.abs(s[1] - 121) < 1e-9);
  assert.ok(Math.abs(s[2] - 133.1) < 1e-9);
  assert.equal(buildFcfs(100, 0.1, 0).length, 0);
});

test("presentValue / explicitPv：折现现值", () => {
  assert.ok(Math.abs(presentValue(100, 1, 0.1) - 100 / 1.1) < 1e-9);
  // 三年等额 100 年金 @10% 现值 = 100×(1−1.1⁻³)/0.1 ≈ 248.685
  assert.ok(Math.abs(explicitPv([100, 100, 100], 0.1) - 248.6852) < 1e-2);
  assert.equal(explicitPv([100, 100, 100], 0), 300); // 零折现=原值
});

test("terminalValue：Gordon 永续；g≥wacc 不可用 → null", () => {
  assert.ok(Math.abs(terminalValue(100, 0.03, 0.1) - 1471.4286) < 1e-2);
  assert.equal(terminalValue(100, 0.1, 0.1), null);
  assert.equal(terminalValue(100, 0.12, 0.1), null);
});

test("dcfSummary：内在价值=显性期+终值现值，终值占比/每股/上行空间", () => {
  const r = dcfSummary({ fcfs: [100, 100], wacc: 0.1, terminalGrowth: 0.05, shares: 100, price: 10 });
  assert.equal(r.valid, true);
  // 不变式：内在价值 = 显性期现值 + 终值现值
  assert.ok(Math.abs(r.intrinsicValue - (r.pvExplicit + r.pvTerminal)) < 1e-9);
  // 终值占比 = 终值现值 / 内在价值
  assert.ok(Math.abs(r.tvShare - r.pvTerminal / r.intrinsicValue) < 1e-9);
  // 具体值
  assert.ok(Math.abs(r.pvExplicit - 173.5537) < 1e-3);
  assert.ok(Math.abs(r.terminalValue - 2100) < 1e-9);
  assert.ok(Math.abs(r.pvTerminal - 1735.5372) < 1e-3);
  assert.ok(Math.abs(r.intrinsicValue - 1909.0909) < 1e-3);
  assert.ok(Math.abs(r.tvShare - 0.9091) < 1e-3);
  // 每股与上行空间
  assert.ok(Math.abs(r.perShare - r.intrinsicValue / 100) < 1e-9);
  assert.ok(Math.abs(r.upside - (r.perShare - 10) / 10) < 1e-9);
  assert.equal(dcfBand(r.upside), "deepValue"); // 上行 >50%
});

test("dcfSummary：g≥wacc 时无终值，仅显性期现值", () => {
  const r = dcfSummary({ fcfs: [100, 100], wacc: 0.1, terminalGrowth: 0.12 });
  assert.equal(r.terminalValue, null);
  assert.equal(r.pvTerminal, null);
  assert.ok(Math.abs(r.intrinsicValue - r.pvExplicit) < 1e-9);
});

test("dcfSummary：无效（wacc≤0 / 无期）", () => {
  assert.equal(dcfSummary({ fcfs: [100, 100], wacc: 0 }).valid, false);
  assert.equal(dcfSummary({ fcf0: 100, growth: 0.1, years: 0, wacc: 0.1 }).valid, false);
});

test("dcfSummary：由 fcf0/growth/years 生成 FCF", () => {
  const r = dcfSummary({ fcf0: 100, growth: 0.1, years: 3, wacc: 0.1, terminalGrowth: 0.03 });
  assert.equal(r.periods, 3);
  assert.ok(Math.abs(r.fcfs[0] - 110) < 1e-9);
});

test("dcfThreeScenarios：乐观 > 基准 > 悲观（内在价值排序）", () => {
  const s = dcfThreeScenarios({ fcf0: 100e6, growth: 0.05, terminalGrowth: 0.025, wacc: 0.09, years: 10, shares: 100e6, price: 15 });
  assert.ok(s.optimist.intrinsicValue > s.base.intrinsicValue);
  assert.ok(s.base.intrinsicValue > s.pessimist.intrinsicValue);
  assert.ok(s.optimist.upside > s.pessimist.upside);
});

test("dcfBand 分级", () => {
  assert.equal(dcfBand(0.6), "deepValue");
  assert.equal(dcfBand(0.15), "undervalued");
  assert.equal(dcfBand(0.0), "fair");
  assert.equal(dcfBand(-0.3), "overvalued");
  assert.equal(dcfBand(null), "n/a");
});

test("DCF_PRESETS：可复现且有效", () => {
  for (const [k, p] of Object.entries(DCF_PRESETS)) {
    assert.ok(k, "preset key");
    assert.ok(p.growth > 0 && p.wacc > 0 && p.terminalGrowth < p.wacc, `${k} 参数合理`);
    assert.equal(dcfSummary(p).valid, true);
  }
});