// tests/bond.test.mjs — lib/bond.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bondPrice, currentYield, macaulayDuration, modifiedDuration,
  priceBand, bondSummary, BOND_PRESETS, num,
} from "../lib/bond.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("bondPrice：平价（票面=到期收益率）→ 价格=面值", () => {
  approx(bondPrice(100, 0.05, 5, 0.05), 100, 1e-6);
});

test("bondPrice：零息券 = F/(1+y)^n", () => {
  approx(bondPrice(100, 0, 10, 0.05), 100 / Math.pow(1.05, 10));
  approx(bondPrice(100, 0.05, 0, 0.05), 100); // 已到期 → 面值
});

test("currentYield：年息 / 价格", () => {
  approx(currentYield(5, 100), 0.05);
  approx(currentYield(5, 0), 0); // 价格 ≤0 → 0
});

test("macaulayDuration：零息券久期 = 到期年数", () => {
  approx(macaulayDuration(100, 0, 10, 0.05), 10, 1e-6);
  approx(macaulayDuration(100, 0.05, 0, 0.05), 0); // n≤0 → 0
});

test("modifiedDuration：D/(1+y)", () => {
  approx(modifiedDuration(10, 0.05), 10 / 1.05);
  approx(modifiedDuration(10, -1.5), 0); // 1+y ≤0 → 0
});

test("priceBand：par / discount / premium / na", () => {
  assert.equal(priceBand(100, 100), "par");
  assert.equal(priceBand(99.999, 100), "par");
  assert.equal(priceBand(61.39, 100), "discount");
  assert.equal(priceBand(108.17, 100), "premium");
  assert.equal(priceBand(100, 0), "na");
});

test("bondSummary：平价综合视图", () => {
  const r = bondSummary(BOND_PRESETS.par);
  assert.ok(r.valid);
  approx(r.price, 100, 1e-6);
  approx(r.currentYield, 0.05, 1e-6);
  assert.ok(r.macaulayDuration > 0 && r.macaulayDuration < 5);
  assert.equal(r.band, "par");
});

test("bondSummary：零息券久期=10，折价", () => {
  const r = bondSummary(BOND_PRESETS.zero);
  assert.ok(r.valid);
  approx(r.price, 100 / Math.pow(1.05, 10), 1e-6);
  approx(r.macaulayDuration, 10, 1e-6);
  approx(r.modifiedDuration, 10 / 1.05, 1e-6);
  assert.equal(r.band, "discount");
});

test("bondSummary：溢价 > 面值，折价 < 面值", () => {
  assert.ok(bondSummary(BOND_PRESETS.premium).price > 100);
  assert.ok(bondSummary(BOND_PRESETS.premium).band === "premium");
  assert.ok(bondSummary(BOND_PRESETS.discount).price < 100);
});

test("bondSummary：面值为0 / 年数≤0 / 收益率≤−1 → 无效", () => {
  assert.equal(bondSummary({ face: 100, couponRate: 0.05, years: 0, yieldRate: 0.05 }).valid, false);
  assert.equal(bondSummary({ face: 0, couponRate: 0.05, years: 5, yieldRate: 0.05 }).valid, false);
  assert.equal(bondSummary({ face: 100, couponRate: 0.05, years: 5, yieldRate: -1.5 }).valid, false);
});

test("预设：5 个情景，summary 均有效", () => {
  const keys = Object.keys(BOND_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = BOND_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(bondSummary(p).valid);
  }
  assert.equal(bondSummary(BOND_PRESETS.par).band, "par");
  assert.equal(bondSummary(BOND_PRESETS.premium).band, "premium");
  assert.equal(bondSummary(BOND_PRESETS.zero).band, "discount");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(42), 42);
});
