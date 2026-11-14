"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import Link from "next/link";
import {
  realEstateSummary, REAL_ESTATE_PRESETS,
} from "../lib/realEstate";

export const metadata = {
  title: "房地产投资分析（资本化率 / 现金回报 / DSCR）— Weacond",
  description: "NOI、资本化率、月供、现金流、现金回报率、DSCR、LTV 与按目标资本化率反推估值。教育性参考。",
  robots: { index: true, follow: true },
};

export default function RealEstatePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [purchasePrice, setPurchasePrice] = useState(350000);
  const [downPayment, setDownPayment] = useState(70000);
  const [annualRent, setAnnualRent] = useState(32000);
  const [operatingExpenses, setOperatingExpenses] = useState(5000);
  const [mortgageRate, setMortgageRate] = useState(6.5); // 百分比
  const [loanTermYears, setLoanTermYears] = useState(30);
  const [targetCapRate, setTargetCapRate] = useState(8); // 百分比

  const res = useMemo(
    () =>
      realEstateSummary({
        purchasePrice,
        downPayment,
        annualRent,
        operatingExpenses,
        mortgageRate: mortgageRate / 100,
        loanTermYears,
        targetCapRate: targetCapRate / 100,
      }),
    [purchasePrice, downPayment, annualRent, operatingExpenses, mortgageRate, loanTermYears, targetCapRate],
  );

  const applyPreset = (p) => {
    setPurchasePrice(p.purchasePrice);
    setDownPayment(p.downPayment);
    setAnnualRent(p.annualRent);
    setOperatingExpenses(p.operatingExpenses);
    setMortgageRate(p.mortgageRate * 100);
    setLoanTermYears(p.loanTermYears);
    setTargetCapRate((p.targetCapRate || 0) * 100);
  };

  const band = res.band;
  const bandColor =
    band === "strong" ? "text-emerald-600" :
    band === "adequate" ? "text-indigo-600" :
    band === "tight" ? "text-amber-600" :
    band === "stressed" ? "text-red-600" : "text-slate-400";

  const money = (n) => (n === null || !Number.isFinite(n) ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }));
  const pct = (n) => (n === null || !Number.isFinite(n) ? "—" : `${Number(n).toFixed(2)}%`);
  const inputCls = "w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="real-estate" />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/real-estate"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Real Estate Analysis", href: "/real-estate" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(REAL_ESTATE_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.purchaseLabel}</span>
              <input type="number" value={purchasePrice} min={0}
                onChange={(e) => setPurchasePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.downLabel}</span>
              <input type="number" value={downPayment} min={0}
                onChange={(e) => setDownPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rentLabel}</span>
              <input type="number" value={annualRent} min={0}
                onChange={(e) => setAnnualRent(Math.max(0, parseFloat(e.target.value) || 0))}
                className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.opexLabel}</span>
              <input type="number" value={operatingExpenses} min={0}
                onChange={(e) => setOperatingExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
                className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateLabel}</span>
              <input type="number" value={mortgageRate} min={0} max={20} step={0.1}
                onChange={(e) => setMortgageRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.termLabel}</span>
              <input type="number" value={loanTermYears} min={0} max={40} step={1}
                onChange={(e) => setLoanTermYears(Math.max(0, Math.floor(parseFloat(e.target.value) || 0)))}
                className={inputCls} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.targetCapLabel}</span>
              <input type="number" value={targetCapRate} min={0} max={20} step={0.1}
                onChange={(e) => setTargetCapRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className={inputCls} />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-500">{L.bandLabel}</span>
                <span className={`text-lg font-bold ${bandColor}`}>{L.bandLabels[band]}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.noiLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{money(res.noi)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.capLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{pct(res.capRate * 100)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.cocLabel}</div>
                  <div className="text-xl font-bold text-emerald-600">{pct(res.cashOnCash * 100)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.dscrLabel}</div>
                  <div className={`text-xl font-bold ${bandColor}`}>{res.dscr === null ? "—" : res.dscr.toFixed(3)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.cashFlowLabel}</div>
                  <div className={`text-xl font-bold ${res.cashFlow >= 0 ? "text-slate-800" : "text-red-600"}`}>{money(res.cashFlow)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.ltvLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{pct(res.ltv * 100)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.pmtLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{money(res.monthlyPI)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.dsLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{money(res.annualDebtService)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.loanLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{money(res.loanAmount)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.impliedLabel}</div>
                  <div className="text-xl font-bold text-amber-600">{money(res.impliedValue)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/npv" className="text-indigo-500 hover:underline">→ {L.linkNpv}</Link>
            {" · "}
            <Link href="/xirr" className="text-indigo-500 hover:underline">→ {L.linkXirr}</Link>
            {" · "}
            <Link href="/loan" className="text-indigo-500 hover:underline">→ {L.linkLoan}</Link>
            {" · "}
            <Link href="/fair-value" className="text-indigo-500 hover:underline">→ {L.linkFairValue}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "房地产投资分析",
  subtitle: "净营运收入、资本化率、月供、现金流、现金回报率、DSCR、LTV 与反推估值。教育性参考。",
  purchaseLabel: "买入总价",
  downLabel: "首付现金",
  rentLabel: "年毛租金",
  opexLabel: "年运营费用（除按揭）",
  rateLabel: "按揭利率 %",
  termLabel: "贷款年限",
  targetCapLabel: "目标资本化率 %",
  bandLabel: "覆盖等级",
  bandLabels: { strong: "强健", adequate: "良好", tight: "偏紧", stressed: "承压", nofinancing: "无按揭" },
  noiLabel: "净营运收入 NOI",
  capLabel: "资本化率",
  cocLabel: "现金回报率",
  dscrLabel: "债务覆盖倍数 DSCR",
  cashFlowLabel: "年净现金流",
  ltvLabel: "贷款价值比 LTV",
  pmtLabel: "月供 P&I",
  dsLabel: "年还本付息",
  loanLabel: "贷款额",
  impliedLabel: "反推估值",
  invalid: "买入价须 >0，首付 ≤ 买入价，租金须 >0。",
  disclaimer: "简化模型：年运营费用已含税费/保险/维修/空置，忽略摊销、资本增值与租金增长，非投资建议。",
  linkNpv: "净现值 NPV",
  linkXirr: "内部收益率 IRR",
  linkLoan: "贷款",
  linkFairValue: "公允价值",
  howToTitle: "如何使用房地产投资分析计算器",
  howTo: [
    "输入买入总价、首付、年毛租金与年运营费用（税费/保险/维修/空置等，除按揭外）。",
    "填写按揭利率与贷款年限；首付等于总价即全款，DSCR 显示为「无按揭」。",
    "读取净营运收入 NOI、资本化率、现金回报率与 DSCR，判断现金流与覆盖能力。",
    "填入市场目标资本化率，反推该物业的合理估值（NOI ÷ 目标资本化率）。",
  ],
  presetLabels: { singleFamily: "单户住宅", multiFamily: "多户住宅", rehab: "翻修小公寓", allCash: "全款", highOpex: "高运营/负现金流" },
};

const en = {
  title: "Real Estate Investment Analysis",
  subtitle: "NOI, cap rate, monthly P&I, cash flow, cash-on-cash, DSCR, LTV & implied valuation. For education.",
  purchaseLabel: "Purchase price",
  downLabel: "Down payment",
  rentLabel: "Gross annual rent",
  opexLabel: "Annual operating expenses (ex-debt)",
  rateLabel: "Mortgage rate %",
  termLabel: "Loan term (yrs)",
  targetCapLabel: "Target cap rate %",
  bandLabel: "Coverage",
  bandLabels: { strong: "Strong", adequate: "Adequate", tight: "Tight", stressed: "Stressed", nofinancing: "No financing" },
  noiLabel: "Net Operating Income",
  capLabel: "Cap Rate",
  cocLabel: "Cash-on-Cash",
  dscrLabel: "Debt Service Coverage",
  cashFlowLabel: "Annual Cash Flow",
  ltvLabel: "Loan-to-Value",
  pmtLabel: "Monthly P&I",
  dsLabel: "Annual Debt Service",
  loanLabel: "Loan Amount",
  impliedLabel: "Implied Value",
  invalid: "Price must be > 0, down payment ≤ price, rent > 0.",
  disclaimer: "Simplified model: operating expenses include tax/insurance/maintenance/vacancy; ignores amortization, appreciation & rent growth. Not investment advice.",
  linkNpv: "Net Present Value",
  linkXirr: "Internal Rate of Return",
  linkLoan: "Loan",
  linkFairValue: "Fair Value",
  howToTitle: "How to use the real estate investment calculator",
  howTo: [
    "Enter purchase price, down payment, gross annual rent, and annual operating expenses (tax/insurance/maintenance/vacancy, ex-debt).",
    "Set the mortgage rate and term; down payment equal to price means all-cash, shown as 'No financing'.",
    "Read NOI, cap rate, cash-on-cash, and DSCR to judge cash flow and coverage.",
    "Enter a market target cap rate to back into an implied fair value (NOI ÷ target cap rate).",
  ],
  presetLabels: { singleFamily: "Single-Family", multiFamily: "Multi-Family", rehab: "Rehab SFR", allCash: "All-Cash", highOpex: "High OpEx / Negative CF" },
};