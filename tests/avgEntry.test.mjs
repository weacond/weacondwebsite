// tests/avgEntry.test.mjs — lib/avgEntry.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blendedAvg, positionPnl, distanceTo, positionSummary, pnlStatus,
  AVG_ENTRY_PRESETS, num,
} from "../lib/avgEntry.js";

function approx(a, b, eps = 1e-6) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

test("blendedAvg：加权平均，100@100 + 50@90", () => {
  const r = blendedAvg(100, 100, 50, 90);
  assert.equal(r.totalShares, 150);
  approx(r.totalCost, 14500);
  approx(r.avg, 14500 / 150);
  approx(r.addSharesPct, 50 / 150 * 100);
  approx(r.addCostPct, 4500 / 14500 * 100);
  assert.ok(r.avgShiftPct < 0, "加仓价更低 → 均价下移");
  assert.ok(r.valid);
});

test("blendedAvg：仅原持仓（addShares=0）→ 原均价", () => {
  const r = blendedAvg(200, 50, 0, 50);
  assert.equal(r.totalShares, 200);
  approx(r.avg, 50);
  assert.equal(r.addSharesPct, 0);
  assert.equal(r.addCostPct, 0);
  assert.equal(r.avgShiftPct, 0);
  assert.ok(r.valid);
});

test("blendedAvg：全 0 → 无效，avg 为 NaN", () => {
  const r = blendedAvg(0, 0, 0, 0);
  assert.ok(!r.valid);
  assert.ok(Number.isNaN(r.avg));
});

test("blendedAvg：负股数被钳到 0", () => {
  const r = blendedAvg(-10, 100, 5, 90);
  assert.equal(r.totalShares, 5); // 负的原有被忽略
  approx(r.avg, 90);
});

test("positionPnl：现价高于均价 → 盈利", () => {
  const r = positionPnl(100, 110, 100);
  approx(r.priceChange, 10);
  approx(r.profit, 1000);
  approx(r.profitPct, 10);
  assert.ok(r.valid);
});

test("positionPnl：现价低于均价 → 亏损", () => {
  const r = positionPnl(100, 90, 100);
  approx(r.profit, -1000);
  approx(r.profitPct, -10);
});

test("positionPnl：现价=均价 → 平手", () => {
  const r = positionPnl(100, 100, 100);
  approx(r.profit, 0);
  approx(r.profitPct, 0);
});

test("positionPnl：均价为 0 → 无效", () => {
  assert.ok(!positionPnl(0, 50, 100).valid);
});

test("distanceTo：到更高目标 → up；到更低 → down；相等 → flat", () => {
  approx(distanceTo(95, 100).pctMove, 5 / 95 * 100);
  assert.equal(distanceTo(95, 100).direction, "up");
  assert.equal(distanceTo(100, 90).direction, "down");
  approx(distanceTo(100, 90).pctMove, -10);
  assert.equal(distanceTo(100, 100).direction, "flat");
});

test("distanceTo：现价为 0 → 无效", () => {
  assert.ok(!distanceTo(0, 100).valid);
});

test("positionSummary：补仓摊平场景（averageDown 预设）", () => {
  const p = AVG_ENTRY_PRESETS.averageDown;
  const r = positionSummary(p);
  approx(r.blended.avg, 14500 / 150);
  approx(r.blended.totalShares, 150);
  // 现价 95 低于均价 96.667 → 小幅浮亏
  approx(r.pnl.profit, (95 - 14500 / 150) * 150);
  assert.ok(r.pnl.profit < 0);
  // 到目标 100：现价 95 → 向上
  assert.equal(r.toTarget.direction, "up");
  approx(r.toTarget.pctMove, 5 / 95 * 100);
});

test("positionSummary：无 target → toTarget 为 null；current=0 回退加仓价", () => {
  const r1 = positionSummary({ existingShares: 100, existingPrice: 100, addShares: 0, addPrice: 100 });
  assert.equal(r1.toTarget, null);
  const r2 = positionSummary({ existingShares: 100, existingPrice: 100, addShares: 50, addPrice: 90, current: 0, target: 100 });
  // current=0 → spot 回退到加仓价 90
  approx(r2.pnl.profitPct, (90 - 14500 / 150) / (14500 / 150) * 100);
});

test("pnlStatus：盈/亏/平/无效", () => {
  assert.equal(pnlStatus({ profitPct: 5, valid: true }), "profit");
  assert.equal(pnlStatus({ profitPct: -5, valid: true }), "loss");
  assert.equal(pnlStatus({ profitPct: 0, valid: true }), "flat");
  assert.equal(pnlStatus({ profitPct: 0.005, valid: true }), "flat");
  assert.equal(pnlStatus({ valid: false }), "invalid");
  assert.equal(pnlStatus(null), "invalid");
});

test("预设：4 个场景，字段完整", () => {
  const keys = Object.keys(AVG_ENTRY_PRESETS);
  assert.equal(keys.length, 4);
  for (const k of keys) {
    const p = AVG_ENTRY_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.existingShares) && p.existingShares >= 0);
    assert.ok(Number.isFinite(p.existingPrice) && p.existingPrice > 0);
    assert.ok(Number.isFinite(p.addShares) && p.addShares >= 0);
    assert.ok(Number.isFinite(p.addPrice) && p.addPrice > 0);
    // 每个预设都能算出合法均价
    assert.ok(blendedAvg(p.existingShares, p.existingPrice, p.addShares, p.addPrice).valid);
  }
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(undefined), 0);
  assert.equal(num(42), 42);
  assert.equal(num("12.5"), 12.5);
});