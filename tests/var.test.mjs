// tests/var.test.mjs — lib/var.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stdNormalCdf,
  stdNormalPdf,
  stdNormalQuantile,
  parametricVar,
  historicalVar,
  varBand,
  varSummary,
  VAR_PRESETS,
  num,
} from "../lib/var.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("stdNormalQuantile：常见分位数", () => {
  approx(stdNormalQuantile(0.5), 0, 1e-6);
  approx(stdNormalQuantile(0.95), 1.6449, 1e-3);
  approx(stdNormalQuantile(0.99), 2.3263, 1e-3);
  approx(stdNormalQuantile(0.975), 1.96, 1e-3);
  assert.equal(stdNormalQuantile(0), -Infinity);
  assert.equal(stdNormalQuantile(1), Infinity);
});

test("stdNormalPdf(0) = 1/√(2π)", () => {
  approx(stdNormalPdf(0), 1 / Math.sqrt(2 * Math.PI), 1e-12);
  assert.ok(stdNormalPdf(0) > stdNormalPdf(2)); // 钟形下降
});

test("stdNormalCdf：0.5→0.5，对称", () => {
  approx(stdNormalCdf(0), 0.5, 1e-6);
  approx(stdNormalCdf(1.645), 0.95, 1e-3);
  for (const x of [0.5, 1.0, 1.96, 3.0]) {
    approx(stdNormalCdf(-x) + stdNormalCdf(x), 1, 1e-9, `symmetric @ ${x}`);
  }
});

test("parametricVar：95% 日 VaR（μ=0,σ=20%）≈ 2.07%", () => {
  const r = parametricVar({ mu: 0, sigma: 0.2, horizonDays: 1, confidence: 0.95 });
  assert.ok(r.valid);
  approx(r.z, 1.6449, 1e-3);
  approx(r.varPct, stdNormalQuantile(0.95) * (0.2 / Math.sqrt(252)), 1e-9); // z·σ_h
  assert.ok(r.esPct > r.varPct, "ES 恒 ≥ VaR");
});

test("parametricVar：99% 周 VaR 缩放持有期", () => {
  const r = parametricVar({ mu: 0, sigma: 0.2, horizonDays: 5, confidence: 0.99 });
  assert.ok(r.valid);
  approx(r.sigmaH, 0.2 * Math.sqrt(5 / 252), 1e-9);
  approx(r.z, 2.3263, 1e-3);
});

test("parametricVar：含均值漂移降低 VaR", () => {
  const withDrift = parametricVar({ mu: 0.1, sigma: 0.2, horizonDays: 252, confidence: 0.95 });
  const noDrift = parametricVar({ mu: 0, sigma: 0.2, horizonDays: 252, confidence: 0.95 });
  assert.ok(withDrift.varPct < noDrift.varPct, "正 μ 降低 VaR 损失");
});

test("parametricVar：非法输入 → null", () => {
  assert.equal(parametricVar({ mu: 0, sigma: 0, horizonDays: 1, confidence: 0.95 }), null); // σ=0
  assert.equal(parametricVar({ mu: 0, sigma: 0.2, horizonDays: 1, confidence: 1.5 }), null); // c≥1
  assert.equal(parametricVar({ mu: 0, sigma: 0.2, horizonDays: 0, confidence: 0.95 }), null); // 持有期=0
});

test("parametricVar：c=0.5 合法（z=0 → VaR=−μ_h）", () => {
  const r = parametricVar({ mu: 0, sigma: 0.2, horizonDays: 1, confidence: 0.5 });
  assert.ok(r.valid);
  approx(r.z, 0, 1e-6);
  approx(r.varPct, 0, 1e-9); // μ=0 → VaR=0
});

test("historicalVar：升序分位 + 尾部均值", () => {
  const returns = [-0.05, -0.04, -0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06];
  const r = historicalVar(returns, 0.95);
  assert.ok(r.valid);
  assert.equal(r.count, 12);
  approx(r.varPct, 0.05, 1e-9); // 5th pct of 12 → 第 1 小 = -0.05 → 损失 0.05
  assert.ok(r.esPct >= r.varPct, "ES ≥ VaR");
});

test("historicalVar：接受字符串，点数<10 → 无效", () => {
  assert.equal(historicalVar("0.01,0.02,0.03", 0.95).valid, false);
  assert.equal(historicalVar([-1, -2, -3, 0.95]).valid, false);
});

test("historicalVar：c 越界 → 无效", () => {
  assert.equal(historicalVar([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1.5).valid, false);
});

test("varBand：按损失占比分级", () => {
  assert.equal(varBand(0.005), "low");
  assert.equal(varBand(0.02), "moderate");
  assert.equal(varBand(0.05), "high");
  assert.equal(varBand(0.1), "extreme");
});

test("varSummary：μ=0 时损失/ES 与分级（便于手算）", () => {
  const r = varSummary({ positionValue: 100000, mu: 0, sigma: 0.2, horizonDays: 1, confidence: 0.95 });
  assert.ok(r.valid);
  approx(r.varPct, stdNormalQuantile(0.95) * (0.2 / Math.sqrt(252)), 1e-9); // VaR = z·σ_h
  approx(r.varLoss, 100000 * r.varPct, 1e-6);
  approx(r.esLoss, 100000 * r.esPct, 1e-6);
  assert.ok(r.esPct > r.varPct, "ES > VaR");
  assert.equal(r.historical, null); // 无 series
});

test("varSummary：分级边界 low/moderate/high/extreme", () => {
  assert.equal(varSummary({ positionValue: 100, mu: 0, sigma: 0.01, horizonDays: 1, confidence: 0.95 }).band, "low");
  assert.equal(varSummary({ positionValue: 100, mu: 0, sigma: 0.2, horizonDays: 1, confidence: 0.95 }).band, "moderate");
  assert.equal(varSummary({ positionValue: 100, mu: 0, sigma: 0.3, horizonDays: 1, confidence: 0.99 }).band, "high");
  assert.equal(varSummary({ positionValue: 100, mu: 0, sigma: 1.0, horizonDays: 1, confidence: 0.99 }).band, "extreme");
});

test("varSummary：带 series 产出历史法", () => {
  const r = varSummary({ ...VAR_PRESETS.equityDaily, series: "0.01,-0.02,0.03,-0.04,0.05,-0.01,0.02,-0.03,0.04,-0.05,0.06,-0.02" });
  assert.ok(r.valid);
  assert.ok(r.historical && r.historical.valid);
  assert.equal(r.historical.count, 12);
});

test("varSummary：非法输入 → 无效", () => {
  assert.equal(varSummary({ positionValue: 0, sigma: 0.2, horizonDays: 1, confidence: 0.95 }).valid, false);
  assert.equal(varSummary({ positionValue: 100, sigma: 0, horizonDays: 1, confidence: 0.95 }).valid, false);
  assert.equal(varSummary({ positionValue: 100, mu: 0.1, sigma: 0.2, horizonDays: 0, confidence: 0.95 }).valid, false);
});

test("ES ≥ VaR 不变式（多情景）", () => {
  for (const c of [0.9, 0.95, 0.99]) {
    const r = parametricVar({ mu: 0.1, sigma: 0.3, horizonDays: 10, confidence: c });
    assert.ok(r.esPct >= r.varPct, `ES≥VaR @ c=${c}`);
  }
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(VAR_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = VAR_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.positionValue) && p.positionValue > 0);
    assert.ok(varSummary(p).valid);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
