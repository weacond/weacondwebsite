// 相关性分析测试（lib/macro.js）——用统计不变式断言，非背常数。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pearsonCorrelation,
  correlationMatrix,
  classifyCorrelation,
  SAMPLE_MACRO_SERIES,
} from "../lib/macro.js";

// ---------- pearsonCorrelation ----------

test("pearsonCorrelation: 自身相关 = 1", () => {
  const x = [1, 3, 2, 5, 4, 6, 8, 7];
  assert.ok(Math.abs(pearsonCorrelation(x, x) - 1) < 1e-9);
});

test("pearsonCorrelation: 完美负相关 = -1", () => {
  const x = [1, 2, 3, 4, 5, 6];
  assert.ok(Math.abs(pearsonCorrelation(x, x.map((v) => -v)) - (-1)) < 1e-9);
});

test("pearsonCorrelation: 线性变换不变（a·x+b 与 x 相关仍为 ±1）", () => {
  const x = [1, 3, 2, 5, 4, 7, 2, 8];
  assert.ok(Math.abs(pearsonCorrelation(x, x.map((v) => 2 * v + 100)) - 1) < 1e-9);
  assert.ok(Math.abs(pearsonCorrelation(x, x.map((v) => -3 * v + 5)) - (-1)) < 1e-9);
});

test("pearsonCorrelation: 正/负相关方向正确", () => {
  const up = [1, 2, 3, 4, 5];
  assert.ok(pearsonCorrelation(up, [1, 2, 3, 4, 5]) > 0.9);
  assert.ok(pearsonCorrelation(up, [5, 4, 3, 2, 1]) < -0.9);
});

test("pearsonCorrelation: 结果 ∈ [-1,1]", () => {
  const r = pearsonCorrelation([1, 2, 3, 4], [4, 2, 1, 3]);
  assert.ok(r >= -1 && r <= 1, `got ${r}`);
});

test("pearsonCorrelation: 少于 2 点 → NaN", () => {
  assert.ok(Number.isNaN(pearsonCorrelation([5], [5])));
  assert.ok(Number.isNaN(pearsonCorrelation([], [])));
});

test("pearsonCorrelation: 常数序列（方差 0）→ NaN", () => {
  assert.ok(Number.isNaN(pearsonCorrelation([3, 3, 3, 3], [1, 2, 3, 4])));
});

test("pearsonCorrelation: 清洗 NaN/非数", () => {
  const x = [1, 3, NaN, 5, "x"];
  const y = [2, 6, NaN, 10, "y"]; // 清洗后 [1,3,5] vs [2,6,10] 完美正相关
  assert.ok(Math.abs(pearsonCorrelation(x, y) - 1) < 1e-9);
});

// ---------- correlationMatrix ----------

test("correlationMatrix: 对角线恒为 1，矩阵对称", () => {
  const { names, matrix } = correlationMatrix(SAMPLE_MACRO_SERIES);
  const n = names.length;
  for (let i = 0; i < n; i++) {
    assert.equal(matrix[i][i], 1, `对角线 [${i}] 应为 1`);
    for (let j = 0; j < n; j++) {
      assert.ok(Math.abs(matrix[i][j] - matrix[j][i]) < 1e-9, `矩阵在 [${i}][${j}] 不对称`);
    }
  }
});

test("correlationMatrix: 利率与信用利差应强正相关（演示序列）", () => {
  const { names, matrix } = correlationMatrix(SAMPLE_MACRO_SERIES);
  const i = names.indexOf("利率");
  const j = names.indexOf("信用利差");
  assert.ok(matrix[i][j] > 0.9, `利率↔信用利差 r=${matrix[i][j]} 应 >0.9`);
});

test("correlationMatrix: VIX 与股市应负相关（演示序列）", () => {
  const { names, matrix } = correlationMatrix(SAMPLE_MACRO_SERIES);
  const i = names.indexOf("VIX");
  const j = names.indexOf("股市");
  assert.ok(matrix[i][j] < -0.5, `VIX↔股市 r=${matrix[i][j]} 应 <−0.5`);
});

test("correlationMatrix: strongest 指向 |r| 最大的非对角对", () => {
  const { matrix, strongest, names } = correlationMatrix(SAMPLE_MACRO_SERIES);
  let best = { i: 0, j: 1, r: NaN };
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) {
      const r = matrix[i][j];
      if (Number.isFinite(r) && Math.abs(r) > Math.abs(best.r)) best = { i, j, r };
    }
  assert.equal(strongest.i, best.i);
  assert.equal(strongest.j, best.j);
});

test("correlationMatrix: 空输入 → 空矩阵", () => {
  const { names, matrix, strongest } = correlationMatrix({});
  assert.equal(names.length, 0);
  assert.equal(matrix.length, 0);
});

// ---------- classifyCorrelation ----------

test("classifyCorrelation: 阈值 强/中/弱 与方向", () => {
  assert.equal(classifyCorrelation(0.9).magnitude, "strong");
  assert.equal(classifyCorrelation(0.5).magnitude, "moderate");
  assert.equal(classifyCorrelation(0.2).magnitude, "weak");
  assert.equal(classifyCorrelation(-0.8).direction, "negative");
  assert.equal(classifyCorrelation(0.8).direction, "positive");
  assert.equal(classifyCorrelation(0).direction, "none");
  assert.equal(classifyCorrelation(NaN).magnitude, "n/a");
});
