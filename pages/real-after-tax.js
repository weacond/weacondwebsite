"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { realAfterTaxSummary, REAL_AFTER_TAX_PRESETS } from "../lib/realAfterTax";
export const metadata = {
  title: "税后实际复利计算器 — Weacond",
  description: "FV_real = PV×(1+r)^n×(1−tax)/(1+inflation)^n；税后实际年化；总损耗。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(1) + "%";
}
export default function RealAfterTaxPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [pv, setPv] = useState(100000);
  const [rate, setRate] = useState(8);
  const [taxRate, setTaxRate] = useState(15);
  const [inflation, setInflation] = useState(3);
  const [years, setYears] = useState(20);
  const res = useMemo(
    () => realAfterTaxSummary({ pv, rate: rate / 100, taxRate: taxRate / 100, inflation: inflation / 100, years }),
    [pv, rate, taxRate, inflation, years],
  );
  const applyPreset = (p) => {
    setPv(p.pv);
    setRate(p.rate * 100);
    setTaxRate(p.taxRate * 100);
    setInflation(p.inflation * 100);
    setYears(p.years);
  };
  const band = res.band;
  const bandColor =
    band === "excellent" ? "text-emerald-600" :
    band === "good" ? "text-indigo-600" :
    band === "moderate" ? "text-amber-600" :
    "text-rose-600";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(REAL_AFTER_TAX_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.pvLabel}</span>
              <input type="number" value={pv} min={0} step={10000}
                onChange={(e) => setPv(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateLabel}</span>
              <input type="number" value={rate} min={0} max={30} step={0.1}
                onChange={(e) => setRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.taxLabel}</span>
              <input type="number" value={taxRate} min={0} max={50} step={1}
                onChange={(e) => setTaxRate(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.inflLabel}</span>
              <input type="number" value={inflation} min={0} max={20} step={0.1}
                onChange={(e) => setInflation(Math.max(0, parseFloat(e.target.value) || 0))}
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
                <div className="text-xs text-slate-400 mb-1">{L.realFVLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtMoney(res.realFV)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.nomFVLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{fmtMoney(res.nominalFV)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.atFVLabel}</div>
                  <div className="text-sm font-bold text-amber-600">{fmtMoney(res.afterTaxFV)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.dragLabel}</div>
                  <div className="text-sm font-bold text-rose-600">{fmtPct(res.totalDrag)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.realRateLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{fmtPct(res.afterTaxRealRate)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.pvLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.pv)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/real-return" className="text-indigo-500 hover:underline">→ {L.linkReal}</Link>
            {" · "}
            <Link href="/tax-drag" className="text-indigo-500 hover:underline">→ {L.linkTax}</Link>
            {" · "}
            <Link href="/compound" className="text-indigo-500 hover:underline">→ {L.linkCompound}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
const zh = {
  title: "税后实际复利",
  subtitle: "FV_real=PV×(1+r)^n×(1−tax)/(1+infl)^n；税后实际年化；总损耗。教育性参考。",
  pvLabel: "本金",
  rateLabel: "名义年化 %",
  taxLabel: "税率 %",
  inflLabel: "通胀 %",
  yearsLabel: "年数",
  realFVLabel: "实际终值（购买力）",
  nomFVLabel: "名义终值",
  atFVLabel: "税后终值",
  dragLabel: "总损耗",
  realRateLabel: "税后实际年化",
  invalid: "本金须 >0，年数 ≥1。",
  disclaimer: "简化模型（假设税率/通胀恒定），非投资建议。",
  linkReal: "实际回报",
  linkTax: "税收拖累",
  linkCompound: "复利",
  bandLabels: { negative: "负收益", low: "低 0–2%", moderate: "中 2–4%", good: "良 4–6%", excellent: "优 ≥6%" },
  presetLabels: { standard: "标准 8%/15%/3%", highTax: "高税 30%", highInfl: "高通胀 6%", taxFree: "免税", shortTerm: "短期 5Y" },
};
const en = {
  title: "Real After-Tax Compound",
  subtitle: "FV_real=PV×(1+r)^n×(1−tax)/(1+infl)^n; after-tax real rate; total drag. Educational.",
  pvLabel: "Principal",
  rateLabel: "Nominal rate %",
  taxLabel: "Tax rate %",
  inflLabel: "Inflation %",
  yearsLabel: "Years",
  realFVLabel: "Real FV (purchasing power)",
  nomFVLabel: "Nominal FV",
  atFVLabel: "After-tax FV",
  dragLabel: "Total drag",
  realRateLabel: "After-tax real rate",
  invalid: "Principal > 0, years ≥ 1.",
  disclaimer: "Simplified model (constant tax/inflation). Not investment advice.",
  linkReal: "Real Return",
  linkTax: "Tax Drag",
  linkCompound: "Compound",
  bandLabels: { negative: "Negative", low: "Low 0–2%", moderate: "Mod 2–4%", good: "Good 4–6%", excellent: "Excellent ≥6%" },
  presetLabels: { standard: "Std 8%/15%/3%", highTax: "High tax 30%", highInfl: "High infl 6%", taxFree: "Tax-free", shortTerm: "Short 5Y" },
};
