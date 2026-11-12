// tests/regime.test.mjs — lib/regime.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  vixScore,
  priceScore,
  yieldScore,
  creditScore,
  aggregateScore,
  classifyRegime,
  evaluateRegime,
  regimeForPreset,
  REGIME_PRESETS,
  REGIME_BANDS,
} from "../lib/regime.js";

test("vixScore: 单调递减，vix 越低越偏 risk-on，且饱和于 [-40,40]", () => {
  assert.equal(vixScore(0), 40);
  assert.equal(vixScore(20), 0);
  assert.equal(vixScore(40), -40);
  assert.equal(vixScore(80), -40, "饱和下限");
  assert.ok(vixScore(15) > vixScore(25), "低 VIX 得分更高");
});

test("priceScore: 价格高于 200dma 为正，低于为负，饱和", () => {
  assert.ok(priceScore(6) > 0);
  assert.ok(priceScore(-6) < 0);
  assert.equal(priceScore(0), 0);
  assert.equal(priceScore(100), 40, "饱和上限");
});

test("yieldScore: 倒挂（负）偏 risk-off，陡峭（正）偏 risk-on", () => {
  assert.ok(yieldScore(-0.6) < 0, "倒挂为负");
  assert.ok(yieldScore(1.0) > 0, "陡峭为正");
  assert.equal(yieldScore(0), 0);
});

test("creditScore: 窄利差偏 risk-on，宽利差偏 risk-off", () => {
  assert.ok(creditScore(300) > 0, "窄为正");
  assert.ok(creditScore(1000) < 0, "宽为负");
  assert.equal(creditScore(500), 0, "500bp 为中性");
});

test("aggregateScore: 中性输入总分≈0，极端输入饱和到 ±100", () => {
  const neutral = aggregateScore(REGIME_PRESETS.normal.inputs).total;
  assert.ok(Math.abs(neutral) < 30, "常态总分接近 0");
  // 极端输入（全饱和）汇总后夹到 -100
  const extreme = aggregateScore({ vix: 100, spyVsMa200: -100, yieldSpread: -100, creditOAS: 5000 }).total;
  assert.equal(extreme, -100, "全负饱和到 -100");
  assert.equal(aggregateScore({ vix: 0, spyVsMa200: 100, yieldSpread: 100, creditOAS: 0 }).total, 100, "全正饱和到 +100");
  assert.ok(aggregateScore(REGIME_PRESETS.panic.inputs).total < -45, "恐慌 < -45 (Risk-Off)");
});

test("classifyRegime: 单调映射 5 档", () => {
  assert.equal(classifyRegime(60).key, "riskon");
  assert.equal(classifyRegime(20).key, "tilton");
  assert.equal(classifyRegime(0).key, "neutral");
  assert.equal(classifyRegime(-30).key, "tiltoff");
  assert.equal(classifyRegime(-100).key, "riskoff");
});

test("evaluateRegime: 返回分项/总分/状态，且状态带标签", () => {
  const r = evaluateRegime(REGIME_PRESETS.bull.inputs);
  assert.equal(r.regime.key, "riskon");
  assert.ok(typeof r.regime.label === "string" && r.regime.label.length > 0);
  assert.equal(r.components.length, 4);
  assert.equal(r.total, r.regime.total, "状态携带总分");
});

test("预设落地到合理状态：bull=RiskOn，panic=Crisis，inverted 偏 Risk-Off", () => {
  assert.equal(regimeForPreset("bull").result.regime.key, "riskon");
  assert.equal(regimeForPreset("panic").result.regime.key, "riskoff");
  assert.equal(regimeForPreset("inverted").result.regime.key, "tiltoff");
  assert.equal(regimeForPreset("normal").result.regime.key, "neutral");
});

test("未知预设抛错；REGIME_BANDS 覆盖全区间且下限递增", () => {
  assert.throws(() => regimeForPreset("nope"), /Unknown/);
  const mins = REGIME_BANDS.map((b) => b.min);
  for (let i = 1; i < mins.length; i++) assert.ok(mins[i] < mins[i - 1]);
  assert.ok(mins[0] >= 0, "最高档下限非负");
  assert.ok(mins[mins.length - 1] === -Infinity, "最低档覆盖到底");
});
