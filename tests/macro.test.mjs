import { test } from "node:test";
import assert from "node:assert/strict";
import { assessMacroState, getFactorSensitivity, MACRO_FACTORS, marketRegime } from "../lib/macro.js";

test("assessMacroState: 高 VIX / 宽信用利差 → crisis", () => {
  const r = assessMacroState({ vix: 35, credit_spread: 3.5 });
  assert.equal(r.regime, "crisis");
  assert.ok(r.riskScore >= 0 && r.riskScore <= 100);
  assert.ok(Array.isArray(r.suggestions) && r.suggestions.length > 0);
});

test("assessMacroState: 低 VIX / 窄利差 / 温和通胀 → bull", () => {
  const r = assessMacroState({ vix: 10, credit_spread: 0.5, inflation: 2.5, rates: 3 });
  assert.equal(r.regime, "bull");
});

test("assessMacroState: 高通胀 + 高利率 → stagflation", () => {
  const r = assessMacroState({ inflation: 4.5, rates: 5.5, vix: 18, credit_spread: 1 });
  assert.equal(r.regime, "stagflation");
});

test("assessMacroState: 默认入参 → neutral 且 riskScore 在区间", () => {
  const r = assessMacroState({});
  assert.equal(r.regime, "neutral");
  assert.ok(r.riskScore >= 0 && r.riskScore <= 100);
  assert.ok("timestamp" in r);
});

test("assessMacroState: 极端风险评分封顶 100", () => {
  const r = assessMacroState({ vix: 50, credit_spread: 10, inflation: 6, rates: 6 });
  assert.ok(r.riskScore <= 100);
  assert.ok(r.riskScore > 0);
});

test("getFactorSensitivity: rates 对成长股敏感度为负", () => {
  const s = getFactorSensitivity("rates");
  assert.equal(s.factor, "rates");
  assert.equal(s.sensitivity.growth, -0.8);
  assert.ok(Array.isArray(s.interpretation.benefits));
});

test("getFactorSensitivity: 未知因子返回 null", () => {
  assert.equal(getFactorSensitivity("nope"), null);
});

test("MACRO_FACTORS: 五个因子齐全且带 sensitivity", () => {
  for (const k of ["rates", "inflation", "employment", "vix", "credit_spread"]) {
    assert.ok(MACRO_FACTORS[k], `缺少因子 ${k}`);
    assert.ok(MACRO_FACTORS[k].sensitivity, `${k} 缺 sensitivity`);
  }
});

// ---------- marketRegime（市场状态分类）----------

test("marketRegime: 样本<2 → regime=null", () => {
  const r = marketRegime([0.01]);
  assert.equal(r.regime, null);
  assert.equal(r.vol, 0);
  assert.equal(r.vix, null);
});

test("marketRegime: 上行低波动+vix低 → bull", () => {
  const r = marketRegime([0.01, 0.012, 0.009, 0.011], { periods: 252, vix: 15 });
  assert.equal(r.regime, "bull");
  assert.ok(r.trend > 0, "trend 为正");
});

test("marketRegime: 下行低波动 → bear", () => {
  const r = marketRegime([-0.01, -0.012, -0.009], { vix: 15 });
  assert.equal(r.regime, "bear");
});

test("marketRegime: 趋势接近 0 → range", () => {
  const r = marketRegime([0.0005, -0.0005, 0.0005, -0.0005], { vix: 15 });
  assert.equal(r.regime, "range");
});

test("marketRegime: 高 VIX 或 高波动 → crisis（优先于趋势）", () => {
  assert.equal(marketRegime([0.01, 0.01], { vix: 35 }).regime, "crisis", "高 VIX → crisis");
  assert.equal(marketRegime([0.05, -0.05, 0.05, -0.05], { vix: 15 }).regime, "crisis", "高波动 → crisis");
});

test("marketRegime: 缺 vix 时 vix=null 且不触发 crisis", () => {
  const r = marketRegime([0.01, 0.01]);
  assert.equal(r.vix, null);
  assert.equal(r.regime, "bull");
});

test("marketRegime: vol=样本标准差×√periods；trend=均值×periods", () => {
  const rets = [0.01, -0.01, 0.01, -0.01]; // 均值 0
  const r = marketRegime(rets, { periods: 252 });
  assert.equal(r.trend, 0, "均值 0 → trend 0");
  // 样本标准差（n-1 分母）= √(Σx²/(n-1))（此处均值=0）
  const n = rets.length;
  const varr = rets.reduce((a, b) => a + b * b, 0) / (n - 1);
  assert.ok(Math.abs(r.vol - Math.sqrt(varr * 252)) < 1e-9, "vol 口径");
});