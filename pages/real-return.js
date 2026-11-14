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
  realReturnSummary, REAL_PRESETS,
} from "../lib/realReturn";

export const metadata = {
  title: "实际回报（剔除通胀）计算器 — Weacond",
  description: "Fisher 方程：实际年化=(1+名义)/(1+通胀)−1；Bogle 魔数；购买力衰减。教育性参考。",
  robots: { index: true, follow: true },
};

function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}

export default function RealReturnPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [nominal, setNominal] = useState(8); // 百分比
  const [inflation, setInflation] = useState(2); // 百分比
  const [years, setYears] = useState(20);
  const [principal, setPrincipal] = useState(10000);

  const res = useMemo(
    () => realReturnSummary({
      nominal: nominal / 100,
      inflation: inflation / 100,
      years,
      principal,
    }),
    [nominal, inflation, years, principal],
  );

  const applyPreset = (p) => {
    setNominal(p.nominal * 100);
    setInflation(p.inflation * 100);
    setYears(p.years);
    setPrincipal(p.principal);
  };

  const band = res.band;
  const bandColor =
    band === "good" ? "text-emerald-600" :
    band === "low" ? "text-amber-600" :
    band === "losing" ? "text-red-600" : "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="real-return" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/real-return"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Real Return (Inflation-Adjusted)", href: "/real-return" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(REAL_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.nominalLabel}</span>
              <input type="number" value={nominal} min={0} step={0.5}
                onChange={(e) => setNominal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.inflationLabel}</span>
              <input type="number" value={inflation} min={0} step={0.5}
                onChange={(e) => setInflation(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={0} max={60} step={1}
                onChange={(e) => setYears(Math.max(0, Math.min(60, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.principalLabel}</span>
              <input type="number" value={principal} min={0} step={1000}
                onChange={(e) => setPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.realLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{(res.real * 100).toFixed(1)}%</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.magicLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{res.magic.toFixed(2)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.ppLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{(res.purchasingPower * 100).toFixed(1)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.futureNominalLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.futureNominal)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.futureRealLabel}</div>
                  <div className={`text-xl font-bold ${res.futureReal < res.futureNominal ? "text-amber-600" : "text-emerald-600"}`}>{fmtMoney(res.futureReal)}</div>
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
            <Link href="/xirr" className="text-indigo-500 hover:underline">→ {L.linkXirr}</Link>
            {" · "}
            <Link href="/r-multiple" className="text-indigo-500 hover:underline">→ {L.linkR}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "实际回报（剔除通胀）计算器",
  subtitle: "Fisher 方程：实际年化 =（1+名义）/（1+通胀）−1；Bogle 魔数；购买力衰减。",
  howToTitle: "如何使用实际回报（剔除通胀）计算器",
  howTo: [
    "输入名义年化收益%与通胀率%。",
    "计算器按 Fisher 方程算实际年化 =（1+名义）/（1+通胀）−1。",
    "查看 Bogle 魔数与购买力衰减，评估真实购买力增长。",
  ],
  nominalLabel: "名义年化 %",
  inflationLabel: "通胀率 %",
  yearsLabel: "年数",
  principalLabel: "本金",
  realLabel: "实际年化回报",
  magicLabel: "Bogle 魔数",
  ppLabel: "购买力保留",
  futureNominalLabel: "未来名义价值",
  futureRealLabel: "未来实际价值",
  invalid: "通胀率须 >−100%。",
  disclaimer: "Fisher 方程为近似，未计税收/费用，不构成投资建议。",
  linkCompound: "复利",
  linkXirr: "XIRR",
  linkR: "R 倍数",
  bandLabels: { good: "良好 ≥3%", low: "偏低 0–3%", losing: "负收益 <0%", na: "无数据" },
  presetLabels: { lowInflation: "低通胀", highInflation: "高通胀", bogle: "Bogle 魔数", erode: "通胀侵蚀" },
};
const en = {
  title: "Real Return (Inflation-Adjusted)",
  subtitle: "Fisher: real = (1+nominal)/(1+inflation) − 1; Bogle magic number; purchasing-power decay.",
  howToTitle: "How to use the real (inflation-adjusted) return calculator",
  howTo: [
    "Enter the nominal annual return % and the inflation rate %.",
    "The calculator applies Fisher: real = (1+nominal)/(1+inflation) − 1.",
    "Read the Bogle magic number and purchasing-power decay to gauge real growth.",
  ],
  nominalLabel: "Nominal annual %",
  inflationLabel: "Inflation %",
  yearsLabel: "Years",
  principalLabel: "Principal",
  realLabel: "Real annual return",
  magicLabel: "Bogle magic #",
  ppLabel: "Purchasing power kept",
  futureNominalLabel: "Future nominal value",
  futureRealLabel: "Future real value",
  invalid: "Inflation must be > −100%.",
  disclaimer: "Fisher equation is approximate; excludes tax/fees. Not investment advice.",
  linkCompound: "Compound",
  linkXirr: "XIRR",
  linkR: "R-Multiple",
  bandLabels: { good: "Good ≥3%", low: "Low 0–3%", losing: "Negative <0%", na: "No data" },
  presetLabels: { lowInflation: "Low inflation", highInflation: "High inflation", bogle: "Bogle #", erode: "Eroded" },
};
