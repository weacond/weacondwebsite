"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  loanSummary, LOAN_PRESETS,
} from "../lib/loan";

export const metadata = {
  title: "贷款/偿债摊销计算器 — Weacond",
  description: "等额本息月供=P·r·(1+r)^n/((1+r)^n−1)，总利息，偿还月数。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};

export default function LoanPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [principal, setPrincipal] = useState(10000);
  const [annualRate, setAnnualRate] = useState(12); // 百分比
  const [years, setYears] = useState(1);

  const res = useMemo(
    () => loanSummary({ principal, annualRate: annualRate / 100, years }),
    [principal, annualRate, years],
  );

  const applyPreset = (p) => {
    setPrincipal(p.principal);
    setAnnualRate(p.annualRate * 100);
    setYears(p.years);
  };

  const band = res.payoffBand;
  const bandColor =
    band === "fast" ? "text-emerald-600" :
    band === "medium" ? "text-amber-600" :
    band === "slow" ? "text-rose-600" :
    "text-slate-500";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(LOAN_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.principalLabel}</span>
              <input type="number" value={principal} min={0} step={1000}
                onChange={(e) => setPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateLabel}</span>
              <input type="number" value={annualRate} min={0} max={40} step={0.1}
                onChange={(e) => setAnnualRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={1} step={1}
                onChange={(e) => setYears(Math.max(1, Math.floor(parseFloat(e.target.value) || 1)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-sm text-slate-500">{L.paymentLabel}</span>
              <span className={`text-4xl font-bold font-mono ${bandColor}`}>
                {res.valid && res.payment != null ? res.payment.toFixed(2) : L.na}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">{L.interestLabel}</div>
                <div className="text-lg font-mono">{res.valid ? res.interest.toFixed(2) : L.na}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">{L.paidLabel}</div>
                <div className="text-lg font-mono">{res.valid ? res.totalPaid.toFixed(2) : L.na}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">{L.interestRatioLabel}</div>
                <div className="text-lg font-mono">{res.valid ? `${(res.interestRatio * 100).toFixed(1)}%` : L.na}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">{L.bandLabel}</div>
                <div className="text-lg font-mono">{res.valid ? L.bandLabels ? L.bandLabels[band] : band : L.na}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/compound" className="text-xs text-indigo-500 hover:underline">
                → /compound {L.compound}
              </Link>
              <Link href="/bond" className="text-xs text-indigo-500 hover:underline">
                → /bond {L.bond}
              </Link>
              <Link href="/real-return" className="text-xs text-indigo-500 hover:underline">
                → /real-return {L.realReturn}
              </Link>
            </div>
          </div>

          <p className="text-xs text-slate-400">{L.note}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "贷款/偿债摊销",
  subtitle: "等额本息月供=P·r·(1+r)^n/((1+r)^n−1)，总利息，偿还月数。教育性参考。",
  principalLabel: "本金",
  rateLabel: "年利率",
  yearsLabel: "年期",
  paymentLabel: "月供",
  interestLabel: "总利息",
  paidLabel: "总还款",
  interestRatioLabel: "利息占比",
  bandLabel: "偿还状态",
  compound: "复利增长",
  bond: "债券久期",
  realReturn: "实际收益率",
  note: "等额本息假设利率恒定、按月付息。教育性参考，非投资建议。",
  na: "—",
  presetLabels: { car: "车贷", mortgage: "房贷", student: "学贷", highRate: "高利率", zeroRate: "零利率" },
  bandLabels: { fast: "快速", medium: "适中", slow: "缓慢", unbounded: "无法偿还", na: "—" },
};

const en = {
  title: "Loan / Debt Payoff",
  subtitle: "Equal-payment monthly = P·r·(1+r)^n/((1+r)^n−1); total interest & payoff time. Educational reference.",
  principalLabel: "Principal",
  rateLabel: "Annual rate",
  yearsLabel: "Years",
  paymentLabel: "Monthly payment",
  interestLabel: "Total interest",
  paidLabel: "Total paid",
  interestRatioLabel: "Interest ratio",
  bandLabel: "Payoff status",
  compound: "Compound growth",
  bond: "Bond duration",
  realReturn: "Real return",
  note: "Equal-payment assumes a constant rate with monthly interest. Educational reference, not investment advice.",
  na: "—",
  presetLabels: { car: "Car loan", mortgage: "Mortgage", student: "Student", highRate: "High rate", zeroRate: "Zero rate" },
  bandLabels: { fast: "Fast", medium: "Medium", slow: "Slow", unbounded: "Unpayable", na: "—" },
};
