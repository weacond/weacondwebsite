"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import Link from "next/link";
import { kellySummary, KELLY_PRESETS } from "../lib/kelly";
export const metadata = {
  title: "凯利公式 — Weacond",
  description: "f*=p−q/b；几何增长率；分数凯利。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}
export default function KellyPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [pct, setPct] = useState(60);
  const [odds, setOdds] = useState(1);
  const res = useMemo(() => kellySummary({ winRate: pct / 100, odds }), [pct, odds]);
  const applyPreset = (p) => {
    setPct(p.winRate * 100); setOdds(p.odds);
  };
  const band = res.band;
  const bandColor =
    band === "aggressive" ? "text-rose-600" :
    band === "high" ? "text-amber-600" :
    band === "moderate" ? "text-indigo-600" :
    band === "low" ? "text-emerald-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="kelly" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(KELLY_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.pLabel}</span>
              <input type="number" value={pct} min={0} max={100} step={1}
                onChange={(e) => setPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.bLabel}</span>
              <input type="number" value={odds} min={0.1} step={0.1}
                onChange={(e) => setOdds(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.fStarLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtPct(res.fStar)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.halfLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{fmtPct(res.half)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.quarterLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{fmtPct(res.quarter)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.expLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{fmtPct(res.expectation)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.growthLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{fmtPct(res.growth)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/risk-ruin" className="text-indigo-500 hover:underline">→ {L.linkRuin}</Link>
            {" · "}
            <Link href="/position-size" className="text-indigo-500 hover:underline">→ {L.linkPos}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
const zh = {
  title: "凯利公式",
  subtitle: "f*=p−q/b；几何增长率；分数凯利。教育性参考。",
  pLabel: "胜率 %",
  bLabel: "净赔率 b",
  fStarLabel: "最优仓位 f*",
  halfLabel: "半凯利",
  quarterLabel: "四分之一凯利",
  expLabel: "每单位期望",
  growthLabel: "几何增长率",
  invalid: "输入无效。",
  disclaimer: "Kelly 假设无限重复、已知真实概率，现实会高估，建议用分数 Kelly。非投资建议。",
  linkRuin: "破产概率",
  linkPos: "头寸规模",
  bandLabels: { none: "不下注", low: "低 0–5%", moderate: "中 5–15%", high: "高 15–30%", aggressive: "激进 ≥30%" },
  presetLabels: { coinFlip: "公平投币", edge10: "10% 优势", highWin: "高胜率", highOdds: "高赔率", negative: "负期望" },
};
const en = {
  title: "Kelly Criterion",
  subtitle: "f*=p−q/b; growth rate; fractional Kelly. Educational.",
  pLabel: "Win rate %",
  bLabel: "Net odds b",
  fStarLabel: "Optimal f*",
  halfLabel: "Half Kelly",
  quarterLabel: "Quarter Kelly",
  expLabel: "Exp/unit",
  growthLabel: "Growth rate",
  invalid: "Invalid input.",
  disclaimer: "Kelly assumes infinite repeats & known probabilities. Use fractional Kelly. Not investment advice.",
  linkRuin: "Risk of Ruin",
  linkPos: "Position Size",
  bandLabels: { none: "No bet", low: "Low 0–5%", moderate: "Mod 5–15%", high: "High 15–30%", aggressive: "Aggr ≥30%" },
  presetLabels: { coinFlip: "Coin flip", edge10: "10% edge", highWin: "High win", highOdds: "High odds", negative: "Negative" },
};