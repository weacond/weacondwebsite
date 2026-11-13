"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import Link from "next/link";
import {
  dripSummary, DRIP_PRESETS,
} from "../lib/drip";
export const metadata = {
  title: "红利再投资 / 总收入计算器 — Weacond",
  description: "第t年红利=P·y·(1+g)^(t−1)，累计红利，收入倍数。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}
export default function DripPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [principal, setPrincipal] = useState(10000);
  const [yieldRate, setYieldRate] = useState(4); // 百分比
  const [growthRate, setGrowthRate] = useState(5); // 百分比
  const [years, setYears] = useState(10);
  const res = useMemo(
    () => dripSummary({ principal, yieldRate: yieldRate / 100, growthRate: growthRate / 100, years }),
    [principal, yieldRate, growthRate, years],
  );
  const applyPreset = (p) => {
    setPrincipal(p.principal);
    setYieldRate(p.yieldRate * 100);
    setGrowthRate(p.growthRate * 100);
    setYears(p.years);
  };
  const band = res.band;
  const bandColor =
    band === "high" ? "text-emerald-600" :
    band === "moderate" ? "text-amber-600" :
    band === "low" ? "text-indigo-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="drip" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(DRIP_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.principalLabel}</span>
              <input type="number" value={principal} min={0} step={1000}
                onChange={(e) => setPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yieldLabel}</span>
              <input type="number" value={yieldRate} min={0} max={20} step={0.1}
                onChange={(e) => setYieldRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.growthLabel}</span>
              <input type="number" value={growthRate} min={0} max={20} step={0.1}
                onChange={(e) => setGrowthRate(Math.max(0, parseFloat(e.target.value) || 0))}
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
                <div className="text-xs text-slate-400 mb-1">{L.totalLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtMoney(res.totalDividends)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.firstLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.firstYearDividend)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.lastLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.finalYearDividend)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.multLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{res.incomeMultiplier.toFixed(2)}×</div>
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
            <Link href="/fair-value" className="text-indigo-500 hover:underline">→ {L.linkFairValue}</Link>
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
  title: "红利再投资 / 总收入",
  subtitle: "第 t 年红利 = P·y·(1+g)^(t−1)；累计红利；收入倍数。教育性参考。",
  principalLabel: "本金",
  yieldLabel: "年化红利 %",
  growthLabel: "红利增长 %",
  yearsLabel: "年数",
  totalLabel: "累计红利",
  firstLabel: "首年红利",
  lastLabel: "末年红利",
  multLabel: "收入倍数",
  yearUnit: "年",
  invalid: "本金须 >0，年数 ≥1，增长率 >−1。",
  disclaimer: "简化模型（假设红利逐年复投、无税、股价不变），非投资建议。",
  linkCompound: "复利",
  linkFairValue: "公允价值",
  linkTaxDrag: "税后复利",
  bandLabels: { none: "无", low: "低 <0.5×", moderate: "中 0.5–1×", high: "高 ≥1×" },
  presetLabels: { modest: "稳健红利", highGrowth: "高增长", value: "价值股", aggressive: "长期激进", conservative: "保守 30Y" },
};
const en = {
  title: "Dividend Reinvestment / Total Income",
  subtitle: "Year-t dividend = P·y·(1+g)^(t−1); cumulative dividends; income multiplier. Educational.",
  principalLabel: "Principal",
  yieldLabel: "Annual yield %",
  growthLabel: "Dividend growth %",
  yearsLabel: "Years",
  totalLabel: "Total dividends",
  firstLabel: "Year 1 dividend",
  lastLabel: "Final year dividend",
  multLabel: "Income multiplier",
  yearUnit: "yr",
  invalid: "Principal > 0, years ≥ 1, growth > −1.",
  disclaimer: "Simplified model (dividends reinvested, tax-free, price unchanged). Not investment advice.",
  linkCompound: "Compound",
  linkFairValue: "Fair Value",
  linkTaxDrag: "Tax Drag",
  bandLabels: { none: "None", low: "Low <0.5×", moderate: "Mod 0.5–1×", high: "High ≥1×" },
  presetLabels: { modest: "Modest", highGrowth: "High Growth", value: "Value", aggressive: "Aggressive", conservative: "Conservative 30Y" },
};
