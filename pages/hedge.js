"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { hedgeRatio, validHedge, hedgeInsight, HEDGE_PRESETS } from "../lib/hedge";

export const metadata = {
  title: "对冲比率计算器 — Weacond",
  description: "给定两资产相关 ρ 与波动，算最小方差对冲比率、残余风险与最优权重，对比 50/50。教育性参考。",
  robots: { index: true, follow: true },
};

export default function HedgePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [rho, setRho] = useState(0.5);
  const [volA, setVolA] = useState(15);
  const [volB, setVolB] = useState(10);

  const valid = validHedge({ rho, volA, volB });
  const r = useMemo(() => {
    if (!validHedge({ rho, volA, volB })) return null;
    return hedgeRatio({ rho, volA, volB });
  }, [rho, volA, volB]);

  const applyPreset = (p) => {
    setRho(p.rho);
    setVolA(p.volA);
    setVolB(p.volB);
  };

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
            {HEDGE_PRESETS.map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.rhoLabel}</span>
              <input type="number" value={rho} min={-1} max={1} step={0.05}
                onChange={(e) => setRho(Math.max(-1, Math.min(1, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.volALabel}</span>
              <input type="number" value={volA} min={0.1} step={0.5}
                onChange={(e) => setVolA(Math.max(0.1, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.volBLabel}</span>
              <input type="number" value={volB} min={0.1} step={0.5}
                onChange={(e) => setVolB(Math.max(0.1, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {!valid && <p className="text-xs text-red-500 mb-4">{L.invalid}</p>}

          {r && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.hLabel}</div>
                <div className="text-4xl font-bold text-indigo-600 mb-1">
                  {r.hedgeRatio.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">{L.hNote}</div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div>
                    <div className="text-xs text-slate-400">{L.residualVolLabel}</div>
                    <div className="text-lg font-bold text-red-600">{r.residualVol.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{L.wALabel}</div>
                    <div className="text-lg font-bold text-slate-800">{(r.wA * 100).toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{L.wBLabel}</div>
                    <div className="text-lg font-bold text-slate-800">{(r.wB * 100).toFixed(0)}%</div>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-4">{hedgeInsight(r, rho)}</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-6">
                <div className="text-xs text-slate-400 mb-2">{L.compareTitle}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-400">{L.naiveLabel}</div>
                    <div className="text-xl font-bold text-slate-700">{r.naiveVol.toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{L.minVarLabel}</div>
                    <div className="text-xl font-bold text-green-600">{r.minVol.toFixed(2)}%</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  {L.reductionNote(r.reductionPct)}
                </p>
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/correlation" className="text-indigo-500 hover:underline">→ {L.linkCorrelation}</Link>
                {" · "}
                <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
              </p>
            </>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "对冲比率计算器",
  subtitle: "给定两资产相关 ρ 与波动，算最小方差对冲比率、残余风险与最优权重，并对比 50/50。",
  rhoLabel: "相关 ρ",
  volALabel: "σ_A（%）",
  volBLabel: "σ_B（%）",
  invalid: "ρ 需在 −1~1，两波动需为正。",
  hLabel: "对冲比率 h* = ρ·σ_A/σ_B",
  hNote: "对冲 1 单位 A 所需 B 的数量",
  residualVolLabel: "残余波动",
  wALabel: "最优权重 A",
  wBLabel: "最优权重 B",
  compareTitle: "风险对比",
  naiveLabel: "朴素 50/50",
  minVarLabel: "最小方差组合",
  reductionNote: (pct) =>
    pct > 0 ? `最小方差组合较 50/50 降低波动 ${pct.toFixed(1)}%。` : `本情景下 50/50 已接近最优。`,
  disclaimer: "假设正态、线性对冲、波动稳定；真实市场存在尾部与跳空，不构成投资建议。",
  linkCorrelation: "相关性",
  linkRisk: "风险仪表盘",
  presetLabels: {
    equityBond: "股债低相关",
    goldHedge: "黄金避险",
    highCorr: "高相关",
  },
};
const en = {
  title: "Hedge Ratio Calculator",
  subtitle: "Given two assets' correlation ρ and volatilities, compute the minimum-variance hedge ratio, residual risk and optimal weights, vs a naive 50/50.",
  rhoLabel: "Correlation ρ",
  volALabel: "σ_A (%)",
  volBLabel: "σ_B (%)",
  invalid: "ρ must be in −1..1 and both vols positive.",
  hLabel: "Hedge ratio h* = ρ·σ_A/σ_B",
  hNote: "Units of B needed to hedge 1 unit of A",
  residualVolLabel: "Residual vol",
  wALabel: "Optimal wt A",
  wBLabel: "Optimal wt B",
  compareTitle: "Risk comparison",
  naiveLabel: "Naive 50/50",
  minVarLabel: "Min-variance",
  reductionNote: (pct) =>
    pct > 0 ? `Min-variance cuts vol ${pct.toFixed(1)}% vs 50/50.` : `50/50 is already near-optimal here.`,
  disclaimer: "Assumes normality, linear hedging and stable vol; real markets have tails and gaps. Not investment advice.",
  linkCorrelation: "Correlation",
  linkRisk: "Risk dashboard",
  presetLabels: {
    equityBond: "Equity/bond",
    goldHedge: "Gold hedge",
    highCorr: "High corr",
  },
};

