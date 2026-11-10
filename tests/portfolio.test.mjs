import { test } from "node:test";
import assert from "node:assert/strict";
import {
  portfolioReturn,
  portfolioVolatility,
  portfolioSharpe,
  volTargetScale,
  inverseVolWeights,
  riskContribution,
  riskParityWeights,
  maxSharpeWeights,
} from "../lib/portfolio.js";

// ---------- portfolioReturn ----------

test("portfolioReturn: 空 → 0；单序列 → 其均值", () => {
  assert.equal(portfolioReturn([]), 0, "空 → 0");
  assert.equal(portfolioReturn([[0.01, 0.03]]), 0.02, "单序列 → 均值");
});

test("portfolioReturn: 缺省等权 = 各序列均值平均", () => {
  // 序列1 均值 0.02，序列2 均值 0.04 → 等权 0.03
  const out = portfolioReturn([[0.01, 0.03], [0.02, 0.06]]);
  assert.ok(Math.abs(out - 0.03) < 1e-12, "等权=均值平均");
});

test("portfolioReturn: 显式权重按归一化加权", () => {
  // 权重 [3,1] → 归一 [0.75,0.25]；均值 [0.02, 0.04] → 0.75*0.02+0.25*0.04=0.025
  const out = portfolioReturn([[0.01, 0.03], [0.02, 0.06]], [3, 1]);
  assert.ok(Math.abs(out - 0.025) < 1e-12, "归一加权");
});

test("portfolioReturn: 权重全 0 退回等权；非有限权重忽略", () => {
  const z = portfolioReturn([[0.01, 0.03], [0.02, 0.06]], [0, 0]);
  assert.ok(Math.abs(z - 0.03) < 1e-12, "全 0 → 等权");
});

// ---------- portfolioVolatility ----------

test("portfolioVolatility: 完全相关等波动 → σ（无分散）", () => {
  // M=[[1,1],[1,1]]，等波动 σ=0.1，等权 → σ_p=σ
  const M = [
    [1, 1],
    [1, 1],
  ];
  const out = portfolioVolatility([0.1, 0.1], M);
  assert.ok(Math.abs(out - 0.1) < 1e-12, "完全相关 → 无分散化");
});

test("portfolioVolatility: 不相关等波动 → σ/√2（分散化）", () => {
  const M = [
    [1, 0],
    [0, 1],
  ];
  const out = portfolioVolatility([0.1, 0.1], M);
  assert.ok(Math.abs(out - 0.1 / Math.SQRT2) < 1e-12, "不相关 → σ/√2");
});

test("portfolioVolatility: 维度不匹配或空 → 0", () => {
  assert.equal(portfolioVolatility([0.1, 0.2], [[1]]), 0, "vols 与 M 维度不符 → 0");
  assert.equal(portfolioVolatility([], []), 0, "空 → 0");
});

// ---------- portfolioSharpe ----------

test("portfolioSharpe: 单资产 = (mean-rf)/σ·√periods", () => {
  // 单序列均值 0.02，σ=0.1，rf=0，periods=252
  const out = portfolioSharpe([[0.01, 0.03]], [0.1], [[1]]);
  const expected = (0.02 / 0.1) * Math.sqrt(252);
  assert.ok(Math.abs(out - expected) < 1e-9, "单资产夏普");
});

test("portfolioSharpe: 含 rf 扣减", () => {
  // 均值 0.02，rf=0.01 → (0.01)/0.1*√252
  const out = portfolioSharpe([[0.01, 0.03]], [0.1], [[1]], undefined, 0.01);
  const expected = (0.01 / 0.1) * Math.sqrt(252);
  assert.ok(Math.abs(out - expected) < 1e-9, "扣 rf");
});

test("portfolioSharpe: 波动为 0 → 0（不除零）", () => {
  assert.equal(portfolioSharpe([[0, 0]], [0], [[1]]), 0, "σ=0 → 0");
});

test("portfolioSharpe: 空序列 → 0", () => {
  assert.equal(portfolioSharpe([], [], []), 0, "空 → 0");
});

// ---------- volTargetScale ----------

test("volTargetScale: scale = targetVol / 当前 σ_p", () => {
  // 不相关等波动 σ=0.1，等权 → σ_p=0.1/√2；target=0.05 → scale=0.05/(0.1/√2)=√2/2
  const M = [
    [1, 0],
    [0, 1],
  ];
  const scale = volTargetScale([0.1, 0.1], M, undefined, 0.05);
  const expected = 0.05 / (0.1 / Math.SQRT2);
  assert.ok(Math.abs(scale - expected) < 1e-9, "scale=target/σ_p");
});

test("volTargetScale: 放大目标 > 当前 → scale>1；目标≤0 → 0", () => {
  const M = [
    [1, 0],
    [0, 1],
  ];
  assert.ok(volTargetScale([0.1, 0.1], M, undefined, 0.2) > 1, "放大 → scale>1");
  assert.equal(volTargetScale([0.1, 0.1], M, undefined, 0), 0, "目标=0 → 0");
  assert.equal(volTargetScale([0.1, 0.1], M, undefined, -0.1), 0, "目标<0 → 0");
});

test("volTargetScale: 当前 σ_p=0 → 0（无法放大）", () => {
  const M = [
    [1, 0],
    [0, 1],
  ];
  assert.equal(volTargetScale([0, 0], M, undefined, 0.1), 0, "σ_p=0 → 0");
});

// ---------- inverseVolWeights ----------

test("inverseVolWeights: 空 → []；等波动 → 等权", () => {
  assert.deepEqual(inverseVolWeights([]), [], "空 → []");
  assert.ok(Math.abs(inverseVolWeights([0.1, 0.1])[0] - 0.5) < 1e-12, "等波动 → 等权");
});

test("inverseVolWeights: 逆波动归一化，权重和=1", () => {
  // vols [0.1, 0.2] → w ∝ [10, 5] → [2/3, 1/3]
  const w = inverseVolWeights([0.1, 0.2]);
  assert.ok(Math.abs(w[0] - 2 / 3) < 1e-12 && Math.abs(w[1] - 1 / 3) < 1e-12, "逆波动权重");
  assert.ok(Math.abs(w[0] + w[1] - 1) < 1e-12, "权重和=1");
});

test("inverseVolWeights: 全 ≤0/非有限 → 退回等权；波动越高权重越低", () => {
  assert.ok(Math.abs(inverseVolWeights([0, -1])[0] - 0.5) < 1e-12, "全非正 → 等权");
  assert.ok(Math.abs(inverseVolWeights([NaN, Infinity])[0] - 0.5) < 1e-12, "非有限 → 等权");
  const w = inverseVolWeights([0.01, 0.5]); // 低波动者权重更高
  assert.ok(w[0] > w[1], "波动越低权重越高");
});

// ---------- riskContribution ----------

test("riskContribution: 2 不相关等波动等权 → 各占 σ_p/2，和=σ_p", () => {
  const vols = [0.1, 0.1];
  const M = [[1, 0], [0, 1]];
  const rc = riskContribution(vols, M); // 等权
  const pv = portfolioVolatility(vols, M); // √0.005
  assert.ok(rc.length === 2, "长度 2");
  assert.ok(Math.abs(rc[0] - rc[1]) < 1e-12, "对称 → 相等");
  assert.ok(Math.abs(rc[0] - pv / 2) < 1e-12, "各占 σ_p/2");
  const sum = rc[0] + rc[1];
  assert.ok(Math.abs(sum - pv) < 1e-12, "Σ RC_i = σ_p");
});

test("riskContribution: 相关资产下不变式 Σ RC_i = σ_p 仍成立", () => {
  const vols = [0.1, 0.15, 0.2];
  const M = [
    [1, 0.3, 0.1],
    [0.3, 1, -0.2],
    [0.1, -0.2, 1],
  ];
  const rc = riskContribution(vols, M, [1, 1, 1]);
  const pv = portfolioVolatility(vols, M, [1, 1, 1]);
  const sum = rc.reduce((a, b) => a + b, 0);
  assert.ok(rc.length === 3, "长度 3");
  assert.ok(Math.abs(sum - pv) < 1e-9, "Σ RC_i = σ_p");
  // 高波动资产风险贡献更大（正相关下 RC 非负）
  for (const x of rc) assert.ok(x >= -1e-12, "RC ≥ 0");
});

test("riskContribution: 维度不匹配 → []；σ_p≤0 → 全 0", () => {
  assert.deepEqual(riskContribution([0.1, 0.1], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]), [], "维度不匹配 → []");
  const M = [[1, 0], [0, 1]];
  assert.deepEqual(riskContribution([0, 0], M), [0, 0], "全 0 波动 → 全 0 贡献");
});

// ---------- riskParityWeights ----------

test("riskParityWeights: 不相关解析解 = 逆波动权重；权重和=1", () => {
  const M = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const w = riskParityWeights([0.1, 0.2, 0.3], M);
  const iv = inverseVolWeights([0.1, 0.2, 0.3]);
  w.forEach((x, i) => assert.ok(Math.abs(x - iv[i]) < 1e-6, `资产${i} 等于逆波动权重`));
  assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9, "权重和=1");
});

test("riskParityWeights: N=2 相关资产 w_i ∝ σ_j（与 ρ 无关）", () => {
  // 解析：w = [σ2, σ1]/(σ1+σ2) = [0.2,0.1]/0.3 = [2/3, 1/3]，交叉项与 ρ 相消
  const M = [[1, 0.5], [0.5, 1]];
  const w = riskParityWeights([0.1, 0.2], M);
  assert.ok(Math.abs(w[0] - 2 / 3) < 1e-6, "w0 = σ2/(σ1+σ2)");
  assert.ok(Math.abs(w[1] - 1 / 3) < 1e-6, "w1 = σ1/(σ1+σ2)");
});

test("riskParityWeights: 相关 3 资产收敛到各 RC 近似相等", () => {
  const vols = [0.1, 0.2, 0.15];
  const M = [
    [1, 0.3, 0.1],
    [0.3, 1, 0.5],
    [0.1, 0.5, 1],
  ];
  const w = riskParityWeights(vols, M);
  assert.ok(w.every((x) => x > 0 && Number.isFinite(x)), "全为正有限");
  assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9, "权重和=1");
  // 收敛后各资产风险贡献 RC_i 相对离散 < 1e-6
  const rc = riskContribution(vols, M, w);
  const mean = rc.reduce((a, b) => a + b, 0) / rc.length;
  const spread = Math.max(...rc.map((x) => Math.abs(x - mean))) / mean;
  assert.ok(spread < 1e-6, `RC 相对离散 ${spread} < 1e-6`);
});

test("riskParityWeights: 边界——空→[]、单资产→[1]、全 0 波动→等权、维度不匹配→[]", () => {
  assert.deepEqual(riskParityWeights([], [[1]]), [], "空 → []");
  assert.deepEqual(riskParityWeights([0.1], [[1]]), [1], "单资产 → [1]");
  assert.deepEqual(riskParityWeights([0, 0], [[1, 0], [0, 1]]), [0.5, 0.5], "全 0 波动 → 等权");
  assert.deepEqual(riskParityWeights([0.1, 0.2], [[1, 0, 0], [0, 1, 0], [0, 0, 1]]), [], "维度不匹配 → []");
});

// ---------- maxSharpeWeights ----------

test("maxSharpeWeights: 不变式——和=1、全 ≥0、长度 N、≥ 逆波动夏普", () => {
  const A = [0.02, 0.01, 0.03, 0.015, 0.02];
  const B = [0.005, 0.002, -0.01, 0.001, -0.008];
  const vols = [0.01, 0.05];
  const corr = [[1, 0.1], [0.1, 1]];
  const w = maxSharpeWeights([A, B], vols, corr, { grid: 40 });
  assert.equal(w.length, 2, "长度=资产数");
  assert.ok(w.every((x) => x >= 0), "全 ≥0（long-only）");
  assert.ok(Math.abs(w[0] + w[1] - 1) < 1e-9, "和=1");
  const sOpt = portfolioSharpe([A, B], vols, corr, w);
  const sInv = portfolioSharpe([A, B], vols, corr, inverseVolWeights(vols));
  assert.ok(sOpt >= sInv - 1e-9, "最优夏普 ≥ 逆波动夏普");
  // 资产 A 高收益低波动占优 → 重仓 A
  assert.ok(w[0] > 0.5, "占优资产权重 > 0.5");
});

test("maxSharpeWeights: 完全相同资产 → 等权（任一等权即最优）", () => {
  const R = [0.01, 0.02, 0.03];
  const vols = [0.02, 0.02, 0.02];
  const corr = [[1, 0.5, 0.5], [0.5, 1, 0.5], [0.5, 0.5, 1]];
  const w = maxSharpeWeights([R, R, R], vols, corr);
  assert.equal(w.length, 3);
  for (const x of w) assert.ok(Math.abs(x - 1 / 3) < 1e-6, "等权 1/3");
});

test("maxSharpeWeights: 边界——空→[]、单资产→[1]、维度不匹配→[]", () => {
  assert.deepEqual(maxSharpeWeights([], [], []), [], "空 → []");
  assert.deepEqual(maxSharpeWeights([[0.01, 0.02]], [0.02], [[1]]), [1], "单资产 → [1]");
  assert.deepEqual(maxSharpeWeights([[0.01, 0.02], [0.01, 0.02]], [0.01], [[1, 0], [0, 1]]), [], "维度不匹配 → []");
});
