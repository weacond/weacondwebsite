"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { probReturnSummary, PROB_RETURN_PRESETS } from "../lib/probReturn";
export const metadata = {
  title: "概率加权期望回报 — Weacond",
  description: "E[X]=Σ(p_i×x_i)；方差；标准差；变异系数。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
function fmtNum(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(3);
}
export default function ProbReturnPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [p1, setP1] = useState(60);
  const [x1, setX1] = useState(1);
  const [p2, setP2] = useState(40);
  const [x2, setX2] = useState(-1);
  const res = useMemo(
    () => probReturnSummary({ probs: [p1 / 100, p2 / 100], outcomes: [x1, x2] }),
    [p1, p2, x1, x2],
  );
  const applyPreset = (p) => {
    setP1(p.probs[0] * 100);
    setP2(p.probs[1] * 100);
    setX1(p.outcomes[0]);
    setX2(p.outcomes[1]);
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
            {Object.values(PROB_RETURN_PRESETS).filter(p => p.probs.length === 2).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.p1Label}</span>
              <input type="number" value={p1} min={0} max={100} step={1}
                onChange={(e) => setP1(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.x1Label}</span>
              <input type="number" value={x1} min={-100} max={100} step={0.1}
                onChange={(e) => setX1(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.p2Label}</span>
              <input type="number" value={p2} min={0} max={100} step={1}
                onChange={(e) => setP2(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.x2Label}</span>
              <input type="number" value={x2} min={-100} max={100} step={0.1}
                onChange={(e) => setX2(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.expectedLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtNum(res.expected)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.varLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{fmtNum(res.variance)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.sdLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{fmtNum(res.stdDev)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.cvLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{fmtNum(res.cv)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/expectancy" className="text-indigo-500 hover:underline">→ {L.linkExp}</Link>
            {" · "}
            <Link href="/risk-ruin" className="text-indigo-500 hover:underline">→ {L.linkRuin}</Link>
            {" · "}
            <Link href="/kelly" className="text-indigo-500 hover:underline">→ {L.linkKelly}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
const zh = {
  title: "概率加权期望回报",
  subtitle: "E[X]=Σ(p_i×x_i)；方差；标准差；变异系数。教育性参考。",
  p1Label: "结果 1 概率 %",
  x1Label: "结果 1 回报",
  p2Label: "结果 2 概率 %",
  x2Label: "结果 2 回报",
  expectedLabel: "期望回报",
  varLabel: "方差",
  sdLabel: "标准差",
  cvLabel: "变异系数",
  invalid: "概率和须为 100%。",
  disclaimer: "简化模型（二元结果），非投资建议。",
  linkExp: "期望值",
  linkRuin: "破产概率",
  linkKelly: "凯利",
  bandLabels: { negative: "负期望", low: "低 0–2%", moderate: "中 2–5%", good: "良 5–10%", excellent: "优 ≥10%" },
  presetLabels: { binary: "二元 60/40", skewed: "偏斜", },
};
const en = {
  title: "Probability-Weighted Return",
  subtitle: "E[X]=Σ(p_i×x_i); variance; std dev; CV. Educational.",
  p1Label: "Outcome 1 prob %",
  x1Label: "Outcome 1 return",
  p2Label: "Outcome 2 prob %",
  x2Label: "Outcome 2 return",
  expectedLabel: "Expected return",
  varLabel: "Variance",
  sdLabel: "Std dev",
  cvLabel: "CV",
  invalid: "Probabilities must sum to 100%.",
  disclaimer: "Simplified model (binary). Not investment advice.",
  linkExp: "Expectancy",
  linkRuin: "Risk of Ruin",
  linkKelly: "Kelly",
  bandLabels: { negative: "Negative", low: "Low 0–2%", moderate: "Mod 2–5%", good: "Good 5–10%", excellent: "Excellent ≥10%" },
  presetLabels: { binary: "Binary 60/40", skewed: "Skewed", },
};
