"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import { earSummary, EAR_PRESETS } from "../lib/ear";
export const metadata = {
  title: "有效年利率 EAR / APY — Weacond",
  description: "EAR=(1+r/m)^m−1；连续有效利率 e^r−1；复利频率差。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "有效年利率 EAR / APY 计算器",
  subtitle: "EAR=(1+r/m)^m−1；连续有效利率=e^r−1；复利频率差=连续−EAR。教育性参考，非投资建议。",
  rateLabel: "名义年化 %", periodsLabel: "每年复利次数",
  presetLabels: { annual: "按年 12%", semiannual: "半年 12%", quarterly: "按季 12%", monthly: "按月 6%", daily: "按日 8%" },
  resultTitle: "结果", earLabel: "有效年利率 EAR", contLabel: "连续有效利率",
  gapLabel: "复利频率差", bandLabel: "有效利率等级",
  bandText: { none: "无", low: "低", moderate: "中", high: "高", "very-high": "极高", invalid: "无效" },
  howToTitle: "如何使用有效年利率 EAR / APY 计算器",
  howTo: [
    "输入名义年化利率（%）与每年复利次数 m（如 12 表示按月复利）。",
    "读取有效年利率 EAR = (1+r/m)^m − 1：把每年复利 m 次折算成单一有效年化。",
    "读取连续有效利率 e^r − 1：m 越大，EAR 越接近该连续复利上限。",
    "读取复利频率差 = 连续 − EAR：衡量「按 m 次复利」与「连续复利」之间的差距。",
  ],
  learnTitle: "学习",
  learn: "名义利率不等于你实际拿到的年化。EAR=(1+r/m)^m−1 把每年复利 m 次折算成单一有效年化；m 越大 EAR 越接近连续复利 e^r−1。复利频率差衡量「按 m 次复利」与「连续复利」之间的差距。",
};
const en = {
  title: "Effective Annual Rate EAR / APY",
  subtitle: "EAR=(1+r/m)^m−1; continuous = e^r−1; gap = continuous − EAR. Educational, not investment advice.",
  rateLabel: "Nominal Rate %", periodsLabel: "Compounding / year",
  presetLabels: { annual: "Annual 12%", semiannual: "Semi 12%", quarterly: "Quarter 12%", monthly: "Monthly 6%", daily: "Daily 8%" },
  resultTitle: "Results", earLabel: "EAR", contLabel: "Continuous EAR",
  gapLabel: "Compounding Gap", bandLabel: "Rate Level",
  bandText: { none: "None", low: "Low", moderate: "Moderate", high: "High", "very-high": "Very high", invalid: "Invalid" },
  howToTitle: "How to use the EAR / APY calculator",
  howTo: [
    "Enter the nominal annual rate (%) and the compounding frequency m per year (e.g. 12 = monthly).",
    "Read the effective annual rate EAR = (1+r/m)^m − 1: it folds m compounds/year into one effective annual rate.",
    "Read the continuous effective rate e^r − 1: as m grows, EAR approaches this continuous-compounding limit.",
    "Read the compounding gap = continuous − EAR: how far 'm-compound' sits from continuous compounding.",
  ],
  learnTitle: "Learn",
  learn: "A nominal rate isn't the return you actually earn. EAR=(1+r/m)^m−1 folds m compounds/year into one effective annual rate; larger m pushes EAR toward the continuous limit e^r−1. The gap measures how far 'm-compound' sits from continuous compounding.",
};
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(3) + "%";
}
export default function EarPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [rate, setRate] = useState(12);
  const [periods, setPeriods] = useState(12);
  const res = useMemo(
    () => earSummary({ nominal: rate / 100, periods }),
    [rate, periods],
  );
  const applyPreset = (p) => {
    setRate(p.nominal * 100); setPeriods(p.periods);
  };
  const band = res.band || "invalid";
  const bandColor =
    band === "low" ? "text-emerald-600" :
    band === "moderate" ? "text-indigo-600" :
    band === "high" ? "text-amber-600" :
    band === "very-high" ? "text-rose-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="ear" />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/ear"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "EAR / APY", href: "/ear" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(EAR_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels[p.id] || p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateLabel}</span>
              <input type="number" value={rate} step={0.1}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.periodsLabel}</span>
              <input type="number" value={periods} min={1} step={1}
                onChange={(e) => setPeriods(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.resultTitle}</h2>
            {res.valid ? (
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-400">{L.earLabel}</div><div className="font-mono text-lg">{fmtPct(res.ear)}</div></div>
                <div><div className="text-xs text-slate-400">{L.contLabel}</div><div className="font-mono text-lg">{fmtPct(res.continuousEar)}</div></div>
                <div><div className="text-xs text-slate-400">{L.gapLabel}</div><div className="font-mono text-lg">{fmtPct(res.gap)}</div></div>
                <div>
                  <div className="text-xs text-slate-400">{L.bandLabel}</div>
                  <div className={`font-semibold ${bandColor}`}>{L.bandText[band] || band}</div>
                </div>
              </div>
            ) : <p className="text-slate-400 text-sm">{L.subtitle}</p>}
          </div>
          <div className="bg-indigo-50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-indigo-900 mb-2">{L.learnTitle}</h2>
            <p className="text-sm text-indigo-800 leading-relaxed">{L.learn}</p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}