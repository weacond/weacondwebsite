// 相关性 / 分散化分析测试（lib/correlation.js）。
// 用统计不变式断言：自相关=1、反相关=−1、对称、DR≥1、完全相关 DR=1。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pearsonCorrelation,
  correlationMatrix,
  diversificationRatio,
} from "../lib/correlation.js";

// ---------- pearsonCorrelation ----------

test("pearsonCorrelation: 完全正相关 → 1", () => {
  assert.ok(Math.abs(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8]) - 1) < 1e-9, "线性正比 → 1");
});

test("pearsonCorrelation: 完全负相关 → -1", () => {
  assert.ok(Math.abs(pearsonCorrelation([1, 2, 3, 4], [8, 6, 4, 2]) - -1) < 1e-9, "线性反比 → -1");
});

test("pearsonCorrelation: 常数序列 → 0（标准差为 0）", () => {
  assert.equal(pearsonCorrelation([5, 5, 5, 5], [1, 2, 3, 4]), 0, "常数 x → 0");
  assert.equal(pearsonCorrelation([1, 2, 3], [0, 0, 0]), 0, "常数 y → 0");
});

test("pearsonCorrelation: 长度 <2 → 0", () => {
  assert.equal(pearsonCorrelation([1], [2]), 0, "单点 → 0");
  assert.equal(pearsonCorrelation([], []), 0, "空 → 0");
});

test("pearsonCorrelation: 不等长取较短；NaN 自动清洗", () => {
  const x = [1, 2, 3, 4, 5];
  const y = [2, 4, 6, 8, 10]; // 与 x 完全正比
  assert.ok(Math.abs(pearsonCorrelation(x, y.slice(0, 3)) - 1) < 1e-9, "取较短仍正比 → 1");
  assert.ok(pearsonCorrelation([1, NaN, 3, 4], [2, NaN, 6, 8]) > 0.99, "清洗 NaN 后正相关");
});

// ---------- correlationMatrix ----------

test("correlationMatrix: 对称、对角线=1", () => {
  const s1 = [1, 2, 3, 4];
  const s2 = [4, 3, 2, 1];
  const s3 = [1, 1, 1, 1]; // 常数
  const M = correlationMatrix([s1, s2, s3]);
  assert.equal(M.length, 3);
  assert.equal(M[0].length, 3);
  for (let i = 0; i < 3; i++) assert.equal(M[i][i], 1, `对角线 [${i}] = 1`);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) assert.equal(M[i][j], M[j][i], `对称 [${i}][${j}]`);
});

test("correlationMatrix: 两完全正相关序列 → 全 1；常数序列行 → 0", () => {
  const s1 = [1, 2, 3, 4];
  const s2 = [2, 4, 6, 8]; // = 2*s1，完全正相关
  const s3 = [9, 9, 9, 9]; // 常数 → 与其余相关 0
  const M = correlationMatrix([s1, s2, s3]);
  assert.equal(M[0][1], 1, "s1-s2 完全正相关");
  assert.equal(M[0][2], 0, "s1-常数 → 0");
  assert.equal(M[1][2], 0, "s2-常数 → 0");
});

test("correlationMatrix: 空输入 → []", () => {
  assert.deepEqual(correlationMatrix([]), []);
  assert.deepEqual(correlationMatrix(null), []);
});

// ---------- diversificationRatio ----------

test("diversificationRatio: 完全正相关 → DR=1（无分散化收益）", () => {
  const M = [[1, 1], [1, 1]];
  const DR = diversificationRatio(M, [0.02, 0.03], [0.5, 0.5]);
  assert.ok(Math.abs(DR - 1) < 1e-9, `DR 应≈1（得到 ${DR}）`);
});

test("diversificationRatio: 无相关（ρ=0）→ DR>1（有分散化收益）", () => {
  const M = [[1, 0], [0, 1]];
  const DR = diversificationRatio(M, [0.02, 0.03], [0.5, 0.5]);
  assert.ok(DR > 1, `无相关应有分散化收益，DR=${DR}`);
});

test("diversificationRatio: 缺省等权 + 维度不匹配 → 0", () => {
  assert.ok(diversificationRatio([[1, 0], [0, 1]], [0.02, 0.03]) >= 1, "缺省等权 DR≥1");
  assert.equal(diversificationRatio([[1, 0], [0, 1]], [0.02]), 0, "维度不匹配 → 0");
  assert.equal(diversificationRatio([], []), 0, "空矩阵 → 0");
});
