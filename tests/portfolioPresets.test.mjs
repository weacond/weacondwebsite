// 组合优化测试 — lib/portfolioPresets.js
// 测试哲学：用「手算可验证的公式关系 + 不变式」断言，而非背下求解器输出的常数。
//   核心不变式：
//     ① 任何方案的 weightsRaw 之和 = 1（归一化）；
//     ② 风险平价的各资产风险贡献 ≈ 1/N（等风险）；
//     ③ 最大夏普方案在 5 方案中夏普最高；最小方差方案波动率最低；
//     ④ 单资产 → 无有效前沿；空篮子 → 抛错；
//     ⑤ normalizeCorr 对角线=1、对称、越界截断、缺失用转置补。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRESETS,
  normalizeCorr,
  buildPortfolioPlan,
  getPreset,
  planForPreset,
} from "../lib/portfolioPresets.js";

const close = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;
const sum1 = (w) => w.reduce((s, x) => s + x, 0);

test("buildPortfolioPlan: 空篮子抛错", () => {
  assert.throws(() => buildPortfolioPlan({ assets: [] }), /至少需要 1 个资产/);
  assert.throws(() => buildPortfolioPlan({}), /至少需要 1 个资产/);
});

test("PRESETS: 4 个篮子，相关矩阵对称且对角线=1", () => {
  assert.equal(PRESETS.length, 4);
  for (const p of PRESETS) {
    assert.ok(p.assets.length >= 1, p.id + " 至少 1 资产");
    assert.equal(p.corr.length, p.assets.length, p.id + " 矩阵维度=资产数");
    for (let i = 0; i < p.corr.length; i++) {
      assert.equal(p.corr[i][i], 1, p.id + ` 对角线 [${i}][${i}]=1`);
      for (let j = 0; j < p.corr.length; j++) {
        assert.ok(close(p.corr[i][j], p.corr[j][i]), p.id + ` 对称 [${i}][${j}]==[${j}][${i}]`);
      }
    }
  }
});

test("buildPortfolioPlan(2资产): 每方案权重和=1、波动率≥0、最优为最大夏普", () => {
  const p = planForPreset("stock_bond", { grid: 30, frontierPoints: 11 });
  assert.equal(p.nAssets, 2);
  assert.equal(p.plans.length, 5);
  for (const pl of p.plans) {
    assert.ok(close(sum1(pl.weightsRaw), 1, 1e-6), pl.key + " 权重和=1");
    assert.ok(pl.vol >= 0, pl.key + " 波动率≥0");
    assert.ok(pl.dr >= 1 - 1e-9, pl.key + " 分散化比率 DR≥1");
  }
  // 最大夏普方案夏普最高；最小方差方案波动率最低
  const maxS = p.plans.find((x) => x.key === "maxSharpe");
  const minV = p.plans.find((x) => x.key === "minVariance");
  assert.ok(maxS.sharpe >= Math.max(...p.plans.map((x) => x.sharpe)) - 1e-6, "maxSharpe 夏普最高");
  assert.ok(minV.vol <= Math.min(...p.plans.map((x) => x.vol)) + 1e-6, "minVariance 波动率最低");
  assert.equal(p.best.key, "maxSharpe", "夏普最优方案 = maxSharpe");
});

test("风险平价: 各资产风险贡献 ≈ 1/N（等风险不变式）", () => {
  const p = planForPreset("global_macro", { grid: 30 });
  const n = p.nAssets;
  for (const c of p.riskContribution) {
    assert.ok(close(c / 100, 1 / n, 0.02), `风险贡献 ≈ ${100 / n}%（实得 ${c}%）`);
  }
  // 风险贡献总和 ≈ 100%
  assert.ok(close(p.riskContribution.reduce((a, b) => a + b, 0), 100, 0.5));
});

test("单资产: 无有效前沿、5 方案、最优=等权、DR=1", () => {
  const p = buildPortfolioPlan({ assets: [{ name: "X", mu: 0.05, vol: 0.1 }] });
  assert.equal(p.nAssets, 1);
  assert.equal(p.plans.length, 5);
  assert.equal(p.frontier, null, "单资产无有效前沿");
  assert.equal(p.best.key, "equal", "单资产最优=等权（唯一非平凡方案）");
  assert.ok(close(p.plans[0].dr, 1, 1e-6), "单资产 DR=1");
});

test("normalizeCorr: 对角线=1、对称、越界截断到[-1,1]、缺失用转置补", () => {
  // 缺失：[0][1] 为 undefined → 用 [1][0]=0.5 补；对角线强制 1
  const M = normalizeCorr([[1, undefined], [0.5, 1]], 2);
  assert.equal(M[0][0], 1);
  assert.equal(M[1][1], 1);
  assert.equal(M[0][1], 0.5, "缺失 [0][1] 用 [1][0]=0.5 补");
  assert.equal(M[1][0], 0.5, "对称回填");
  // 越界：传 2 / -3 → 截断到 1 / -1
  const M2 = normalizeCorr([[1, 2], [-3, 1]], 2);
  assert.equal(M2[0][1], 1, "上界截断到 1");
  assert.equal(M2[1][0], 1, "对称");
  const M3 = normalizeCorr([[1, -3], [1, 1]], 2);
  assert.equal(M3[0][1], -1, "下界截断到 -1");
  // n≤0 → 空
  assert.deepEqual(normalizeCorr([[1, 0], [0, 1]], 0), []);
});

test("getPreset / planForPreset: 未知 id 退回首个，已知 id 带元信息", () => {
  assert.equal(getPreset().id, PRESETS[0].id, "无 id → 首个预设");
  assert.equal(getPreset("不存在的").id, PRESETS[0].id, "未知 id → 首个预设");
  const p = planForPreset("all_weather");
  assert.equal(p.presetId, "all_weather");
  assert.equal(p.nAssets, 4);
  assert.ok(typeof p.presetName === "string" && p.presetName.length > 0);
});

test("global_macro: 分散化比率 > 等权（跨类分散有收益）", () => {
  const p = planForPreset("global_macro", { grid: 30 });
  const eq = p.plans.find((x) => x.key === "equal");
  const iv = p.plans.find((x) => x.key === "inverseVol");
  // 逆波动加权通常比等权更分散（DR 更大或相当）
  assert.ok(iv.dr >= eq.dr - 1e-6, "逆波动 DR ≥ 等权 DR");
});
