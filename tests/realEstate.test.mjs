// tests/realEstate.test.mjs — lib/realEstate.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  netOperatingIncome,
  capRate,
  monthlyPmt,
  annualDebtService,
  cashOnCash,
  dscr,
  ltv,
  impliedValue,
  dscrBand,
  realEstateSummary,
  REAL_ESTATE_PRESETS,
  num,
} from "../lib/realEstate.js";

function approx(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
}

// 独立实现月供（与库无关），用于校验 monthlyPmt
function expectedPmt(L, annualRate, termYears) {
  const n = Math.round(termYears * 12);
  if (!(L > 0) || !(n > 0)) return 0;
  const i = annualRate / 12;
  if (i === 0) return L / n;
  const f = Math.pow(1 + i, n);
  return (L * i * f) / (f - 1);
}

test("netOperatingIncome：租金 − 运营费用", () => {
  approx(netOperatingIncome(32000, 5000), 27000);
  approx(netOperatingIncome(24000, 0), 24000);
  approx(netOperatingIncome(24000, 24000), 0);
});

test("capRate：NOI / 价；价≤0 → null", () => {
  approx(capRate(27000, 350000), 27000 / 350000);
  assert.equal(capRate(27000, 0), null);
  assert.equal(capRate(27000, -5), null);
});

test("monthlyPmt：零利率→等额；有利率→闭合解；L≤0/n≤0→0", () => {
  approx(monthlyPmt(0, 0.065, 30), 0);
  approx(monthlyPmt(280000, 0.065, 0), 0);
  approx(monthlyPmt(280000, 0, 10), 280000 / 120);
  approx(monthlyPmt(280000, 0.065, 30), expectedPmt(280000, 0.065, 30));
  approx(monthlyPmt(420000, 0.07, 30), expectedPmt(420000, 0.07, 30));
});

test("annualDebtService：月供 × 12", () => {
  approx(annualDebtService(1000), 12000);
  approx(annualDebtService(0), 0);
});

test("cashOnCash：现金流 / 首付；首付≤0 → null", () => {
  approx(cashOnCash(3762, 70000), 3762 / 70000);
  assert.equal(cashOnCash(3762, 0), null);
  assert.equal(cashOnCash(0, 70000), 0);
});

test("dscr：NOI / DS；DS≤0 → null", () => {
  approx(dscr(27000, 21237.6), 27000 / 21237.6);
  assert.equal(dscr(27000, 0), null);
  assert.equal(dscr(0, 1000), 0);
});

test("ltv：贷款 / 价；价≤0 → null", () => {
  approx(ltv(280000, 350000), 280000 / 350000);
  assert.equal(ltv(280000, 0), null);
});

test("impliedValue：NOI / 目标资本化率；目标≤0 → null", () => {
  approx(impliedValue(27000, 0.08), 27000 / 0.08);
  assert.equal(impliedValue(27000, 0), null);
});

test("dscrBand：分级与边界", () => {
  assert.equal(dscrBand(null), "nofinancing");
  assert.equal(dscrBand(undefined), "nofinancing");
  assert.equal(dscrBand(NaN), "nofinancing");
  assert.equal(dscrBand(0.9), "stressed");
  assert.equal(dscrBand(1), "tight");
  assert.equal(dscrBand(1.1), "tight");
  assert.equal(dscrBand(1.25), "adequate");
  assert.equal(dscrBand(1.4), "adequate");
  assert.equal(dscrBand(1.5), "strong");
  assert.equal(dscrBand(2), "strong");
});

test("realEstateSummary：单户住宅 → 全指标与不变式", () => {
  const r = realEstateSummary(REAL_ESTATE_PRESETS.singleFamily);
  assert.ok(r.valid);
  approx(r.loanAmount, 350000 - 70000);
  approx(r.noi, 32000 - 5000);
  approx(r.capRate, r.noi / r.purchasePrice);
  approx(r.annualDebtService, r.monthlyPI * 12);
  approx(r.cashFlow, r.noi - r.annualDebtService);
  approx(r.cashOnCash, r.cashFlow / r.downPayment);
  approx(r.dscr, r.noi / r.annualDebtService);
  approx(r.ltv, r.loanAmount / r.purchasePrice);
  approx(r.impliedValue, r.noi / r.targetCapRate);
  assert.ok(r.hasDebt);
});

test("realEstateSummary：全款 → 无按揭（CoC=CapRate, DSCR=null）", () => {
  const r = realEstateSummary(REAL_ESTATE_PRESETS.allCash);
  assert.ok(r.valid);
  approx(r.loanAmount, 0);
  approx(r.monthlyPI, 0);
  approx(r.annualDebtService, 0);
  approx(r.cashFlow, r.noi);
  approx(r.cashOnCash, r.capRate);
  assert.equal(r.dscr, null);
  assert.equal(r.band, "nofinancing");
  assert.equal(r.hasDebt, false);
});

test("realEstateSummary：高运营 → 负现金流 / stressed", () => {
  const r = realEstateSummary(REAL_ESTATE_PRESETS.highOpex);
  assert.ok(r.valid);
  assert.ok(r.cashFlow < 0, "应负现金流");
  assert.ok(r.dscr < 1, "DSCR < 1");
  assert.equal(r.band, "stressed");
});

test("不变式：有按揭时 DSCR≥1 ⟺ 现金流≥0", () => {
  for (const p of Object.values(REAL_ESTATE_PRESETS)) {
    const r = realEstateSummary(p);
    if (r.hasDebt) {
      assert.equal(r.dscr >= 1, r.cashFlow >= 0, `${p.id}: DSCR↔现金流`);
    }
  }
});

test("零利率按揭：月供=贷款/期数，年 DS=贷款/年限", () => {
  const r = realEstateSummary({
    purchasePrice: 200000,
    downPayment: 40000,
    annualRent: 20000,
    operatingExpenses: 2000,
    mortgageRate: 0,
    loanTermYears: 10,
  });
  assert.ok(r.valid);
  approx(r.monthlyPI, 160000 / 120);
  approx(r.annualDebtService, 160000 / 10);
});

test("realEstateSummary：非法输入 → 无效", () => {
  const base = { purchasePrice: 350000, downPayment: 70000, annualRent: 32000, operatingExpenses: 5000, mortgageRate: 0.065, loanTermYears: 30 };
  assert.equal(realEstateSummary({ ...base, purchasePrice: 0 }).valid, false);
  assert.equal(realEstateSummary({ ...base, purchasePrice: -1 }).valid, false);
  assert.equal(realEstateSummary({ ...base, downPayment: 350001 }).valid, false);
  assert.equal(realEstateSummary({ ...base, annualRent: 0 }).valid, false);
  assert.equal(realEstateSummary({ ...base, operatingExpenses: -1 }).valid, false);
  assert.equal(realEstateSummary({ ...base, mortgageRate: -0.01 }).valid, false);
  assert.equal(realEstateSummary({ ...base, loanTermYears: -1 }).valid, false);
  assert.equal(realEstateSummary({ purchasePrice: NaN, downPayment: 1 }).valid, false);
});

test("预设：5 个场景，summary 均有效且字段齐全", () => {
  const keys = Object.keys(REAL_ESTATE_PRESETS);
  assert.equal(keys.length, 5);
  for (const k of keys) {
    const p = REAL_ESTATE_PRESETS[k];
    assert.ok(p.id && p.label);
    assert.ok(Number.isFinite(p.purchasePrice) && p.purchasePrice > 0);
    assert.ok(realEstateSummary(p).valid);
  }
  assert.equal(realEstateSummary(REAL_ESTATE_PRESETS.allCash).band, "nofinancing");
  assert.equal(realEstateSummary(REAL_ESTATE_PRESETS.highOpex).band, "stressed");
});

test("num：非数字/非法 → 0", () => {
  assert.equal(num("abc"), 0);
  assert.equal(num(null), 0);
  assert.equal(num(NaN), 0);
  assert.equal(num(42), 42);
  assert.equal(num("3.5"), 3.5);
});