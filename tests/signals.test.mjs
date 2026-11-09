import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSignalScore,
  screenPutSignals,
  detectBlackSwan,
} from "../lib/signals.js";

// ---------- computeSignalScore ----------
test("computeSignalScore: 默认入参 → 42 分 / mild_bearish / moderate", () => {
  const r = computeSignalScore();
  assert.equal(r.score, 42);
  assert.equal(r.direction, "mild_bearish");
  assert.equal(r.riskLevel, "moderate");
  assert.ok("components" in r && "rationale" in r);
  assert.ok(Object.keys(r.components).length === 3);
  assert.ok("timestamp" in r);
});

test("computeSignalScore: 全高 → bullish 且 ivRank>80 标记 high_iv", () => {
  const r = computeSignalScore(
    { fundamental: 0.33, technical: 0.34, volatility: 0.33 },
    { fairValueScore: 1, technicalScore: 1, ivRank: 90, thetaScore: 1 }
  );
  assert.ok(r.score >= 70);
  assert.equal(r.direction, "bullish");
  assert.equal(r.riskLevel, "high_iv");
});

test("computeSignalScore: 全低 → 0 分 / bearish / low_iv", () => {
  const r = computeSignalScore(
    { fundamental: 0.33, technical: 0.34, volatility: 0.33 },
    { fairValueScore: 0, technicalScore: 0, ivRank: 0, thetaScore: 0 }
  );
  assert.equal(r.score, 0);
  assert.equal(r.direction, "bearish");
  assert.equal(r.riskLevel, "low_iv");
});

test("computeSignalScore: 方向阈值 [50,70) → mild_bullish", () => {
  // fairValueScore 0.7 / technicalScore 0.7 / ivRank 50 / thetaScore 0.7
  const r = computeSignalScore(
    { fundamental: 0.33, technical: 0.34, volatility: 0.33 },
    { fairValueScore: 0.7, technicalScore: 0.7, ivRank: 50, thetaScore: 0.7 }
  );
  assert.ok(r.score >= 50 && r.score < 70);
  assert.equal(r.direction, "mild_bullish");
});

// ---------- screenPutSignals ----------
test("screenPutSignals: 仅保留 ivRank>50 且基本面>60，并按 score 降序", () => {
  const marketData = {
    AAA: { ivRank: 70, fundamentalScore: 70, suggestedStrike: 100, suggestedExpiry: "2025-01", premium: 5 },
    EEE: { ivRank: 85, fundamentalScore: 95, suggestedStrike: 200, suggestedExpiry: "2025-02", premium: 8 },
    BBB: { ivRank: 30, fundamentalScore: 80, suggestedStrike: 110 }, // ivRank 不足 → 排除
    CCC: { ivRank: 60, fundamentalScore: 40, suggestedStrike: 120 }, // 基本面不足 → 排除
  };
  const results = screenPutSignals(["AAA", "EEE", "BBB", "CCC", "ZZZ"], marketData);
  assert.equal(results.length, 2);
  // 降序：EEE（更高）在前
  assert.equal(results[0].ticker, "EEE");
  assert.equal(results[1].ticker, "AAA");
  assert.ok("score" in results[0] && "rationale" in results[0]);
});

test("screenPutSignals: 空输入 → 空数组；缺失数据被跳过", () => {
  assert.deepEqual(screenPutSignals([], {}), []);
  const r = screenPutSignals(["MISSING"], {});
  assert.equal(r.length, 0);
});

// ---------- detectBlackSwan ----------
test("detectBlackSwan: 平静市场 → 未触发", () => {
  const r = detectBlackSwan({ vix: 15, vixPercentile: 50, marketDrop: 0, sectorCorrelation: 0.5 });
  assert.equal(r.triggered, false);
  assert.deepEqual(r.triggers, []);
  assert.deepEqual(r.recommendations, []);
  assert.equal(r.historicalContext, null);
});

test("detectBlackSwan: 三重触发 → triggered + 4 条建议 + 历史案例", () => {
  const r = detectBlackSwan({ vix: 40, vixPercentile: 95, marketDrop: -0.05, sectorCorrelation: 0.95 });
  assert.equal(r.triggered, true);
  assert.equal(r.triggers.length, 3);
  assert.equal(r.recommendations.length, 4);
  assert.notEqual(r.historicalContext, null);
});

test("detectBlackSwan: 单一触发（仅 VIX 分位）", () => {
  const r = detectBlackSwan({ vix: 38, vixPercentile: 92, marketDrop: 0, sectorCorrelation: 0.6 });
  assert.equal(r.triggered, true);
  assert.equal(r.triggers.length, 1);
  assert.equal(r.recommendations.length, 4);
});

test("detectBlackSwan: returns 含 3σ+ 极值 → 触发尾部事件", () => {
  const base = Array.from({ length: 50 }, (_, i) => 0.005 * (i % 2 === 0 ? 1 : -1));
  base.push(-0.5); // 极端下跌，z >> 3
  const r = detectBlackSwan({ vix: 15, vixPercentile: 50, marketDrop: 0, sectorCorrelation: 0.5, returns: base });
  assert.ok(r.tailInfo, "tailInfo 应存在");
  assert.ok(r.tailInfo.count >= 1, "应检出尾部事件");
  assert.ok(r.triggers.some((t) => t.includes("尾部事件")), "应含尾部事件触发");
  assert.equal(r.triggered, true);
});

test("detectBlackSwan: 无 returns 或无极值 → tailInfo 为 null/0，不增触发", () => {
  const calm = detectBlackSwan({ vix: 15, vixPercentile: 50, marketDrop: 0, sectorCorrelation: 0.5 });
  assert.equal(calm.tailInfo, null, "无 returns → tailInfo=null");
  const noEvent = detectBlackSwan({
    vix: 15, vixPercentile: 50, marketDrop: 0, sectorCorrelation: 0.5,
    returns: Array.from({ length: 30 }, () => 0.001), // 全部相同 → 无离群
  });
  assert.equal(noEvent.tailInfo.count, 0, "无极值 → count=0");
  assert.ok(!noEvent.triggers.some((t) => t.includes("尾部事件")), "不应加尾部触发");
});
