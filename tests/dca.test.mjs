// tests/dca.test.mjs — lib/dca.js 定投 vs 一次性测试
import test from "node:test";
import assert from "node:assert/strict";
import {
  num,
  annuityFv,
  lumpFv,
  dcaVsLump,
  dcaMonteCarlo,
  dcaBand,
  DCA_PRESETS,
} from "../lib/dca.js";

test("num：归一化", () => {
  assert.equal(num("0.1", 0), 0.1);
  assert.equal(num("x", 5), 5);
});

test("annuityFv：月度普通年金终值（期末贡献）", () => {
  // 100/月 @12% 共 12 月：FV = 100×((1.01¹²−1)/0.01) ≈ 1268.25
  assert.ok(Math.abs(annuityFv(100, 0.12, 1) - 1268.25) < 1e-1);
  // 零利率退化为 月×期数
  assert.ok(Math.abs(annuityFv(100, 0, 1) - 1200) < 1e-9);
  assert.equal(annuityFv(100, 0.1, 0), 0);
});

test("lumpFv：一次性终值", () => {
  assert.ok(Math.abs(lumpFv(100, 0.1, 1) - 110) < 1e-9);
  assert.ok(Math.abs(lumpFv(100, 0, 5) - 100) < 1e-9);
});

test("dcaVsLump：正收益 → 一次性胜出（更早投入）", () => {
  const r = dcaVsLump({ monthly: 100, annualRate: 0.1, years: 1 });
  assert.equal(r.valid, true);
  assert.equal(r.months, 12);
  assert.ok(Math.abs(r.totalDca - 1200) < 1e-9);
  assert.ok(r.fvLump > r.fvDca);
  assert.ok(r.diff > 0);
  assert.ok(r.lumpEdge > 0);
  assert.equal(r.winner, "lump");
  assert.equal(dcaBand(r.winner), "lumpFavored");
});

test("dcaVsLump：负收益 → 定投胜出（晚投入避开损失）", () => {
  const r = dcaVsLump({ monthly: 100, annualRate: -0.05, years: 1 });
  assert.ok(r.fvDca > r.fvLump);
  assert.ok(r.diff < 0);
  assert.equal(r.winner, "dca");
  assert.equal(dcaBand(r.winner), "dcaFavored");
});

test("dcaVsLump：零收益 → 平手", () => {
  const r = dcaVsLump({ monthly: 100, annualRate: 0, years: 1 });
  assert.equal(r.winner, "tie");
  assert.equal(dcaBand(r.winner), "balanced");
});

test("dcaVsLump：默认 lump = 同等总投入", () => {
  const r = dcaVsLump({ monthly: 500, annualRate: 0.08, years: 5 });
  assert.ok(Math.abs(r.lump - r.totalDca) < 1e-6);
  assert.equal(r.valid, true);
});

test("dcaVsLump：无效（monthly≤0 或 years≤0）", () => {
  assert.equal(dcaVsLump({ monthly: 0, annualRate: 0.08, years: 5 }).valid, false);
  assert.equal(dcaVsLump({ monthly: 100, annualRate: 0.08, years: 0 }).valid, false);
});

test("dcaMonteCarlo：确定性（同种子可复现）+ 正漂移一次性胜率更高", () => {
  const a = dcaMonteCarlo({ monthly: 1000, annualRate: 0.08, annualVol: 0.15, years: 10, seed: 12345 });
  const b = dcaMonteCarlo({ monthly: 1000, annualRate: 0.08, annualVol: 0.15, years: 10, seed: 12345 });
  assert.equal(a.lumpWinRate, b.lumpWinRate); // 可复现
  assert.ok(a.lumpWinRate >= 0 && a.lumpWinRate <= 1);
  assert.ok(a.lumpWinRate + a.dcaWinRate <= 1 + 1e-9);
  assert.ok(a.lumpWinRate > 0.5, "正漂移下一次性应多数胜出");
  assert.ok(a.expectedLumpFv > a.expectedDcaFv);
});

test("dcaMonteCarlo：不同种子结果可不同", () => {
  const a = dcaMonteCarlo({ monthly: 1000, annualRate: 0.08, annualVol: 0.2, years: 10, seed: 1 });
  const b = dcaMonteCarlo({ monthly: 1000, annualRate: 0.08, annualVol: 0.2, years: 10, seed: 999 });
  // 大概率不同（蒙特卡洛）
  assert.ok(Math.abs(a.lumpWinRate - b.lumpWinRate) > 0 || a.seed !== b.seed);
});

test("DCA_PRESETS：可复现且有效", () => {
  for (const [k, p] of Object.entries(DCA_PRESETS)) {
    assert.ok(k, "preset key");
    assert.ok(p.monthly > 0 && p.years > 0, `${k} 参数合理`);
    assert.equal(dcaVsLump(p).valid, true);
  }
});