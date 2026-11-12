"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { npvSummary, NPV_PRESETS } from "../lib/npvCalc";
export const metadata = {
  title: "净现值 NPV — Weacond",
  description: "NPV=Σ CF/(1+r)^t；折现因子；永续；年金。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(0);
}
export default function NpvPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [rate, setRate] = useState(10);
  const [cf0, setCf0] = useState(-10000);
  const [cf1, setCf1] = useState(5000);
  const [cf2, setCf2] = useState(6000);
  const [cf3, setCf3] = useState(7000);
  const res = useMemo(
    () => npvSummary({ rate: rate / 100, cashflows: [cf0, cf1, cf2, cf3] }),
    [rate, cf0, cf1, cf2, cf3],
  );
  const applyPreset = (p) => {
    setRate(p.rate * 100);
    const cfs = p.cashflows;
    setCf0(cfs[0] || 0);
    setCf1(cfs[1] || 0);
    setCf2(cfs[2] || 0);
    setCf3(cfs[3] || 0);
  };
  const band = res.band;
  const bandColor =
    band === "good" ? "text-emerald-600" :
    band === "moderate" ? "text-indigo-600" :
    band === "low" ? "text-amber-600" :
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
            {Object.values(NPV_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateLabel}</span>
              <input type="number" value={rate} min={0} max={100} step={0.1}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <div className="col-span-2 text-xs text-slate-400">{L.cfLabel}</div>
            <label className="block">
              <span className="text-xs text-slate-500">CF₀ (t=0)</span>
              <input type="number" value={cf0} step={100}
                onChange={(e) => setCf0(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">CF₁ (t=1)</span>
              <input type="number" value={cf1} step={100}
                onChange={(e) => setCf1(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">CF₂ (t=2)</span>
              <input type="number" value={cf2} step={100}
                onChange={(e) => setCf2(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">CF₃ (t=3)</span>
              <input type="number" value={cf3} step={100}
                onChange={(e) => setCf3(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.npvLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtMoney(res.npv)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.pirLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{res.payoffIndex.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.dfLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{res.discountFactor1.toFixed(4)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/xirr" className="text-indigo-500 hover:underline">→ {L.linkXirr}</Link>
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
  title: "净现值 NPV",
  subtitle: "NPV=Σ CF/(1+r)^t；折现因子；永续；年金。教育性参考。",
  rateLabel: "折现率 %",
  cfLabel: "现金流（CF₀ 通常为首期流出）",
  npvLabel: "净现值 NPV",
  pirLabel: "投资回收率 PIR",
  dfLabel: "折现因子 DF₁",
  invalid: "需 ≥2 个现金流。",
  disclaimer: "简化模型（4 期），非投资建议。",
  linkXirr: "IRR",
  linkCompound: "复利",
  bandLabels: { reject: "拒绝", "break-even": "保本", low: "低", moderate: "中", good: "好" },
  presetLabels: { simple: "简单", even: "均匀", frontLoaded: "前重", backLoaded: "后重", reject: "负 NPV" },
};
const en = {
  title: "Net Present Value",
  subtitle: "NPV=Σ CF/(1+r)^t; discount factor; perpetuity; annuity. Educational.",
  rateLabel: "Discount rate %",
  cfLabel: "Cash flows (CF₀ = initial outlay)",
  npvLabel: "Net Present Value",
  pirLabel: "Profitability Index",
  dfLabel: "Discount Factor DF₁",
  invalid: "Need ≥2 cash flows.",
  disclaimer: "Simplified model (4 periods). Not investment advice.",
  linkXirr: "IRR",
  linkCompound: "Compound",
  bandLabels: { reject: "Reject", "break-even": "Break-even", low: "Low", moderate: "Moderate", good: "Good" },
  presetLabels: { simple: "Simple", even: "Even", frontLoaded: "Front", backLoaded: "Back", reject: "Neg NPV" },
};