// tests/monteCarlo.test.mjs — lib/monteCarlo.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  syntheticReturns,
  fracAbove,
  fracBelow,
  runSimulation,
  getMCPreset,
  MC_PRESETS,
} from "../lib/monteCarlo.js";

test("syntheticReturns: 长度 = n，大样本均值≈0、标准差≈σ", () => {
  const r = syntheticReturns(0, 0.1, 20000, 3);
  assert.equal(r.length, 20000);
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  assert.ok(Math.abs(mean) < 0.01, `mean ${mean} ~ 0`);
  const variance = r.reduce((a, b) => a + b * b, 0) / r.length;
  assert.ok(Math.abs(Math.sqrt(variance) - 0.1) < 0.01, "std ~ 0.1");
});

test("fracAbove / fracBelow: 占比正确", () => {
  const arr = [0.4, 0.6, 0.8, 1.2];
  assert.equal(fracAbove(arr, 0.5), 0.75); // 0.6,0.8,1.2 > 0.5 → 3/4
  assert.ok(Math.abs(fracBelow(arr, 0.5) - 0.25) < 1e-9); // 0.4 < 0.5 → 1/4
  assert.equal(fracAbove([], 0), 0);
});

test("runSimulation: 终端财富分位单调 p10<p50<p90", () => {
  const r = runSimulation("equity", { nPaths: 3000, seed: 1, horizonYears: 5 });
  assert.ok(r.terminal.p10 < r.terminal.p50);
  assert.ok(r.terminal.p50 < r.terminal.p90);
  assert.ok(r.terminal.p10 < r.terminal.p90);
});

test("runSimulation: 概率守恒 probGain+probLoss ≈ 1（扣除持平）", () => {
  const r = runSimulation("balanced", { nPaths: 3000, seed: 2, horizonYears: 5 });
  assert.ok(Math.abs(r.probGain + r.probLoss - 1) < 0.01);
  assert.ok(r.probHalved <= r.probLoss); // 腰斩是亏损的子集
  assert.ok(r.probRuin <= r.probHalved); // 归零是腰斩的子集
});

test("高波动资产比低波动资产更可能腰斩（crypto vs bonds）", () => {
  const c = runSimulation("crypto", { nPaths: 4000, seed: 5, horizonYears: 5 });
  const b = runSimulation("bonds", { nPaths: 4000, seed: 5, horizonYears: 5 });
  assert.ok(c.probHalved > b.probHalved);
});

test("回撤分位单调递增；扇形带 p5≤p50≤p95", () => {
  const r = runSimulation("equity", { nPaths: 3000, seed: 1, horizonYears: 3, paths: 10 });
  const vals = r.ddDist.map((d) => d.value);
  for (let i = 1; i < vals.length; i++) assert.ok(vals[i] >= vals[i - 1] - 1e-9);
  const t = 200;
  assert.ok(r.band.p5[t] <= r.band.p50[t] + 1e-9);
  assert.ok(r.band.p50[t] <= r.band.p95[t] + 1e-9);
  assert.equal(r.samplePaths.length, 10);
});

test("确定性：相同 seed 结果一致；未知预设抛错", () => {
  const a = runSimulation("equity", { nPaths: 1000, seed: 42 });
  const b = runSimulation("equity", { nPaths: 1000, seed: 42 });
  assert.equal(a.terminal.p50, b.terminal.p50);
  assert.throws(() => getMCPreset("nope"), /Unknown/);
  assert.throws(() => runSimulation("nope"), /Unknown/);
});

test("预设波动率单调 bonds<balanced<equity<crypto", () => {
  assert.ok(MC_PRESETS.bonds.sigma < MC_PRESETS.balanced.sigma);
  assert.ok(MC_PRESETS.balanced.sigma < MC_PRESETS.equity.sigma);
  assert.ok(MC_PRESETS.equity.sigma < MC_PRESETS.crypto.sigma);
});
