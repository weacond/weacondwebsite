// tests/ruin.test.mjs — lib/ruin.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  riskOfRuin, ruinBand, ruinSummary, RUIN_PRESETS, num,
} from "../lib/ruin.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("riskOfRuin：有优势时 pRuin = ((q/w)·(1/rr))^B", () => {
  const r = riskOfRuin(55, 2, 10);
  assert.ok(r.valid);
  approx(r.edge, 0.65); // 0.55·2 − 0.45
  approx(r.ratio, 0.45 / 1.1); // (q/w)·(1/rr)
  approx(r.pRuin, Math.pow(0.45 / 1.1, 10));
});

test("riskOfRuin：零期望（50/1:1）→ 必破产", () => {
  const r = riskOfRuin(50, 1, 10);
  approx(r.edge, 0);
  approx(r.pRuin, 1);
});

test("riskOfRuin：负期望（无优势）→ 必破产", () => {
  approx(riskOfRuin(40, 1, 10).pRuin, 1);
  approx(riskOfRuin(70, 0.3, 10).pRuin, 1); // 0.7·0.3 − 0.3 < 0
});

test("riskOfRuin：高胜率低赔率仍可能较高破产率", () => {
  const r = riskOfRuin(70, 0.5, 10); // edge=0.05>0
  approx(r.edge, 0.05);
  approx(r.pRuin, Math.pow((0.3 / 0.7) * 2, 10));
  assert.ok(r.pRuin > 0.1 && r.pRuin < 0.5);
});

test("riskOfRuin：本金越大破产率越低", () => {
  const small = riskOfRuin(55, 2, 3).pRuin;
  const large = riskOfRuin(55, 2, 30).pRuin;
  assert.ok(small > large);
  assert.ok(large > 0 && large < 1e-6);
});

test("riskOfRuin：rr=0 时破产必然（edge<0，ratio=∞）", () => {
  const r = riskOfRuin(50, 0, 10);
  assert.ok(r.valid);
  approx(r.pRuin, 1);
  assert.equal(r.ratio, Infinity);
});

test("riskOfRuin：非法输入 → 无效", () => {
  assert.ok(!riskOfRuin(0, 2, 10).valid);     // 胜率 0
  assert.ok(!riskOfRuin(100, 2, 10).valid);   // 胜率 100
  assert.ok(!riskOfRuin(50, 2, 0).valid);     // 本金 0
  assert.ok(!riskOfRuin(50, -1, 10).valid);   // rr 负
  assert.ok(!riskOfRuin("abc", 2, 10).valid); // 非数
});

test("ruinBand：分级", () => {
  assert.equal(ruinBand(NaN), "na");
  assert.equal(ruinBand(0.005), "safe");
  assert.equal(ruinBand(0.01), "safe");
  assert.equal(ruinBand(0.05), "low");
  assert.equal(ruinBand(0.1), "low");
  assert.equal(ruinBand(0.3), "elevated");
  assert.equal(ruinBand(0.5), "elevated");
  assert.equal(ruinBand(0.9), "high");
});

test("ruinSummary：组合 + 分级", () => {
  const r = ruinSummary({ winRate: 55, rr: 2, bankrollR: 10 });
  approx(r.pRuin, Math.pow(0.45 / 1.1, 10));
  assert.equal(r.band, "safe");
  assert.ok(r.valid);
  assert.equal(ruinSummary({ winRate: 0, rr: 2, bankrollR: 10 }).band, "na");
});

test("预设：4 个情景，ruinSummary 均有效；有优势低、无优势高", () => {
  const keys = Object.keys(RUIN_PRESETS);
  assert.equal(keys.length, 4);
  for (const k of keys) {
    const p = RUIN_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.winRate) && p.winRate > 0 && p.winRate < 100);
    assert.ok(Number.isFinite(p.bankrollR) && p.bankrollR > 0);
    assert.ok(ruinSummary(p).valid);
  }
  assert.ok(ruinSummary(RUIN_PRESETS.edge).pRuin < ruinSummary(RUIN_PRESETS.noEdge).pRuin);
  assert.equal(ruinSummary(RUIN_PRESETS.noEdge).pRuin, 1);
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});