import { test } from "node:test";
import assert from "node:assert/strict";
import { assessMacroState, getFactorSensitivity, MACRO_FACTORS } from "../lib/macro.js";

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