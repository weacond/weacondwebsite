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
  betaSummary, BETA_PRESETS,
} from "../lib/portfolioBeta";
export const metadata = {
  title: "组合 Beta / 系统性风险计算器 — Weacond",
  description: "组合beta=Σwᵢβᵢ，系统回报=β×市场回报，系统/非系统风险分解。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
export default function PortfolioBetaPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [weightsStr, setWeightsStr] = useState("0.5,0.3,0.2");
  const [betasStr, setBetasStr] = useState("0.6,0.8,1.0");
  const [marketReturn, setMarketReturn] = useState(10); // 百分比
  const [marketVol, setMarketVol] = useState(15); // 百分比
  const res = useMemo(() => {
    const weights = weightsStr.split(",").map((x) => parseFloat(x.trim()) || 0);
    const betas = betasStr.split(",").map((x) => parseFloat(x.trim()) || 0);
    return betaSummary({
      weights,
      betas,
      marketReturn: marketReturn / 100,
      marketVol: marketVol / 100,
    });
  }, [weightsStr, betasStr, marketReturn, marketVol]);
  const applyPreset = (p) => {
    setWeightsStr(p.weights.join(","));
    setBetasStr(p.betas.join(","));
    setMarketReturn(p.marketReturn * 100);
    setMarketVol(p.marketVol * 100);
  };
  const band = res.band;
  const bandColor =
    band === "aggressive" ? "text-rose-600" :
    band === "market" ? "text-amber-600" :
    band === "low" ? "text-indigo-600" :
    "text-emerald-600";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="portfolio-beta" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/portfolio-beta"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Portfolio Beta / Systematic Risk", href: "/portfolio-beta" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(BETA_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.weightsLabel}</span>
              <input type="text" value={weightsStr}
                onChange={(e) => setWeightsStr(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.betasLabel}</span>
              <input type="text" value={betasStr}
                onChange={(e) => setBetasStr(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.mktReturnLabel}</span>
              <input type="number" value={marketReturn} min={-10} max={30} step={0.5}
                onChange={(e) => setMarketReturn(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.mktVolLabel}</span>
              <input type="number" value={marketVol} min={0} max={50} step={0.5}
                onChange={(e) => setMarketVol(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.betaLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{res.beta.toFixed(3)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.sysRetLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{(res.systematicReturn * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.resVolLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{(res.residualVol * 100).toFixed(2)}%</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.nAssetsLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.weights.length}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.mktReturnLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{(res.marketReturn * 100).toFixed(1)}%</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/portfolio" className="text-indigo-500 hover:underline">→ {L.linkPortfolio}</Link>
            {" · "}
            <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
            {" · "}
            <Link href="/leverage" className="text-indigo-500 hover:underline">→ {L.linkLeverage}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
const zh = {
  title: "组合 Beta / 系统性风险",
  subtitle: "组合 beta = Σwᵢβᵢ；系统回报 = β×市场回报；非系统波动分解。教育性参考。",
  howToTitle: "如何使用组合 Beta/系统性风险计算器",
  howTo: [
    "输入各资产的权重 w 与 beta βᵢ。",
    "计算器算组合 beta = Σwᵢβᵢ。",
    "查看系统回报 = β×市场回报，与非系统波动分解。",
  ],
  weightsLabel: "权重（逗号分隔）",
  betasLabel: "Beta（逗号分隔）",
  mktReturnLabel: "市场回报 %",
  mktVolLabel: "市场波动 %",
  betaLabel: "组合 Beta",
  sysRetLabel: "系统性回报",
  resVolLabel: "非系统波动",
  nAssetsLabel: "资产数",
  invalid: "权重/beta 须等长，权重 ≥0。",
  disclaimer: "简化模型（假设 beta 恒定、线性关系），非投资建议。",
  linkPortfolio: "组合",
  linkRisk: "风险度量",
  linkLeverage: "杠杆",
  bandLabels: { defensive: "防御 <0.5", low: "低 0.5–0.8", market: "市场 0.8–1.2", aggressive: "激进 ≥1.2" },
  presetLabels: { defensive: "防御", balanced: "均衡", aggressive: "激进", concentrated: "集中", market: "市场" },
};
const en = {
  title: "Portfolio Beta / Systematic Risk",
  subtitle: "Portfolio β = Σwᵢβᵢ; systematic return = β×market; residual vol decomposition. Educational.",
  howToTitle: "How to use the portfolio beta / systematic-risk calculator",
  howTo: [
    "Enter each asset's weight w and beta βᵢ.",
    "The calculator computes portfolio β = Σwᵢβᵢ.",
    "Read the systematic return = β×market and the residual-vol decomposition.",
  ],
  weightsLabel: "Weights (comma-sep)",
  betasLabel: "Betas (comma-sep)",
  mktReturnLabel: "Market return %",
  mktVolLabel: "Market vol %",
  betaLabel: "Portfolio Beta",
  sysRetLabel: "Systematic return",
  resVolLabel: "Residual vol",
  nAssetsLabel: "Assets",
  invalid: "Weights/betas must be equal length, weights ≥ 0.",
  disclaimer: "Simplified model (constant beta, linear relation). Not investment advice.",
  linkPortfolio: "Portfolio",
  linkRisk: "Risk metrics",
  linkLeverage: "Leverage",
  bandLabels: { defensive: "Defensive <0.5", low: "Low 0.5–0.8", market: "Market 0.8–1.2", aggressive: "Aggressive ≥1.2" },
  presetLabels: { defensive: "Defensive", balanced: "Balanced", aggressive: "Aggressive", concentrated: "Concentrated", market: "Market" },
};
