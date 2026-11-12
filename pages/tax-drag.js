"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  taxDragSummary, TAXDRAG_PRESETS,
} from "../lib/taxDrag";

export const metadata = {
  title: "税后复利 / 税收拖累计算器 — Weacond",
  description: "税后年化=r·(1−t)，税收拖累=(名义−税后)/名义。教育性参考，非税务建议。",
  robots: { index: true, follow: true },
};

function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}

export default function TaxDragPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [rate, setRate] = useState(10); // 百分比
  const [taxRate, setTaxRate] = useState(15); // 百分比
  const [years, setYears] = useState(10);

  const res = useMemo(
    () => taxDragSummary({ principal: 10000, rate: rate / 100, taxRate: taxRate / 100, years }),
    [rate, taxRate, years],
  );

  const applyPreset = (p) => {
    setRate(p.rate * 100);
    setTaxRate(p.taxRate * 100);
    setYears(p.years);
  };

  const band = res.band;
  const bandColor =
    band === "high" ? "text-rose-600" :
    band === "moderate" ? "text-amber-600" :
    band === "low" ? "text-emerald-600" :
    "text-slate-400";

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
            {Object.values(TAXDRAG_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateLabel}</span>
              <input type="number" value={rate} min={0} max={30} step={0.5}
                onChange={(e) => setRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.taxRateLabel}</span>
              <input type="number" value={taxRate} min={0} max={100} step={1}
                onChange={(e) => setTaxRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={0} max={100} step={1}
                onChange={(e) => setYears(Math.max(0, Math.floor(parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.aftLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtMoney(res.afterTaxFuture)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.nomLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.nominalFuture)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.dragLabel}</div>
                  <div className="text-xl font-bold text-rose-600">{(res.taxDrag * 100).toFixed(2)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.atrLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{(res.afterTaxRate * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.taxRateLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{taxRate.toFixed(0)}%</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/tax-loss" className="text-indigo-500 hover:underline">→ {L.linkTaxLoss}</Link>
            {" · "}
            <Link href="/compound" className="text-indigo-500 hover:underline">→ {L.linkCompound}</Link>
            {" · "}
            <Link href="/real-return" className="text-indigo-500 hover:underline">→ {L.linkRealReturn}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "税后复利 / 税收拖累",
  subtitle: "税后年化 = r·(1−t)；税收拖累 = (名义终值 − 税后终值)/名义终值。教育性参考。",
  rateLabel: "名义年化 %",
  taxRateLabel: "税率 %",
  yearsLabel: "年数",
  aftLabel: "税后终值",
  nomLabel: "名义终值",
  dragLabel: "税收拖累",
  atrLabel: "税后年化",
  invalid: "本金须 >0，税率 0–100%。",
  disclaimer: "简化模型（税作用于年度收益，无级距/抵扣/资本利得区分），非税务建议。",
  linkTaxLoss: "税务亏损",
  linkCompound: "复利",
  linkRealReturn: "实际回报",
  bandLabels: { none: "无拖累", low: "低 <5%", moderate: "中 5–15%", high: "高 ≥15%" },
  presetLabels: { noTax: "免税", lowTax: "低税 5%", midTax: "中税 15%", highTax: "高税 30%", longRun: "长周期 30Y" },
};
const en = {
  title: "After-tax Compounding / Tax Drag",
  subtitle: "After-tax rate = r·(1−t); tax drag = (nominal − after-tax)/nominal. Educational.",
  rateLabel: "Nominal annual %",
  taxRateLabel: "Tax rate %",
  yearsLabel: "Years",
  aftLabel: "After-tax future value",
  nomLabel: "Nominal future value",
  dragLabel: "Tax drag",
  atrLabel: "After-tax annual",
  invalid: "Principal must be > 0, tax rate 0–100%.",
  disclaimer: "Simplified model (tax on yearly gains; no brackets/deductions/capital-gains split). Not tax advice.",
  linkTaxLoss: "Tax-Loss",
  linkCompound: "Compound",
  linkRealReturn: "Real Return",
  bandLabels: { none: "None", low: "Low <5%", moderate: "Moderate 5–15%", high: "High ≥15%" },
  presetLabels: { noTax: "No tax", lowTax: "Low 5%", midTax: "Mid 15%", highTax: "High 30%", longRun: "Long 30Y" },
};

