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
  maxDrawdownStats,
  kellyFraction,
  fractionalKelly,
  probabilityOfRuin,
  riskBudget,
  maxLosingStreak,
  maxWinStreak,
  ulcerIndex,
  excessKurtosis,
  skewness,
  sharpeRatio,
  sortinoRatio,
  downsideDeviation,
  omegaRatio,
  tailRatio,
  sterlingRatio,
  drawdownDuration,
  informationRatio,
  captureRatios,
  trackingError,
  beta,
  alpha,
  treynorRatio,
  martinRatio,
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
  assert.ok(Number.isFinite(a.skewness), "含偏度字段且为有限数");
  assert.equal(a.skewness, b.skewness, "两种输入偏度一致");
});

test("riskProfileFromEquity: mdd 与 maxDrawdown 同源一致", () => {
  const curve = [100, 102, 98, 105, 110, 95, 88, 100];
  const prof = riskProfileFromEquity(curve);
  assert.ok(Math.abs(prof.mdd - maxDrawdown(curve)) < 1e-12, "剖面 mdd 应等于 maxDrawdown");
  assert.equal(prof.n, curve.length - 1, "收益点数 = 净值点数 − 1");
});

// ---------- maxDrawdownStats（回撤画像）----------

test("maxDrawdownStats: 单调上升 → 全 0", () => {
  const s = maxDrawdownStats([100, 101, 102, 103]);
  assert.equal(s.maxDD, 0);
  assert.equal(s.avgDD, 0);
  assert.equal(s.longestUnderwater, 0);
  assert.equal(s.pctUnderwater, 0);
});

test("maxDrawdownStats: 空 / 单点 → 全 0", () => {
  for (const c of [[], [100]]) {
    const s = maxDrawdownStats(c);
    assert.deepEqual(s, { maxDD: 0, avgDD: 0, longestUnderwater: 0, pctUnderwater: 0 });
  }
});

test("maxDrawdownStats: 已知回撤曲线（幅度/时长/频率）", () => {
  // 100→90(−10%)→80(−20%)→100(创新高)→110；水下点 2 个，n=6
  const s = maxDrawdownStats([100, 100, 90, 80, 100, 110]);
  assert.ok(Math.abs(s.maxDD - 0.2) < 1e-9, "最大回撤 20%");
  assert.ok(Math.abs(s.maxDD - maxDrawdown([100, 100, 90, 80, 100, 110])) < 1e-12, "与 maxDrawdown 同源一致");
  assert.equal(s.longestUnderwater, 2, "连续水下 2 点");
  assert.ok(Math.abs(s.avgDD - 0.15) < 1e-9, "平均回撤 (10%+20%)/2");
  assert.ok(Math.abs(s.pctUnderwater - (2 / 6) * 100) < 1e-9, "水下时间占比 2/6");
});

test("maxDrawdownStats: 同时支持 number[] 与 [{value}]", () => {
  const nums = [100, 90, 110];
  const objs = nums.map((v) => ({ value: v }));
  assert.deepEqual(maxDrawdownStats(objs), maxDrawdownStats(nums));
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

// ---------- sharpeRatio / sortinoRatio ----------

test("sharpeRatio: 精确值与口径", () => {
  // [0.01, 0.02, 0.03, 0.04]：μ=0.025，偏差 [−.015,−.005,.005,.015]，样本 σ
  const r = [0.01, 0.02, 0.03, 0.04];
  const mean = 0.025;
  const std = Math.sqrt((0.015 ** 2 + 0.005 ** 2 + 0.005 ** 2 + 0.015 ** 2) / 3);
  const expect = (mean / std) * Math.sqrt(252);
  assert.ok(Math.abs(sharpeRatio(r) - expect) < 1e-9, "样本 σ 口径");
  assert.equal(sharpeRatio([0.1]), 0, "<2 点 → 0");
  assert.equal(sharpeRatio([0.1, 0.1]), 0, "σ=0 → 0");
});

test("sortinoRatio: 仅计下行，精确值与口径", () => {
  const r = [0.1, -0.2, 0.3, -0.1]; // 下行样本 [-0.2, -0.1]
  const mean = (0.1 - 0.2 + 0.3 - 0.1) / 4; // 0.025
  const down = [-0.2, -0.1];
  const dStd = Math.sqrt((0.04 + 0.01) / 2); // 总体分母
  const expect = (mean / dStd) * Math.sqrt(252);
  assert.ok(Math.abs(sortinoRatio(r) - expect) < 1e-9, "下行总体 σ 口径");
  // 无/仅一个下行样本 → 0
  assert.equal(sortinoRatio([0.1, 0.2, 0.3]), 0, "无下行 → 0");
  assert.equal(sortinoRatio([-0.1, 0.2, 0.3]), 0, "仅一个下行 → 0");
});

test("sharpeRatio ≥ 0 时 sortinoRatio ≥ sharpeRatio（下行 σ ≤ 总 σ）", () => {
  const r = [0.01, -0.03, 0.02, -0.02, 0.04, -0.01, 0.03, 0.02, -0.05, 0.06];
  const s = sharpeRatio(r);
  const so = sortinoRatio(r);
  if (s > 0) assert.ok(so >= s - 1e-9, "下行波动 ≤ 总波动 → Sortino ≥ Sharpe");
});

// ---------- skewness ----------

test("skewness: 对称分布 → 0；取反号相反", () => {
  assert.ok(Math.abs(skewness([-1, 0, 1])) < 1e-12, "对称 → 0");
  assert.ok(Math.abs(skewness([1, 2, 3, 4, 5])) < 1e-12, "均匀对称 → 0");
  const pos = skewness([0, 0, 0, 0, 10]); // 右偏
  const neg = skewness([0, 0, 0, 0, -10]); // 左偏
  assert.ok(pos > 0, "右偏 > 0");
  assert.ok(neg < 0, "左偏 < 0");
  assert.ok(Math.abs(pos + neg) < 1e-12, "取反号相反");
});

test("skewness: <3 点或全相等 → 0；剔除非有限", () => {
  assert.equal(skewness([1, 2]), 0, "不足 3 点 → 0");
  assert.equal(skewness([5, 5, 5]), 0, "全相等(方差0) → 0");
  assert.ok(Math.abs(skewness([1, 2, NaN, 3, 4, Infinity]) - skewness([1, 2, 3, 4])) < 1e-9, "剔除非有限");
});

test("skewness: 右偏序列 m3>0 → 正偏度", () => {
  // 多数小正收益 + 一个巨大正收益 → 右偏
  const r = [0.01, 0.01, 0.01, 0.01, 0.01, 0.5];
  assert.ok(skewness(r) > 0, "右偏正尾 → 正偏度");
});

// ---------- downsideDeviation / omegaRatio / tailRatio ----------

test("downsideDeviation: 仅计下行，全样本 n 分母", () => {
  // [0.1, -0.2, 0.3, -0.1]，threshold=0：仅 -0.2,-0.1 计，分母 n=4
  const expect = Math.sqrt((0.04 + 0.01) / 4);
  assert.ok(Math.abs(downsideDeviation([0.1, -0.2, 0.3, -0.1]) - expect) < 1e-12, "全样本分母");
  assert.equal(downsideDeviation([]), 0, "空 → 0");
  assert.equal(downsideDeviation([0.1, 0.2]), 0, "无下行 → 0");
});

test("omegaRatio: 上行总收益/下行总损失；无下行封顶 999；全无 → 0", () => {
  // up = 0.2 + 0.3 = 0.5，down = 0.2 + 0.1 = 0.3 → 5/3
  const expect = 0.5 / 0.3;
  assert.ok(Math.abs(omegaRatio([0.2, -0.2, 0.3, -0.1]) - expect) < 1e-12, "Ω = up/down");
  assert.equal(omegaRatio([0.1, 0.2, 0.3]), 999, "无上行外下行(仅上行) → 999");
  assert.equal(omegaRatio([0.1, 0.1, 0.1]), 999, "全为正 → 999");
  assert.equal(omegaRatio([]), 0, "空 → 0");
  assert.equal(omegaRatio([0, 0, 0]), 0, "全为阈值 → 0");
});

test("tailRatio: 上尾分位/|下尾分位|；对称 → 1；下尾为 0 → 0", () => {
  // 对称分布 [-1,0,1]：q95≈0.8, |q05|≈0.8 → 1
  const r = [-1, 0, 1];
  const tr = tailRatio(r, 0.05, 0.95);
  assert.ok(Math.abs(tr - 1) < 1e-6, "对称 → 1");
  assert.equal(tailRatio([]), 0, "空 → 0");
  // 含 0 质量：下尾分位恰为 0 → 0
  assert.equal(tailRatio([0, 0, 0, 0, 1, 2, 3], 0.05, 0.95), 0, "下尾分位 0 → 0");
});

// ---------- sterlingRatio ----------

test("sterlingRatio: 总收益/最长连亏；精确值、封顶、负收益、非有限", () => {
  // 100 / 10 = 10
  assert.ok(Math.abs(sterlingRatio(100, 10) - 10) < 1e-12, "100/10 = 10");
  // 无连亏(分母 0)：有收益 → 封顶 999；无收益 → 0
  assert.equal(sterlingRatio(50, 0), 999, "有收益无连亏 → 999");
  assert.equal(sterlingRatio(-30, 0), 0, "亏损且无连亏 → 0");
  assert.equal(sterlingRatio(0, 5), 0, "零收益 → 0");
  // 负收益 / 正连亏 → 负（策略变差，有意义）
  assert.ok(Math.abs(sterlingRatio(-30, 5) + 6) < 1e-12, "−30/5 = −6");
  // 非有限输入 → 0（不抛异常）
  assert.equal(sterlingRatio(NaN, 5), 0, "NaN 收益 → 0");
  assert.equal(sterlingRatio(100, NaN), 0, "NaN 连亏 → 0");
  assert.equal(sterlingRatio(100, Infinity), 0, "Infinity 连亏 → 0");
});

// ---------- drawdownDuration ----------

test("drawdownDuration: 最深回撤区间的 K 线根数；全程上涨/空/单点 → 0", () => {
  // [100,110,90,105]：峰 110(idx1) → 谷 90(idx2)，持续 1 根
  assert.equal(drawdownDuration([100, 110, 90, 105]), 1);
  // [100,110,90,70,60,100]：峰 110(idx1) → 谷 60(idx4)，持续 3 根
  assert.equal(drawdownDuration([100, 110, 90, 70, 60, 100]), 3);
  assert.equal(drawdownDuration([100, 101, 102, 103]), 0, "全程上涨 → 0");
  assert.equal(drawdownDuration([]), 0, "空 → 0");
  assert.equal(drawdownDuration([42]), 0, "单点 → 0");
});

test("drawdownDuration: 取最深回撤区间；多段回撤取更深者", () => {
  // 第一段小回撤 idx2→3(1 根)，第二段深回撤 idx5→6(1 根但更深) → 取深者
  const eq = [100, 105, 102, 101, 110, 90, 80, 130];
  // 峰 110(idx4) → 谷 80(idx6)，持续 6-4=2 根
  assert.equal(drawdownDuration(eq), 2, "多段回撤取最深者，持续 2 根");
  // 全程未创新高：峰在 idx1，谷在 idx5，持续 4 根
  assert.equal(drawdownDuration([100, 120, 100, 90, 80, 70]), 4, "未恢复取全程谷底");
});

// ---------- informationRatio ----------

test("informationRatio: 与基准完全相同 → 超额恒 0 → IR=0", () => {
  const r = [0.02, -0.01, 0.03, -0.02, 0.01];
  assert.equal(informationRatio(r, r), 0, "超额全 0 → σ=0 → IR=0");
});

test("informationRatio: 策略稳定跑赢基准 → IR>0", () => {
  const r = [0.02, 0.015, 0.025, 0.018];
  const b = [0.005, 0.008, 0.006, 0.01];
  const ir = informationRatio(r, b, 252);
  assert.ok(ir > 0, "稳定超额 → IR>0");
});

test("informationRatio: 边界——配对<2 或空 → 0；长度不匹配按较短截断", () => {
  assert.equal(informationRatio([], []), 0, "空 → 0");
  assert.equal(informationRatio([0.01], [0.01]), 0, "单点 → 0");
  // 3 个策略收益 vs 1 个基准 → 仅 1 对（<2）→ 0
  assert.equal(informationRatio([0.01, 0.02, 0.03], [0.01]), 0, "长度不匹配截断到 1 对 → 0");
});

// ---------- captureRatios ----------

test("captureRatios: 完美跟踪基准 → up=down=1", () => {
  const r = [0.02, -0.01, 0.03, -0.02];
  assert.deepEqual(captureRatios(r, r), { up: 1, down: 1 }, "完美跟踪 → 1/1");
});

test("captureRatios: 下行捕获 <1（跌得比基准少）；基准全正 → 下行捕获 0", () => {
  // 基准下行 -0.02，策略仅 -0.005 → 下行捕获 0.005/0.02=0.25
  const cap = captureRatios([0.0, -0.005], [0.01, -0.02]);
  assert.ok(Math.abs(cap.down - 0.25) < 1e-9, "下行捕获 = 0.25");
  // 基准全正 → 无下行区间 → down=0
  assert.equal(captureRatios([0.01, 0.02], [0.01, 0.02]).down, 0, "基准全正 → 下行捕获 0");
});

test("captureRatios: 边界——空 → {0,0}；长度不匹配按较短截断", () => {
  assert.deepEqual(captureRatios([], []), { up: 0, down: 0 }, "空 → {0,0}");
  const cap = captureRatios([0.01, 0.02, 0.03], [0.01]);
  assert.equal(cap.up, 1, "截断到 1 对（基准>0）→ up=1");
  assert.equal(cap.down, 0, "无下行区间 → down=0");
});

// ---------- trackingError ----------

test("trackingError: 完美跟踪基准 → TE=0；空 / 单点 → 0", () => {
  const r = [0.02, -0.01, 0.03, -0.02, 0.01];
  assert.equal(trackingError(r, r), 0, "完美跟踪 → TE=0");
  assert.equal(trackingError([], []), 0, "空 → 0");
  assert.equal(trackingError([0.01], [0.01]), 0, "单点 → 0");
});

test("trackingError: 是信息比率的分母；IR × TE = 年化超额收益（mean × periods）", () => {
  const r = [0.02, 0.015, 0.025, 0.018];
  const b = [0.005, 0.008, 0.006, 0.01];
  const te = trackingError(r, b, 252);
  const ir = informationRatio(r, b, 252);
  // 年化超额收益 = mean(active) × periods
  const active = r.map((x, i) => x - b[i]);
  const mean = active.reduce((a, c) => a + c, 0) / active.length;
  assert.ok(te > 0, "存在超额波动 → TE>0");
  // IR = (mean/σ)·√P，TE = σ·√P ⇒ IR × TE = mean × P
  assert.ok(Math.abs(ir * te - mean * 252) < 1e-9, "IR × TE = 年化超额收益（mean × periods）");
});

// ---------- beta / alpha ----------

test("beta: 自回归 r=b → 1；r=k·b → k；基准无方差 / 配对<2 → 0", () => {
  const x = [0.01, -0.02, 0.03, 0.005];
  assert.ok(Math.abs(beta(x, x) - 1) < 1e-12, "r=b → β=1");
  // r = 2·b（同斜率放大 2 倍）→ β=2
  const b = [0.01, 0.02, 0.03, 0.015];
  assert.ok(Math.abs(beta(b.map((v) => 2 * v), b) - 2) < 1e-9, "r=2b → β=2");
  assert.equal(beta([0.01, 0.02, 0.03], [0.01, 0.01, 0.01]), 0, "基准恒定(var=0) → 0");
  assert.equal(beta([], []), 0, "空 → 0");
  assert.equal(beta([0.01], [0.01]), 0, "配对<2 → 0");
});

test("beta: 非有限被剔除后仍按有限配对回归", () => {
  const r = [0.01, NaN, 0.03, Infinity];
  const bm = [0.01, NaN, 0.03, Infinity];
  assert.ok(Math.abs(beta(r, bm) - 1) < 1e-12, "剔非有限后 r=b → β=1");
});

test("alpha: r=b（β=1）→ 0；基准无方差(β=0)→ mean_r×P；rf 在 β=1 时抵消", () => {
  const x = [0.01, -0.02, 0.03, 0.005];
  assert.ok(Math.abs(alpha(x, x, 0, 252)) < 1e-12, "r=b, β=1 → α=0");
  // 基准无方差 → β=0，α = mean_r × P
  const r2 = [0.01, 0.01];
  assert.ok(Math.abs(alpha(r2, [0, 0], 0, 252) - 2.52) < 1e-9, "β=0 → α=0.01×252=2.52");
  // β=1 时 rf 抵消：r=b, 任意 rf/P 仍 → 0
  assert.ok(Math.abs(alpha(x, x, 0.0256, 252)) < 1e-12, "β=1 → rf 抵消, α=0");
  assert.equal(alpha([], []), 0, "空 → 0");
});

test("treynorRatio: r=b(β=1) → mean_r×P；r=2b(β=2) 同除；基准无方差(β=0)/空 → 0", () => {
  const x = [0.01, -0.02, 0.03, 0.005]; // mean = 0.00625
  // β=1，rf=0 → (0.00625×252)/1 = 1.575
  assert.ok(Math.abs(treynorRatio(x, x, 0, 252) - 1.575) < 1e-9, "r=b → 1.575");
  // r=2b → β=2，mean_r = 2×0.01875 = 0.0375 → (0.0375×252)/2 = 4.725
  const b = [0.01, 0.02, 0.03, 0.015];
  assert.ok(Math.abs(treynorRatio(b.map((v) => 2 * v), b, 0, 252) - 4.725) < 1e-9, "r=2b → 4.725");
  // 基准恒定 → β=0 → 无法归一 → 0
  assert.equal(treynorRatio([0.01, 0.02], [0.01, 0.01], 0, 252), 0, "基准无方差(β=0) → 0");
  assert.equal(treynorRatio([], []), 0, "空 → 0");
  assert.equal(treynorRatio([0.01], [0.01]), 0, "配对<2 → 0");
});

test("martinRatio: 超额/下行标准差×√P；无下行(全非负)→ 0；空 → 0", () => {
  const x = [0.01, -0.02, 0.03, 0.005]; // mean=0.00625, dd=√(0.0004/4)=0.01
  // (0.00625/0.01)×√252 = 0.625×15.8745 ≈ 9.9215
  assert.ok(Math.abs(martinRatio(x, 252, 0, 0) - 0.625 * Math.sqrt(252)) < 1e-6, "≈9.92");
  // 全非负 → 下行标准差=0 → 0
  assert.equal(martinRatio([0.01, 0.02, 0.03], 252, 0, 0), 0, "无下行 → 0");
  assert.equal(martinRatio([], 252, 0, 0), 0, "空 → 0");
  // threshold 提高 → 更多样本计入下行 → dd 增大 → martin 下降
  const mHigh = martinRatio(x, 252, 0, 0.005);
  assert.ok(mHigh < 0.625 * Math.sqrt(252), "threshold=0.005 → 下行更大 → martin 更小");
});





