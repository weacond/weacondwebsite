"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  ruinSummary, RUIN_PRESETS,
} from "../lib/ruin";

export const metadata = {
  title: "破产概率（Risk of Ruin）计算器 — Weacond",
  description: "由胜率、盈亏比与本金（R 单位）估算破产概率：P=（(q/w)·(1/rr)）^B。教育性参考。",
  robots: { index: true, follow: true },
};

export default function RuinPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [winRate, setWinRate] = useState(55);
  const [rr, setRr] = useState(2);
  const [bankrollR, setBankrollR] = useState(10);

  const res = useMemo(
    () => ruinSummary({ winRate, rr, bankrollR }),
    [winRate, rr, bankrollR],
  );

  const applyPreset = (p) => {
    setWinRate(p.winRate);
    setRr(p.rr);
    setBankrollR(p.bankrollR);
  };

  const band = res.band;
  const bandColor =
    band === "safe" ? "text-emerald-600" :
    band === "low" ? "text-emerald-600" :
    band === "elevated" ? "text-amber-600" :
    band === "high" ? "text-red-600" : "text-slate-400";

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
            {Object.values(RUIN_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.winRateLabel}</span>
              <input type="number" value={winRate} min={0} max={100} step={0.5}
                onChange={(e) => setWinRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rrLabel}</span>
              <input type="number" value={rr} min={0} step={0.1}
                onChange={(e) => setRr(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.bankrollLabel}</span>
              <input type="number" value={bankrollR} min={0} step={1}
                onChange={(e) => setBankrollR(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.pRuinLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{(res.pRuin * 100).toFixed(2)}%</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.edgeLabel}</div>
                  <div className={`text-xl font-bold ${res.edge > 0 ? "text-emerald-600" : "text-red-600"}`}>{res.edge >= 0 ? "+" : ""}{res.edge.toFixed(3)} R</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.ratioLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{Number.isFinite(res.ratio) ? res.ratio.toFixed(3) : "∞"}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/r-multiple" className="text-indigo-500 hover:underline">→ {L.linkR}</Link>
            {" · "}
            <Link href="/breakeven" className="text-indigo-500 hover:underline">→ {L.linkBreakeven}</Link>
            {" · "}
            <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "破产概率（Risk of Ruin）计算器",
  subtitle: "由胜率、盈亏比与本金（R 单位）估算破产概率：P =（(q/w)·(1/rr)）^B。",
  winRateLabel: "胜率 %",
  rrLabel: "盈亏比 R:R",
  bankrollLabel: "本金（R 单位）",
  pRuinLabel: "破产概率",
  edgeLabel: "单笔期望（R）",
  ratioLabel: "风险比率 (q/w)·(1/rr)",
  invalid: "胜率须 0–100%，盈亏比 ≥0，本金 >0。",
  disclaimer: "破产概率为等比例下注的经典模型，未计波动/资金费，不构成投资建议。",
  linkR: "R 倍数",
  linkBreakeven: "盈亏平衡",
  linkRisk: "风险度量",
  bandLabels: { safe: "安全 ≤1%", low: "较低 ≤10%", elevated: "偏高 ≤50%", high: "很高 >50%", na: "无数据" },
  presetLabels: { edge: "有优势", breakeven: "盈亏平衡", highWinLowRr: "高胜率低赔率", noEdge: "无优势" },
};
const en = {
  title: "Risk of Ruin",
  subtitle: "Estimate the probability of ruin from win rate, R:R, and bankroll (in R units): P = ((q/w)·(1/rr))^B.",
  winRateLabel: "Win rate %",
  rrLabel: "R : R",
  bankrollLabel: "Bankroll (R units)",
  pRuinLabel: "Probability of ruin",
  edgeLabel: "Edge / trade (R)",
  ratioLabel: "Ratio (q/w)·(1/rr)",
  invalid: "Win rate must be 0–100%, R:R ≥ 0, bankroll > 0.",
  disclaimer: "Constant-fraction gambler's-ruin model; excludes volatility/funding. Not investment advice.",
  linkR: "R-Multiple",
  linkBreakeven: "Breakeven",
  linkRisk: "Risk metrics",
  bandLabels: { safe: "Safe ≤1%", low: "Low ≤10%", elevated: "Elevated ≤50%", high: "High >50%", na: "No data" },
  presetLabels: { edge: "With edge", breakeven: "Break-even", highWinLowRr: "High win / low R:R", noEdge: "No edge" },
};
