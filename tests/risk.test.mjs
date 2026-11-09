// 尾部风险度量测试（lib/risk.js）。
// 用统计不变式断言：ES≥VaR、回撤∈[0,1]、分位数边界、尾部事件计数等。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  quantile,
  valueAtRisk,
  expectedShortfall,
  maxDrawdown,
  drawdownRecovery,
  detectTailEvents,
  riskProfileFromEquity,
  kellyFraction,
  fractionalKelly,
  probabilityOfRuin,
  riskBudget,
  maxLosingStreak,
  maxWinStreak,
  ulcerIndex,
  excessKurtosis,
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

// ---------- riskProfileFromEquity ----------

test("riskProfileFromEquity: 点数<2 → null", () => {
  assert.equal(riskProfileFromEquity([100]), null);
  assert.equal(riskProfileFromEquity([]), null);
});

test("riskProfileFromEquity: 同时支持 number[] 与 [{value}]，结果一致", () => {
  const nums = [100, 110, 90, 100, 120];
  const objs = [100, 110, 90, 100, 120].map((v) => ({ value: v }));
  const a = riskProfileFromEquity(nums);
  const b = riskProfileFromEquity(objs);
  assert.ok(a && b);
  assert.equal(a.mdd, b.mdd, "两种输入 mdd 应一致");
  assert.ok(a.var > 0, "VaR 应为正损失");
  assert.ok(a.cvar >= a.var - 1e-9, "CVaR ≥ VaR");
  assert.ok(Number.isFinite(a.kurtosis), "含峰度字段且为有限数");
  assert.equal(a.kurtosis, b.kurtosis, "两种输入峰度一致");
});

test("riskProfileFromEquity: mdd 与 maxDrawdown 同源一致", () => {
  const curve = [100, 102, 98, 105, 110, 95, 88, 100];
  const prof = riskProfileFromEquity(curve);
  assert.ok(Math.abs(prof.mdd - maxDrawdown(curve)) < 1e-12, "剖面 mdd 应等于 maxDrawdown");
  assert.equal(prof.n, curve.length - 1, "收益点数 = 净值点数 − 1");
});

// ---------- Kelly / 破产概率 ----------

test("kellyFraction: 无优势(50/50) → 0", () => {
  assert.equal(kellyFraction(0.5, 1, 1), 0);
});

test("kellyFraction: p=0.6 对称 → 0.2；p=1 → 1；负优势 → 0", () => {
  assert.ok(Math.abs(kellyFraction(0.6, 1, 1) - 0.2) < 1e-9, "2p−1 = 0.2");
  assert.equal(kellyFraction(1, 1, 1), 1, "必胜 → 满仓");
  assert.equal(kellyFraction(0.4, 1, 1), 0, "负优势被钳到 0");
});

test("kellyFraction: 盈亏比越高 f* 越大；退化输入 → 0", () => {
  assert.ok(kellyFraction(0.6, 2, 1) > kellyFraction(0.6, 1, 1), "winMult 提升 f*");
  assert.equal(kellyFraction(1.5, 1, 1), 0, "p>1 退化");
  assert.equal(kellyFraction(-0.1, 1, 1), 0, "p<0 退化");
  assert.equal(kellyFraction(0.6, 0, 1), 0, "winMult≤0 退化");
});

test("fractionalKelly: 半凯利 = f*×0.5", () => {
  assert.ok(Math.abs(fractionalKelly(0.6, 0.5, 1, 1) - 0.1) < 1e-9, "0.2×0.5 = 0.1");
});

test("probabilityOfRuin: 无优势→0.5；正优势 <0.5 且随 N 递减；负优势 >0.5", () => {
  assert.equal(probabilityOfRuin(0, 100), 0.5, "无优势基准 0.5");
  const pr100 = probabilityOfRuin(0.01, 100);
  const pr1 = probabilityOfRuin(0.01, 1);
  assert.ok(pr100 < 0.5 && pr100 >= 0, "正优势破产概率 <0.5 且非负");
  assert.ok(pr1 > pr100, "注数越多，正优势下破产概率越低");
  assert.ok(probabilityOfRuin(-0.01, 100) > 0.5, "负优势破产概率 >0.5");
  assert.equal(probabilityOfRuin(0.01, 0), 1, "N=0 → 1");
});

// ---------- drawdownRecovery ----------

test("drawdownRecovery: mdd 与 maxDrawdown 同口径一致", () => {
  const curve = [100, 110, 90, 80, 100, 120];
  const r = drawdownRecovery(curve);
  assert.ok(Math.abs(r.mdd - maxDrawdown(curve)) < 1e-12, "mdd 一致");
  assert.equal(r.troughIdx, 3, "最深点在 index 3 (80)");
  assert.equal(r.peakIdx, 1, "前峰在 index 1 (110)");
});

test("drawdownRecovery: 已恢复时 recovery 为回升期数", () => {
  // 峰 100(0) → 谷 50(2) → 回到 100(4)：恢复 2 期
  const curve = [100, 80, 50, 70, 100, 110];
  const r = drawdownRecovery(curve);
  assert.ok(r.recovered, "应已恢复");
  assert.equal(r.recovery, 2, "从谷到回峰 2 期");
});

test("drawdownRecovery: 未恢复时 recovery=null、recovered=false", () => {
  const curve = [100, 90, 80, 70]; // 持续下跌，未回到 100
  const r = drawdownRecovery(curve);
  assert.equal(r.recovery, null, "未恢复 → null");
  assert.equal(r.recovered, false);
});


// ---------- riskBudget ----------

test("riskBudget: 0.02 名义 VaR、1% 日亏上限 → 0.5 半仓", () => {
  assert.ok(Math.abs(riskBudget(0.02, 0.01) - 0.5) < 1e-9, "应为 0.5");
});

test("riskBudget: varPerUnit≤0 或非法 → 0", () => {
  assert.equal(riskBudget(0, 0.01), 0, "varPerUnit=0 → 0");
  assert.equal(riskBudget(-0.01, 0.01), 0, "varPerUnit<0 → 0");
  assert.equal(riskBudget(NaN, 0.01), 0, "NaN → 0");
  assert.equal(riskBudget(0.02, NaN), 0, "maxLossFrac NaN → 0");
});

test("riskBudget: 非负且随 maxLossFrac 单调递增", () => {
  assert.ok(riskBudget(0.02, 0.01) >= 0, "非负");
  assert.ok(riskBudget(0.02, 0.03) > riskBudget(0.02, 0.01), "maxLossFrac↑ → 仓位↑");
});

// ---------- maxLosingStreak ----------

test("maxLosingStreak: 末尾三笔连亏 → 3", () => {
  assert.equal(maxLosingStreak([2, -1, -1, 3, -1, -1, -1]), 3);
});

test("maxLosingStreak: 交易对象数组 [{pnl}] 口径一致", () => {
  assert.equal(maxLosingStreak([{ pnl: 1 }, { pnl: -2 }, { pnl: -3 }, { pnl: 4 }]), 2);
});

test("maxLosingStreak: 全盈利 → 0；空/非法 → 0", () => {
  assert.equal(maxLosingStreak([1, 2, 3]), 0, "全盈利 → 0");
  assert.equal(maxLosingStreak([]), 0, "空数组 → 0");
  assert.equal(maxLosingStreak(null), 0, "null → 0");
});

test("maxLosingStreak: scratch(pnl=0) 计入连亏（与 calcMetrics 亏损口径一致）", () => {
  assert.equal(maxLosingStreak([1, -1, 0, -1]), 3, "0 不中断连亏");
});

// ---------- maxWinStreak ----------

test("maxWinStreak: 末尾三笔连盈 → 3", () => {
  assert.equal(maxWinStreak([1, 2, -1, 3, 4, 5]), 3);
});

test("maxWinStreak: 交易对象数组 [{pnl}] 口径一致", () => {
  assert.equal(maxWinStreak([{ pnl: -1 }, { pnl: 2 }, { pnl: 3 }, { pnl: 4 }, { pnl: -5 }]), 3);
});

test("maxWinStreak: 全亏损 → 0；空/非法 → 0", () => {
  assert.equal(maxWinStreak([-1, -2, -3]), 0, "全亏损 → 0");
  assert.equal(maxWinStreak([]), 0, "空数组 → 0");
  assert.equal(maxWinStreak(null), 0, "null → 0");
});

test("maxWinStreak: scratch(pnl=0) 中断连盈（仅 pnl>0 计为盈利）", () => {
  assert.equal(maxWinStreak([1, 2, 0, 3]), 2, "0 中断连盈");
});

// ---------- ulcerIndex ----------

test("ulcerIndex: 空/单点 → 0", () => {
  assert.equal(ulcerIndex([]), 0, "空 → 0");
  assert.equal(ulcerIndex([100]), 0, "单点 → 0");
});

test("ulcerIndex: 全程上涨 → 0（回撤恒为 0）", () => {
  assert.equal(ulcerIndex([1, 2, 3, 4, 5]), 0, "无回撤 → 0");
});

test("ulcerIndex: 恒定回撤段 = √(Σdd²/n)（首点回撤为 0）", () => {
  // [100,50,50,50]：首点回撤 0，其后三点各 0.5 → √((0.25×3)/4)
  const expected = Math.sqrt((0.25 * 3) / 4);
  assert.ok(Math.abs(ulcerIndex([100, 50, 50, 50]) - expected) < 1e-12, "含首点 0 回撤");
});

test("ulcerIndex: 回撤越大/越久 → 溃疡指数更大", () => {
  const mild = ulcerIndex([100, 90, 100, 95, 100]); // 浅而短
  const severe = ulcerIndex([100, 50, 40, 60, 80, 100]); // 深而长
  assert.ok(severe > mild, "深长回撤 → 更大");
});

// ---------- excessKurtosis ----------

test("excessKurtosis: 均匀序列 [1,2,3,4,5] 精确值 -1.3", () => {
  // m2=10/5=2, m4=34/5=6.8 → 6.8/4 − 3 = −1.3
  assert.ok(Math.abs(excessKurtosis([1, 2, 3, 4, 5]) - (-1.3)) < 1e-9, "均匀序列 −1.3");
});

test("excessKurtosis: 肥尾样本 > 0，薄尾 < 0", () => {
  // 多数集中在 0、偶有极端值 → 厚尾
  const fat = [0, 0, 0, 0, 0, 10, -10, 0, 0, 0];
  assert.ok(excessKurtosis(fat) > 0, "肥尾 > 0");
  // 均匀铺开 → 薄尾（负峰度）
  assert.ok(excessKurtosis([1, 2, 3, 4, 5, 6]) < 0, "均匀 < 0");
});

test("excessKurtosis: <4 点或全相等 → 0；剔除非有限", () => {
  assert.equal(excessKurtosis([1, 2, 3]), 0, "不足 4 点 → 0");
  assert.equal(excessKurtosis([5, 5, 5, 5, 5]), 0, "全相等(方差0) → 0");
  // 非有限被剔除，等价于 [1,2,3,4]
  assert.ok(Math.abs(excessKurtosis([1, 2, NaN, 3, Infinity, 4]) - excessKurtosis([1, 2, 3, 4])) < 1e-9, "剔除非有限");
});





