// tests/purchasingPower.test.mjs — lib/purchasingPower.js 货币购买力/通胀测试
import test from "node:test";
import assert from "node:assert/strict";
import {
  num,
  inflationFactor,
  purchasingPower,
  ppBand,
  PP_PRESETS,
} from "../lib/purchasingPower.js";

test("num：归一化", () => {
  assert.equal(num("0.05", 0), 0.05);
  assert.equal(num("x", 5), 5);
});

test("inflationFactor：(1+通胀)^years", () => {
  assert.ok(Math.abs(inflationFactor(0.03, 10) - 1.3439164) < 1e-4);
  assert.ok(Math.abs(inflationFactor(0, 10) - 1) < 1e-12);
});

test("purchasingPower：维持购买力名义值/今日购买力/流失比例/半衰期/72法则", () => {
  const r = purchasingPower({ amount: 100000, inflation: 0.05, years: 10 });
  assert.equal(r.valid, true);
  assert.ok(Math.abs(r.factor - 1.6288946) < 1e-5);
  assert.ok(Math.abs(r.futureNominal - 162889.46) < 1);
  assert.ok(Math.abs(r.realValueToday - 61391.33) < 1);
  assert.ok(Math.abs(r.powerLost - 0.3860868) < 1e-5);
  assert.ok(Math.abs(r.halfLife - 14.2067) < 1e-2);
  assert.ok(Math.abs(r.rule72 - 14.4) < 1e-9);
  // 不变式：futureNominal = amount × factor；realValueToday × factor = amount
  assert.ok(Math.abs(r.futureNominal / r.amount - r.factor) < 1e-9);
  assert.ok(Math.abs(r.realValueToday * r.factor - 100000) < 1e-6);
  assert.ok(r.powerLost >= 0 && r.powerLost < 1);
});

test("purchasingPower：零通胀 → 不流失，半衰期/72 为 null", () => {
  const r = purchasingPower({ amount: 100, inflation: 0, years: 10 });
  assert.ok(Math.abs(r.futureNominal - 100) < 1e-9);
  assert.ok(Math.abs(r.realValueToday - 100) < 1e-9);
  assert.ok(Math.abs(r.powerLost - 0) < 1e-12);
  assert.equal(r.halfLife, null);
  assert.equal(r.rule72, null);
});

test("purchasingPower：需名义收益（费雪精确）", () => {
  const r = purchasingPower({ amount: 1000, inflation: 0.05, years: 1, realReturn: 0.03 });
  // 名义 = (1+实际)(1+通胀)−1 = 1.03×1.05−1 = 0.0815
  assert.ok(Math.abs(r.requiredNominal - 0.0815) < 1e-9);
});

test("purchasingPower：无效（负金额/负通胀）", () => {
  assert.equal(purchasingPower({ amount: -100, inflation: 0.03, years: 5 }).valid, false);
  assert.equal(purchasingPower({ amount: 100, inflation: -0.1, years: 5 }).valid, false);
});

test("ppBand 分级", () => {
  assert.equal(ppBand(0.6), "severe");
  assert.equal(ppBand(0.3), "noticeable");
  assert.equal(ppBand(0.05), "mild");
  assert.equal(ppBand(0.001), "negligible");
  assert.equal(ppBand(null), "n/a");
});

test("PP_PRESETS：可复现且有效", () => {
  for (const [k, p] of Object.entries(PP_PRESETS)) {
    assert.ok(k, "preset key");
    assert.ok(p.amount > 0 && p.inflation > 0 && p.years > 0, `${k} 参数合理`);
    assert.equal(purchasingPower(p).valid, true);
  }
});