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
import { positionForTarget, validVolTarget, volTargetInsight, VOL_PRESETS } from "../lib/volTarget";

export const metadata = {
  title: "波动率目标配置器 — Weacond",
  description: "给定目标波动率与资产波动，算所需杠杆与头寸规模，把组合波动控制到目标。教育性参考。",
  robots: { index: true, follow: true },
};

export default function VolTargetPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [capital, setCapital] = useState(100000);
  const [targetVol, setTargetVol] = useState(10); // 百分比
  const [assetVol, setAssetVol] = useState(15); // 百分比

  const valid = validVolTarget({ capital, targetVol: targetVol / 100, assetVol: assetVol / 100 });
  const res = useMemo(() => {
    if (!validVolTarget({ capital, targetVol: targetVol / 100, assetVol: assetVol / 100 })) return null;
    return positionForTarget({ capital, targetVol: targetVol / 100, assetVol: assetVol / 100 });
  }, [capital, targetVol, assetVol]);

  const applyPreset = (p) => {
    setCapital(p.capital);
    setTargetVol(p.targetVol * 100);
    setAssetVol(p.assetVol * 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="voltarget" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/voltarget"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Volatility-Target Allocator", href: "/voltarget" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {VOL_PRESETS.map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.capitalLabel}</span>
              <input type="number" value={capital} min={0} step={10000}
                onChange={(e) => setCapital(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.targetLabel}</span>
              <input type="number" value={targetVol} min={0} step={0.5}
                onChange={(e) => setTargetVol(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.assetLabel}</span>
              <input type="number" value={assetVol} min={0.1} step={0.5}
                onChange={(e) => setAssetVol(Math.max(0.1, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {!valid && <p className="text-xs text-red-500 mb-4">{L.invalid}</p>}

          {res && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.levLabel}</div>
                <div className={`text-4xl font-bold mb-1 ${res.leverage >= 1.5 ? "text-red-600" : "text-indigo-600"}`}>
                  {res.leverage.toFixed(2)}×
                </div>
                <div className="text-xs text-slate-500 mb-4">
                  {L.positionLabel}:{" "}
                  <span className="font-semibold">{Math.round(res.position).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-500">
                  {volTargetInsight(res, targetVol / 100, assetVol / 100)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.targetLabel}</div>
                  <div className="text-xl font-bold text-green-600">{targetVol}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.realizedLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{assetVol}% → {(res.realizedVol * 100).toFixed(1)}%</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
                {" · "}
                <Link href="/correlation" className="text-indigo-500 hover:underline">→ {L.linkCorrelation}</Link>
                {" · "}
                <Link href="/montecarlo" className="text-indigo-500 hover:underline">→ {L.linkMonteCarlo}</Link>
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
  title: "波动率目标配置器",
  subtitle: "给定目标波动率与资产波动，算所需杠杆与头寸规模，把组合波动控制到目标。",
  howToTitle: "如何使用波动率目标配置器",
  howTo: [
    "输入目标波动率%与资产波动率%。",
    "计算器算所需杠杆 = 目标 / 资产波动。",
    "查看头寸规模，把组合波动控制到目标。",
  ],
  capitalLabel: "资金",
  targetLabel: "目标波动 %",
  assetLabel: "资产波动 %",
  invalid: "资产波动需为正，其余非负。",
  levLabel: "所需杠杆",
  positionLabel: "头寸价值",
  realizedLabel: "实现波动",
  disclaimer: "杠杆放大收益与回撤；假设波动稳定、线性缩放，不构成投资建议。",
  linkRisk: "风险仪表盘",
  linkCorrelation: "相关性",
  linkMonteCarlo: "蒙特卡洛",
  presetLabels: { balanced: "平衡 10%", lowrisk: "低风险 5%", aggressive: "进取 20%" },
};
const en = {
  title: "Volatility-Target Allocator",
  subtitle: "Given a target volatility and asset volatility, compute the leverage and position size that hold portfolio vol to target.",
  howToTitle: "How to use the volatility-target allocator",
  howTo: [
    "Enter the target volatility % and the asset volatility %.",
    "The calculator computes leverage = target / asset vol.",
    "Read the position size that holds portfolio vol to target.",
  ],
  capitalLabel: "Capital",
  targetLabel: "Target vol %",
  assetLabel: "Asset vol %",
  invalid: "Asset vol must be positive; others non-negative.",
  levLabel: "Leverage needed",
  positionLabel: "Position value",
  realizedLabel: "Realized vol",
  disclaimer: "Leverage amplifies returns and drawdowns; assumes stable vol and linear scaling. Not investment advice.",
  linkRisk: "Risk dashboard",
  linkCorrelation: "Correlation",
  linkMonteCarlo: "Monte Carlo",
  presetLabels: { balanced: "Balanced 10%", lowrisk: "Low-risk 5%", aggressive: "Aggressive 20%" },
};

