"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  barrierSummary, BARRIER_PRESETS,
} from "../lib/barrier";

export const metadata = {
  title: "双屏障命中概率计算器 — Weacond",
  description: "先触及目标还是先触及止损？经典两屏障模型：P(先触目标)=b/(a+b)。教育性参考。",
  robots: { index: true, follow: true },
};

export default function BarrierPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [target, setTarget] = useState(1);
  const [stop, setStop] = useState(1);
  const [drift, setDrift] = useState(0);

  const res = useMemo(
    () => barrierSummary({ target, stop, drift }),
    [target, stop, drift],
  );

  const applyPreset = (p) => {
    setTarget(p.target);
    setStop(p.stop);
    setDrift(p.drift);
  };

  const band = res.band;
  const bandColor =
    band === "favorable" ? "text-emerald-600" :
    band === "unfavorable" ? "text-red-600" : "text-amber-600";

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
            {Object.values(BARRIER_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.targetLabel}</span>
              <input type="number" value={target} min={0} step={0.1}
                onChange={(e) => setTarget(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.stopLabel}</span>
              <input type="number" value={stop} min={0} step={0.1}
                onChange={(e) => setStop(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.driftLabel}</span>
              <input type="number" value={drift} step={0.001}
                onChange={(e) => setDrift(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.pTargetLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{(res.pTarget * 100).toFixed(1)}%</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.pStopLabel}</div>
                  <div className="text-xl font-bold text-red-600">{(res.pStop * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.ratioLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.pStop > 0 ? (res.pTarget / res.pStop).toFixed(2) : "∞"} : 1</div>
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
            <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
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
  title: "双屏障命中概率计算器",
  subtitle: "先触及目标还是先触及止损？经典两屏障模型：P(先触目标) = b / (a+b)。",
  targetLabel: "到目标距离 a",
  stopLabel: "到止损距离 b",
  driftLabel: "每步漂移 λ",
  pTargetLabel: "先触及目标概率",
  pStopLabel: "先触及止损概率",
  ratioLabel: "目标/止损概率比",
  invalid: "目标距离与止损距离须 >0。",
  disclaimer: "两屏障模型为理想随机游走，未计波动/滑点，不构成投资建议。",
  linkRuin: "破产概率",
  linkRisk: "风险度量",
  linkR: "R 倍数",
  bandLabels: { favorable: "有利 ≥60%", neutral: "中性 40–60%", unfavorable: "不利 <40%", na: "无数据" },
  presetLabels: { even: "等距", tightStop: "近止损", wideStop: "远止损", driftUp: "正向漂移" },
};
const en = {
  title: "Two-barrier Hit Probability",
  subtitle: "Target first or stop first? Classic two-barrier model: P(target first) = b / (a + b).",
  targetLabel: "Distance to target a",
  stopLabel: "Distance to stop b",
  driftLabel: "Drift per step λ",
  pTargetLabel: "P(target first)",
  pStopLabel: "P(stop first)",
  ratioLabel: "Target / Stop odds",
  invalid: "Both distances must be > 0.",
  disclaimer: "Ideal random-walk model; excludes volatility/slippage. Not investment advice.",
  linkRuin: "Risk of Ruin",
  linkRisk: "Risk metrics",
  linkR: "R-Multiple",
  bandLabels: { favorable: "Favorable ≥60%", neutral: "Neutral 40–60%", unfavorable: "Unfavorable <40%", na: "No data" },
  presetLabels: { even: "Even", tightStop: "Tight stop", wideStop: "Wide stop", driftUp: "Positive drift" },
};
