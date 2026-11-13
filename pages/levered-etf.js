"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import Link from "next/link";
import {
  leveredEtfSummary, LEVERED_PRESETS,
} from "../lib/leveredEtf";

export const metadata = {
  title: "杠杆 ETF 衰减计算器 — Weacond",
  description: "杠杆后年化=L·μ−½·L·(L−1)·σ²；波动损耗/衰减。教育性参考，不构成投资建议。",
  robots: { index: true, follow: true },
};

function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}

export default function LeveredEtfPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [leverage, setLeverage] = useState(2);
  const [mu, setMu] = useState(8); // 百分比
  const [sigma, setSigma] = useState(20); // 百分比
  const [years, setYears] = useState(5);
  const [principal, setPrincipal] = useState(10000);

  const res = useMemo(
    () => leveredEtfSummary({ leverage, mu: mu / 100, sigma: sigma / 100, years, principal }),
    [leverage, mu, sigma, years, principal],
  );

  const applyPreset = (p) => {
    setLeverage(p.leverage);
    setMu(p.mu * 100);
    setSigma(p.sigma * 100);
    setYears(p.years);
    setPrincipal(p.principal);
  };

  const band = res.band;
  const bandColor =
    band === "none" ? "text-emerald-600" :
    band === "low" ? "text-emerald-600" :
    band === "moderate" ? "text-amber-600" :
    band === "high" ? "text-amber-700" :
    band === "extreme" ? "text-red-600" : "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="levered-etf" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(LEVERED_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.leverageLabel}</span>
              <input type="number" value={leverage} step={0.5}
                onChange={(e) => setLeverage(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.muLabel}</span>
              <input type="number" value={mu} step={0.5}
                onChange={(e) => setMu(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.sigmaLabel}</span>
              <input type="number" value={sigma} min={0} step={0.5}
                onChange={(e) => setSigma(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={0} max={40} step={1}
                onChange={(e) => setYears(Math.max(0, Math.min(40, parseFloat(e.target.value) || 0)))}
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
                <div className="text-xs text-slate-400 mb-1">{L.leveredFutureLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtMoney(res.leveredFuture)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.leveredReturnLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{(res.leveredReturn * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.decayLabel}</div>
                  <div className={`text-xl font-bold ${res.decay > 0 ? "text-amber-600" : "text-emerald-600"}`}>{(res.decay * 100).toFixed(2)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.underlyingFutureLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.underlyingFuture)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.lossLabel}</div>
                  <div className={`text-xl font-bold ${res.lossFromDecay > 0 ? "text-red-600" : "text-emerald-600"}`}>{fmtMoney(res.lossFromDecay)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/vol-drag" className="text-indigo-500 hover:underline">→ {L.linkVolDrag}</Link>
            {" · "}
            <Link href="/leverage" className="text-indigo-500 hover:underline">→ {L.linkLeverage}</Link>
            {" · "}
            <Link href="/montecarlo" className="text-indigo-500 hover:underline">→ {L.linkMonteCarlo}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "杠杆 ETF 衰减计算器",
  subtitle: "杠杆后年化 = L·μ − ½·L·(L−1)·σ²；波动损耗/衰减。教育性参考。",
  leverageLabel: "杠杆倍数 L",
  muLabel: "标的年化 μ %",
  sigmaLabel: "标的年化波动 σ %",
  yearsLabel: "年数",
  principalLabel: "本金",
  leveredFutureLabel: "杠杆 ETF 未来价值",
  leveredReturnLabel: "杠杆后年化",
  decayLabel: "波动衰减",
  underlyingFutureLabel: "标的未来价值",
  lossLabel: "衰减净损耗",
  invalid: "本金须 >0。",
  disclaimer: "衰减为近似（忽略日内路径与分红），不构成投资建议。",
  linkVolDrag: "波动损耗",
  linkLeverage: "杠杆",
  linkMonteCarlo: "蒙特卡洛",
  bandLabels: { none: "无衰减", low: "轻微 <2%", moderate: "中等 2–5%", high: "较高 5–10%", extreme: "极高 ≥10%", na: "无数据" },
  presetLabels: { twoX: "2x 长仓", threeX: "3x 长仓", shortX: "-1x 空仓", calm: "低波动", volatile: "高波动" },
};
const en = {
  title: "Leveraged ETF Decay",
  subtitle: "Levered annual = L·μ − ½·L·(L−1)·σ²; volatility drag/decay. Educational reference.",
  leverageLabel: "Leverage L",
  muLabel: "Underlying annual μ %",
  sigmaLabel: "Underlying annual vol σ %",
  yearsLabel: "Years",
  principalLabel: "Principal",
  leveredFutureLabel: "Levered ETF value",
  leveredReturnLabel: "Levered annual",
  decayLabel: "Vol decay",
  underlyingFutureLabel: "Underlying value",
  lossLabel: "Net decay loss",
  invalid: "Principal must be > 0.",
  disclaimer: "Decay is approximate (ignores intra-day path and dividends). Not investment advice.",
  linkVolDrag: "Vol drag",
  linkLeverage: "Leverage",
  linkMonteCarlo: "Monte Carlo",
  bandLabels: { none: "None", low: "Low <2%", moderate: "Moderate 2–5%", high: "High 5–10%", extreme: "Extreme ≥10%", na: "No data" },
  presetLabels: { twoX: "2x long", threeX: "3x long", shortX: "-1x short", calm: "Calm", volatile: "Volatile" },
};
