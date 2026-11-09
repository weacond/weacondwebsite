// 尾部风险度量测试（lib/risk.js）。
// 用统计不变式断言：ES≥VaR、回撤∈[0,1]、分位数边界、尾部事件计数等。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  quantile,
  valueAtRisk,
  expectedShortfall,
  maxDrawdown,
  detectTailEvents,
} from "../lib/risk.js";

// ---------- quantile ----------

test("quantile: [1,2,3,4] 的 0/0.5/1 分位 = 1/2.5/4", () => {
  assert.equal(quantile([1, 2, 3, 4], 0), 1);
  assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(quantile([1, 2, 3, 4], 1), 4);
});

test("quantile: 空数组 → NaN；单元素 → 该元素", () => {
  assert.ok(Number.isNaN(quantile([], 0.5)));
  assert.equal(quantile([42], 0.3), 42);
});

test("quantile: 对未排序输入同样正确", () => {
  assert.equal(quantile([4, 1, 3, 2], 0.5), 2.5);
});

test("quantile: q 越界钳制到 [0,1]", () => {
  assert.equal(quantile([1, 2, 3, 4], -1), 1);
  assert.equal(quantile([1, 2, 3, 4], 2), 4);
});

// ---------- valueAtRisk ----------

test("valueAtRisk: 95% VaR 为正的损失", () => {
  const returns = [-0.1, -0.05, -0.03, 0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.1];
  const var95 = valueAtRisk(returns, 0.95);
  assert.ok(var95 > 0, "VaR 应为正损失");
  assert.ok(var95 <= 0.1, "VaR 不应超过最大单日跌幅");
});

test("valueAtRisk: 全为正收益 → VaR ≤ 0（无损失）", () => {
  const var95 = valueAtRisk([0.01, 0.02, 0.03, 0.04, 0.05], 0.95);
  assert.ok(var95 <= 0, `全正收益 VaR 应≤0，got ${var95}`);
});

// ---------- expectedShortfall ----------

test("expectedShortfall: 恒满足 ES(c) ≥ VaR(c)", () => {
  for (const returns of [
    [-0.1, -0.05, -0.03, 0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.1],
    [-0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15],
    [-0.03, -0.03, -0.03, -0.03, -0.03], // 常量尾部
  ]) {
    const es = expectedShortfall(returns, 0.95);
    const v = valueAtRisk(returns, 0.95);
    assert.ok(es >= v - 1e-9, `ES(${es}) 应 ≥ VaR(${v})`);
  }
});

test("expectedShortfall: 空数组 → NaN", () => {
  assert.ok(Number.isNaN(expectedShortfall([], 0.95)));
});

// ---------- maxDrawdown ----------

test("maxDrawdown: [100,110,90,105] 峰值110→谷90 = 18.18%", () => {
  const mdd = maxDrawdown([100, 110, 90, 105]);
  assert.ok(Math.abs(mdd - 20 / 110) < 1e-9, `got ${mdd}`);
});

test("maxDrawdown: 单调递增 → 0（无回撤）", () => {
  assert.equal(maxDrawdown([100, 101, 102, 103]), 0);
});

test("maxDrawdown: 结果 ∈ [0,1]", () => {
  const mdd = maxDrawdown([100, 50, 80, 30, 200]);
  assert.ok(mdd >= 0 && mdd <= 1, `got ${mdd}`);
});

test("maxDrawdown: 空数组 → 0", () => {
  assert.equal(maxDrawdown([]), 0);
});

// ---------- detectTailEvents ----------

test("detectTailEvents: 长序列含极端离群值 → 至少 1 个尾部事件", () => {
  // 50 个 ±0.005 的小波动(std≈0.005) + 一个 −0.5 极端下跌 → z≈−100 > 3
  const base = Array.from({ length: 50 }, (_, i) => 0.005 * (i % 2 === 0 ? 1 : -1));
  base.push(-0.5);
  const res = detectTailEvents(base, 3);
  assert.ok(res.count >= 1, `应有尾部事件，got ${res.count}`);
  assert.equal(res.events[0].return, -0.5, "最大尾部即 -0.5");
});

test("detectTailEvents: 全相等 → 无事件、std=0", () => {
  const res = detectTailEvents([0.01, 0.01, 0.01, 0.01], 3);
  assert.equal(res.count, 0);
  assert.equal(res.std, 0);
});

test("detectTailEvents: 少于 2 个元素 → 空事件", () => {
  assert.equal(detectTailEvents([0.01], 3).count, 0);
});

test("detectTailEvents: 清洗 NaN/非数后仍能检测", () => {
  const base = Array.from({ length: 50 }, (_, i) => 0.005 * (i % 2 === 0 ? 1 : -1));
  base.push(NaN, "x"); // 应被清洗
  base.push(-0.5); // 极端下跌
  const res = detectTailEvents(base, 3);
  assert.ok(res.count >= 1, "清洗后 -0.5 仍触发");
});
