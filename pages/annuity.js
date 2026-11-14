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
  annuitySummary, ANNUITY_PRESETS,
} from "../lib/annuity";
export const metadata = {
  title: "年金给付 / 退休规划计算器 — Weacond",
  description: "年金给付=PMT=PV·r/(1−(1+r)^−n)，所需储蓄，给付年数。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}
export default function AnnuityPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [presentValue, setPresentValue] = useState(100000);
  const [rate, setRate] = useState(4); // 百分比
  const [years, setYears] = useState(20);
  const res = useMemo(
    () => annuitySummary({ presentValue, rate: rate / 100, years }),
    [presentValue, rate, years],
  );
  const applyPreset = (p) => {
    setPresentValue(p.presentValue);
    setRate(p.rate * 100);
    setYears(p.years);
  };
  const band = res.band;
  const bandColor =
    band === "surplus" ? "text-emerald-600" :
    band === "adequate" ? "text-indigo-600" :
    band === "tight" ? "text-amber-600" :
    "text-rose-600";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="annuity" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/annuity"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Annuity Payout / Retirement", href: "/annuity" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(ANNUITY_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.pvLabel}</span>
              <input type="number" value={presentValue} min={0} step={10000}
                onChange={(e) => setPresentValue(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateLabel}</span>
              <input type="number" value={rate} min={0} max={20} step={0.1}
                onChange={(e) => setRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={1} max={50} step={1}
                onChange={(e) => setYears(Math.max(1, Math.floor(parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.pmtLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtMoney(res.annualPayment)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.totalPaidLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.totalPaid)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.interestLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{fmtMoney(res.interestPortion)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.pvLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.presentValue)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.yearsLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{years} {L.yearUnit}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/compound" className="text-indigo-500 hover:underline">→ {L.linkCompound}</Link>
            {" · "}
            <Link href="/real-return" className="text-indigo-500 hover:underline">→ {L.linkRealReturn}</Link>
            {" · "}
            <Link href="/tax-drag" className="text-indigo-500 hover:underline">→ {L.linkTaxDrag}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
const zh = {
  title: "年金给付 / 退休规划",
  subtitle: "年金给付 PMT = PV·r/(1−(1+r)^−n)；所需储蓄；给付年数。教育性参考。",
  howToTitle: "如何使用年金给付/退休规划计算器",
  howTo: [
    "输入本金 PV 与年利率%。",
    "设定给付年数 n。",
    "计算器按 PMT = PV·r/(1−(1+r)^−n) 求每期给付。",
    "查看所需储蓄与给付年数，规划退休现金流。",
  ],
  pvLabel: "现值（储蓄）",
  rateLabel: "年化利率 %",
  yearsLabel: "给付年数",
  pmtLabel: "年给付额",
  totalPaidLabel: "总给付",
  interestLabel: "利息部分",
  yearUnit: "年",
  invalid: "现值须 >0，年数 ≥1。",
  disclaimer: "简化模型（假设利率恒定、年末给付），非投资建议。",
  linkCompound: "复利",
  linkRealReturn: "实际回报",
  linkTaxDrag: "税后复利",
  bandLabels: { insufficient: "不足", tight: "紧张 0.8–1.0", adequate: "充足 1.0–1.2", surplus: "充裕 ≥1.2" },
  presetLabels: { standard: "标准 4%", lowRate: "低利率 2%", long: "长期 30Y", short: "短期 10Y", highReturn: "高收益 7%" },
};
const en = {
  title: "Annuity Payout / Retirement",
  subtitle: "PMT = PV·r/(1−(1+r)^−n); savings required; payout years. Educational.",
  howToTitle: "How to use the annuity payout / retirement calculator",
  howTo: [
    "Enter the principal PV and the annual rate %.",
    "Set the payout years n.",
    "The calculator computes each payment as PMT = PV·r/(1−(1+r)^−n).",
    "Read the required savings and payout years to plan retirement cash flow.",
  ],
  pvLabel: "Present value",
  rateLabel: "Annual rate %",
  yearsLabel: "Payout years",
  pmtLabel: "Annual payment",
  totalPaidLabel: "Total paid out",
  interestLabel: "Interest portion",
  yearUnit: "yr",
  invalid: "Present value > 0, years ≥ 1.",
  disclaimer: "Simplified model (constant rate, year-end payments). Not investment advice.",
  linkCompound: "Compound",
  linkRealReturn: "Real Return",
  linkTaxDrag: "Tax Drag",
  bandLabels: { insufficient: "Insufficient", tight: "Tight 0.8–1.0", adequate: "Adequate 1.0–1.2", surplus: "Surplus ≥1.2" },
  presetLabels: { standard: "Standard 4%", lowRate: "Low 2%", long: "Long 30Y", short: "Short 10Y", highReturn: "High 7%" },
};
