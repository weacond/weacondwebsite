// tests/winRateStats.test.mjs — 胜率统计推断单元测试
import assert from "node:assert/strict";
import {
  wilsonInterval,
  binomialSignificance,
  profitFactor,
  expectancy,
  assessWinRate,
} from "../lib/winRateStats.js";

function t(name, fn) {
  fn();
  passed++;
  console.log("  ✓ " + name);
}
let passed = 0;

// ── Wilson 区间 ──
t("Wilson：50/100 → p=0.5，区间跨 0.5", () => {
  const ci = wilsonInterval(50, 100);
  assert.ok(Math.abs(ci.p - 0.5) < 1e-9, "p=0.5");
  assert.ok(ci.lower < 0.5 && ci.upper > 0.5, "区间跨 0.5");
  assert.ok(ci.lower >= 0 && ci.upper <= 1, "区间在 [0,1]");
});
t("Wilson：p 接近 1 → upper≤1 且 lower>0.5", () => {
  const ci = wilsonInterval(99, 100);
  assert.ok(ci.upper <= 1, "upper 不超 1");
  assert.ok(ci.lower > 0.5, "lower>0.5");
});
t("Wilson：样本越大区间越窄", () => {
  const a = wilsonInterval(50, 100);
  const b = wilsonInterval(500, 1000);
  assert.ok(b.upper - b.lower < a.upper - a.lower, "大样本更窄");
});
t("Wilson：非法输入 → null", () => {
  assert.equal(wilsonInterval(10, 0), null, "total=0");
  assert.equal(wilsonInterval(160, 100), null, "wins>total");
  assert.equal(wilsonInterval(-1, 10), null, "wins<0");
  assert.equal(wilsonInterval(10, -5), null, "total<0");
});

// ── 二项显著性 ──
t("显著性：60/100 → 显著(p<0.05)", () => {
  const s = binomialSignificance(60, 100);
  assert.ok(s.pValue < 0.05, "p<0.05");
  assert.ok(s.significant, "判为显著");
  assert.equal(s.verdict, "significant");
  assert.ok(s.z > 0, "z>0");
});
t("显著性：52/100 → 不显著", () => {
  const s = binomialSignificance(52, 100);
  assert.ok(s.pValue >= 0.05, "p>=0.05");
  assert.ok(!s.significant, "判为不显著");
  assert.equal(s.verdict, "not_significant");
});
t("显著性：p=0.5 → z=0, pValue=0.5", () => {
  const s = binomialSignificance(50, 100);
  assert.ok(Math.abs(s.z) < 1e-9, "z≈0");
  assert.ok(Math.abs(s.pValue - 0.5) < 1e-9, "pValue≈0.5");
});
t("显著性：非法输入 → null", () => {
  assert.equal(binomialSignificance(10, 0), null);
});

// ── 盈亏比 / 期望 ──
t("盈亏比：(100,50)=2；(100,0)=∞；(0,50)=0", () => {
  assert.equal(profitFactor(100, 50), 2);
  assert.equal(profitFactor(100, 0), Infinity);
  assert.equal(profitFactor(0, 50), 0);
});
t("期望：0.6*100 − 0.4*50 = 40", () => {
  assert.ok(Math.abs(expectancy(0.6, 100, 50) - 40) < 1e-9);
});
t("期望：50/50 平手 → 0", () => {
  assert.ok(Math.abs(expectancy(0.5, 10, 10)) < 1e-9);
});

// ── 汇总 ──
t("assessWinRate 含胜率/区间/显著性/verdict", () => {
  const r = assessWinRate(60, 100);
  assert.ok(r.winRate > 0.5, "胜率>0.5");
  assert.equal(r.confidenceBand.length, 2, "95% 区间");
  assert.equal(typeof r.z, "number");
  assert.equal(typeof r.pValue, "number");
  assert.equal(r.significant, true);
  assert.equal(r.verdict, "significant");
});
t("assessWinRate 附期望/盈亏比（给足参数）", () => {
  const r = assessWinRate(60, 100, { avgWin: 100, avgLoss: 50, grossProfit: 600, grossLoss: 400 });
  assert.ok(Math.abs(r.expectancy - 40) < 1e-9, "期望=40");
  assert.equal(r.profitFactor, 1.5, "盈亏比=600/400");
});
t("assessWinRate 非法 → null", () => {
  assert.equal(assessWinRate(10, 0), null);
});
t("显著性单调：胜率越高越显著", () => {
  const low = binomialSignificance(53, 100).pValue;
  const high = binomialSignificance(65, 100).pValue;
  assert.ok(high < low, "65% 比 53% 更显著");
});

console.log(`\n✅ winRateStats: ${passed}/${passed} 通过`);
