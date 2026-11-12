// tests/compound.test.mjs — 复利/投资规划器
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  futureValue, dcaVsLump, doublingYears, yearSchedule, validCompound,
} from "../lib/compound.js";

test("一次性本金复利：10000@10%/10y 终值", () => {
  const r = futureValue({ principal: 10000, annualRate: 0.1, years: 10 });
  // 10000 * 1.1^10 = 25937.42
  assert.ok(Math.abs(r.fv - 25937.42) < 1, `fv=${r.fv}`);
  assert.ok(Math.abs(r.interest - (r.fv - 10000)) < 1e-6);
});

test("每月定投：100/月@10%/10y 终值", () => {
  const r = futureValue({ monthly: 100, annualRate: 0.1, years: 10 });
  // FV = 100 * ((1.1^(1/12))^120 - 1) / rm
  const rm = Math.pow(1.1, 1 / 12) - 1;
  const expected = 100 * (Math.pow(1 + rm, 120) - 1) / rm;
  assert.ok(Math.abs(r.fv - expected) < 1e-6, `fv=${r.fv} exp=${expected}`);
  assert.ok(r.contributed === 12000);
});

test("零年限 → 终值=本金，无利息", () => {
  const r = futureValue({ principal: 5000, monthly: 100, years: 0 });
  assert.equal(r.fv, 5000);
  assert.equal(r.interest, 0);
  assert.equal(r.months, 0);
});

test("零利率：定投终值 = 总投入", () => {
  const r = futureValue({ monthly: 100, annualRate: 0, years: 5 });
  assert.ok(Math.abs(r.fv - 6000) < 1e-6, `fv=${r.fv}`);
  assert.equal(r.interest, 0);
});

test("DCA vs 一次性：正收益时一次性更优（edge>0）", () => {
  const r = dcaVsLump({ total: 10000, annualRate: 0.1, years: 10 });
  assert.ok(r.edge > 0, `edge=${r.edge}`);
  assert.ok(r.lump.fv > r.dca.fv);
});

test("DCA vs 一次性：零收益时两者终值相等", () => {
  const r = dcaVsLump({ total: 10000, annualRate: 0, years: 10 });
  assert.ok(Math.abs(r.edge) < 1e-6, `edge=${r.edge}`);
  assert.ok(Math.abs(r.lump.fv - 10000) < 1e-6);
  assert.ok(Math.abs(r.dca.fv - 10000) < 1e-6);
});

test("翻倍年数：72 法则 vs 精确（10% 法则 7.2y，精确 7.27y）", () => {
  const d = doublingYears(0.1);
  assert.ok(Math.abs(d.rule72 - 7.2) < 1e-9, `rule72=${d.rule72}`);
  assert.ok(Math.abs(d.exact - 7.2725) < 1e-3, `exact=${d.exact}`);
  assert.ok(d.exact > d.rule72); // 精确值略大于 72 法则
});

test("翻倍年数：r≤0 → Infinity", () => {
  assert.equal(doublingYears(0).exact, Infinity);
  assert.equal(doublingYears(-0.05).rule72, Infinity);
});

test("逐年快照：长度 = years+1，终值末项 = futureValue.fv", () => {
  const o = { principal: 10000, monthly: 100, annualRate: 0.1, years: 10 };
  const s = yearSchedule(o);
  assert.equal(s.length, 11);
  assert.equal(s[0].year, 0);
  assert.ok(Math.abs(s[10].fv - futureValue(o).fv) < 1e-6);
  // 单调非减
  for (let i = 1; i < s.length; i++) assert.ok(s[i].fv >= s[i - 1].fv);
});

test("validCompound 边界", () => {
  assert.ok(validCompound({ principal: 0, monthly: 0, annualRate: 0.05, years: 10 }));
  assert.ok(!validCompound({ principal: -1, monthly: 0, annualRate: 0, years: 0 }));
  assert.ok(!validCompound({ principal: 0, monthly: 0, annualRate: 0, years: -1 }));
  assert.ok(!validCompound(null));
});

test("更高收益/更长时间 → 更高终值（单调）", () => {
  const a = futureValue({ principal: 10000, annualRate: 0.05, years: 10 });
  const b = futureValue({ principal: 10000, annualRate: 0.1, years: 10 });
  const c = futureValue({ principal: 10000, annualRate: 0.1, years: 20 });
  assert.ok(a.fv < b.fv);
  assert.ok(b.fv < c.fv);
});
