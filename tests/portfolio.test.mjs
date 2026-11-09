import { test } from "node:test";
import assert from "node:assert/strict";
import {
  portfolioReturn,
  portfolioVolatility,
  portfolioSharpe,
  volTargetScale,
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
