"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  rebalanceSummary, REBALANCE_PRESETS,
} from "../lib/rebalance";

export const metadata = {
  title: "再平衡收益计算器 — Weacond",
  description: "再平衡溢价 ≈ w₁w₂(σ₁²+σ₂²−2ρσ₁σ₂)；相对买入持有的额外收益。教育性参考。",
  robots: { index: true, follow: true },
};

export default function RebalancePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [w1, setW1] = useState(50); // 百分比
  const [s1, setS1] = useState(20); // 百分比
  const [s2, setS2] = useState(10); // 百分比
  const [rho, setRho] = useState(0); // 百分比（−100..100）
  const [years, setYears] = useState(10);

  const res = useMemo(
    () => rebalanceSummary({ w1: w1 / 100, s1: s1 / 100, s2: s2 / 100, rho: rho / 100, years }),
    [w1, s1, s2, rho, years],
  );

  const applyPreset = (p) => {
    setW1(p.w1 * 100);
    setS1(p.s1 * 100);
    setS2(p.s2 * 100);
    setRho(p.rho * 100);
    setYears(p.years);
  };

  const band = res.band;
  const bandColor =
    band === "high" ? "text-emerald-700" :
    band === "moderate" ? "text-emerald-600" :
    band === "low" ? "text-amber-600" :
    band === "none" ? "text-slate-400" : "text-slate-400";

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
            {Object.values(REBALANCE_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.w1Label}</span>
              <input type="number" value={w1} min={0} max={100} step={1}
                onChange={(e) => setW1(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rhoLabel}</span>
              <input type="number" value={rho} min={-100} max={100} step={1}
                onChange={(e) => setRho(Math.max(-100, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.s1Label}</span>
              <input type="number" value={s1} min={0} step={0.5}
                onChange={(e) => setS1(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.s2Label}</span>
              <input type="number" value={s2} min={0} step={0.5}
                onChange={(e) => setS2(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={0} max={40} step={1}
                onChange={(e) => setYears(Math.max(0, Math.min(40, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.bonusLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{(res.bonus * 100).toFixed(2)}%</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.pvolLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{(res.portfolioVol * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.totalLabel}</div>
                  <div className="text-xl font-bold text-emerald-600">{(res.totalBonus * 100).toFixed(2)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.w1Label}</div>
                  <div className="text-xl font-bold text-slate-800">{(res.w1 * 100).toFixed(0)}% / {(res.w2 * 100).toFixed(0)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.rhoLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{rho}%</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/correlation" className="text-indigo-500 hover:underline">→ {L.linkCorrelation}</Link>
            {" · "}
            <Link href="/portfolio" className="text-indigo-500 hover:underline">→ {L.linkPortfolio}</Link>
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
  title: "再平衡收益计算器",
  subtitle: "再平衡溢价 ≈ w₁w₂(σ₁²+σ₂²−2ρσ₁σ₂)；相对买入持有的额外收益。教育性参考。",
  w1Label: "资产1 权重 w₁ %",
  rhoLabel: "相关系数 ρ %",
  s1Label: "资产1 波动 σ₁ %",
  s2Label: "资产2 波动 σ₂ %",
  yearsLabel: "年数",
  bonusLabel: "年化再平衡溢价",
  pvolLabel: "组合波动",
  totalLabel: "累计溢价",
  invalid: "权重 w₁ 须在 0–100% 之间。",
  disclaimer: "溢价为近似（忽略离散再平衡与交易成本），不构成投资建议。",
  linkCorrelation: "相关性",
  linkPortfolio: "组合",
  linkRisk: "风险度量",
  bandLabels: { none: "无溢价", low: "偏低 <0.5%", moderate: "中等 0.5–1.5%", high: "较高 ≥1.5%", na: "无数据" },
  presetLabels: { balanced: "平衡 50/50", stockBond: "股债 60/40", antiCorrelated: "负相关", identical: "完全相同", aggressive: "激进 80/20" },
};
const en = {
  title: "Rebalancing Bonus",
  subtitle: "Rebalancing premium ≈ w₁w₂(σ₁²+σ₂²−2ρσ₁σ₂) over buy-and-hold. Educational reference.",
  w1Label: "Asset 1 weight w₁ %",
  rhoLabel: "Correlation ρ %",
  s1Label: "Asset 1 vol σ₁ %",
  s2Label: "Asset 2 vol σ₂ %",
  yearsLabel: "Years",
  bonusLabel: "Annual rebalancing bonus",
  pvolLabel: "Portfolio vol",
  totalLabel: "Cumulative bonus",
  invalid: "Weight w₁ must be between 0–100%.",
  disclaimer: "Bonus is approximate (ignores discrete rebalancing and costs). Not investment advice.",
  linkCorrelation: "Correlation",
  linkPortfolio: "Portfolio",
  linkRisk: "Risk metrics",
  bandLabels: { none: "None", low: "Low <0.5%", moderate: "Moderate 0.5–1.5%", high: "High ≥1.5%", na: "No data" },
  presetLabels: { balanced: "Balanced 50/50", stockBond: "Stock-Bond 60/40", antiCorrelated: "Anti-corr", identical: "Identical", aggressive: "Aggressive 80/20" },
};
