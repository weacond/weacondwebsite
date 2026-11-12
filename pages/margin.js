"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  marginSummary, MARGIN_PRESETS,
} from "../lib/margin";

export const metadata = {
  title: "杠杆融资成本 / 保证金利息计算器 — Weacond",
  description: "融资成本=借入·利率·(天/365)，占本金比=成本/本金。教育性参考，非融资建议。",
  robots: { index: true, follow: true },
};

function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}

export default function MarginPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [principal, setPrincipal] = useState(10000);
  const [leverage, setLeverage] = useState(2);
  const [annualInterest, setAnnualInterest] = useState(8); // 百分比
  const [days, setDays] = useState(30);

  const res = useMemo(
    () => marginSummary({ principal, leverage, annualInterest: annualInterest / 100, days }),
    [principal, leverage, annualInterest, days],
  );

  const applyPreset = (p) => {
    setPrincipal(p.principal);
    setLeverage(p.leverage);
    setAnnualInterest(p.annualInterest * 100);
    setDays(p.days);
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
            {Object.values(MARGIN_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.principalLabel}</span>
              <input type="number" value={principal} min={1} step={1000}
                onChange={(e) => setPrincipal(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.leverageLabel}</span>
              <input type="number" value={leverage} min={1} max={100} step={0.5}
                onChange={(e) => setLeverage(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.interestLabel}</span>
              <input type="number" value={annualInterest} min={0} max={30} step={0.1}
                onChange={(e) => setAnnualInterest(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.daysLabel}</span>
              <input type="number" value={days} min={0} max={365} step={1}
                onChange={(e) => setDays(Math.max(0, Math.min(365, Math.floor(parseFloat(e.target.value) || 0))))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.costLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtMoney(res.financingCost)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.borrowedLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.borrowed)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.posLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.positionValue)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.ratioLabel}</div>
                  <div className="text-xl font-bold text-rose-600">{(res.costRatio * 100).toFixed(3)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.leverageLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{leverage}×</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/leverage" className="text-indigo-500 hover:underline">→ {L.linkLeverage}</Link>
            {" · "}
            <Link href="/r-multiple" className="text-indigo-500 hover:underline">→ {L.linkRMultiple}</Link>
            {" · "}
            <Link href="/risk-ruin" className="text-indigo-500 hover:underline">→ {L.linkRiskRuin}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "杠杆融资成本 / 保证金利息",
  subtitle: "融资成本 = 借入·利率·(天/365)；占本金比 = 成本/本金。教育性参考。",
  principalLabel: "本金",
  leverageLabel: "杠杆倍数",
  interestLabel: "年利率 %",
  daysLabel: "持有天数",
  costLabel: "融资成本",
  borrowedLabel: "借入金额",
  posLabel: "头寸价值",
  ratioLabel: "占本金比",
  invalid: "本金须 ≥1，杠杆 ≥1，利率/天数 ≥0。",
  disclaimer: "简化模型（单利、365 天计息、无隔夜/分级利率），非融资/投资建议。",
  linkLeverage: "杠杆",
  linkRMultiple: "R 倍数",
  linkRiskRuin: "破产风险",
  bandLabels: { none: "无融资", low: "低 <1%", moderate: "中 1–5%", high: "高 ≥5%" },
  presetLabels: { noLev: "无杠杆", dayTrade: "日内", swing: "波段", long: "长期持有", highLev: "高杠杆" },
};
const en = {
  title: "Leverage Financing / Margin Interest",
  subtitle: "Financing cost = borrowed·rate·(days/365); cost ratio = cost/principal. Educational.",
  principalLabel: "Principal",
  leverageLabel: "Leverage",
  interestLabel: "Annual rate %",
  daysLabel: "Days held",
  costLabel: "Financing cost",
  borrowedLabel: "Borrowed",
  posLabel: "Position value",
  ratioLabel: "Cost / principal",
  invalid: "Principal ≥ 1, leverage ≥ 1, rate/days ≥ 0.",
  disclaimer: "Simplified (simple interest, 365-day, no overnight/tiered rates). Not financing/investment advice.",
  linkLeverage: "Leverage",
  linkRMultiple: "R-Multiple",
  linkRiskRuin: "Risk of Ruin",
  bandLabels: { none: "No financing", low: "Low <1%", moderate: "Moderate 1–5%", high: "High ≥5%" },
  presetLabels: { noLev: "No leverage", dayTrade: "Day trade", swing: "Swing", long: "Long hold", highLev: "High leverage" },
};

