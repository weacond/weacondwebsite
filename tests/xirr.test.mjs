// tests/xirr.test.mjs — 内部收益率 IRR/XIRR
import { test } from "node:test";
import assert from "node:assert/strict";
import { npv, irr, annualize, validCashflows, cashflowInsight } from "../lib/xirr.js";

test("NPV：r=0 时 = 现金流之和", () => {
  assert.ok(Math.abs(npv(0, [-1000, 0, 0, 1331]) - 331) < 1e-9);
});

test("NPV：已知 r 折现正确", () => {
  // -1000 + 1331/1.1^3
  assert.ok(Math.abs(npv(0.1, [-1000, 0, 0, 1331]) - 0) < 1e-6);
});

test("经典 IRR：[-1000,0,0,1331] = 10%", () => {
  const r = irr([-1000, 0, 0, 1331]);
  assert.ok(r != null && Math.abs(r - 0.1) < 1e-4, `irr=${r}`);
});

test("IRR：[-1000,500,600] ≈ 6.39%", () => {
  const r = irr([-1000, 500, 600]);
  assert.ok(r != null && Math.abs(r - 0.0639) < 5e-3, `irr=${r}`);
});

test("IRR 反解后 NPV≈0", () => {
  const cf = [-1000, 300, 300, 300, 300];
  const r = irr(cf);
  assert.ok(r != null);
  assert.ok(Math.abs(npv(r, cf)) < 1e-4, `npv@irr=${npv(r, cf)}`);
});

test("无正负现金流 → irr 返回 null", () => {
  assert.equal(irr([100, 100, 100]), null);
  assert.equal(irr([-100, -100]), null);
});

test("少于 2 期 → null", () => {
  assert.equal(irr([-1000]), null);
  assert.equal(irr([]), null);
});

test("annualize：月 IRR 年化", () => {
  const a = annualize(0.01, 12);
  assert.ok(Math.abs(a - (Math.pow(1.01, 12) - 1)) < 1e-9, `a=${a}`);
});

test("annualize 非法输入 → null", () => {
  assert.equal(annualize(-1.5), null);
  assert.equal(annualize(0.01, 0), null);
});

test("validCashflows 边界", () => {
  assert.ok(validCashflows([-1000, 0, 0, 1331]));
  assert.ok(!validCashflows([1, 1, 1]));
  assert.ok(!validCashflows([-1]));
  assert.ok(!validCashflows([-1, NaN]));
});

test("cashflowInsight 给出年化结论", () => {
  const i = cashflowInsight([-1000, 0, 0, 1331]);
  assert.ok(Math.abs(i.irr - 0.1) < 1e-4);
  assert.ok(i.annual != null);
  assert.equal(typeof i.note, "string");
});

test("单期回收 IRR 收敛（大回收 → 大收益率）", () => {
  const r = irr([-1000, 2000]); // r: 1000 = 2000/(1+r) → 1+r=2 → r=1
  assert.ok(r != null && Math.abs(r - 1.0) < 1e-4, `irr=${r}`);
});
