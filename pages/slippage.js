"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import { slippageSummary, SLIPPAGE_PRESETS } from "../lib/slippage";
export const metadata = {
  title: "滑点 / 价差成本 — Weacond",
  description: "往返成本=价差+2×滑点；占名义比；净回报=毛回报−成本。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "滑点 / 价差成本计算器",
  subtitle: "往返成本=价差+2×滑点；占名义比=成本/价格；净回报=毛回报−成本。教育性参考，非投资建议。",
  priceLabel: "价格", spreadLabel: "价差", slipLabel: "每腿滑点", grossLabel: "毛回报 %",
  presetLabels: { liquidStock: "高流动性股票", illiquid: "低流动性", cryptoSpot: "加密现货", fx: "外汇 majors", pennyStock: "低价股" },
  resultTitle: "结果", costLabel: "往返成本（价格）", costPctLabel: "占名义比",
  netLabel: "净回报", bandLabel: "成本等级",
  bandText: { low: "低", moderate: "中", high: "高", "very-high": "极高", zero: "零", invalid: "无效" },
  learnTitle: "学习",
  learn: "每笔交易要穿越价差与滑点。往返成本 = 价差 + 2×滑点（进各出各一次滑点）。占名义比 = 成本/价格，衡量成本占头寸比重。净回报 = 毛回报 − 占名义比。流动性差时成本吃利润。",
};
const en = {
  title: "Slippage / Spread Cost",
  subtitle: "Round-trip cost = spread + 2×slippage; % of notional = cost/price; net = gross − cost. Educational, not investment advice.",
  priceLabel: "Price", spreadLabel: "Spread", slipLabel: "Slippage / leg", grossLabel: "Gross Return %",
  presetLabels: { liquidStock: "Liquid Stock", illiquid: "Illiquid", cryptoSpot: "Crypto Spot", fx: "FX Majors", pennyStock: "Penny" },
  resultTitle: "Results", costLabel: "Round-trip cost", costPctLabel: "% of Notional",
  netLabel: "Net Return", bandLabel: "Cost Level",
  bandText: { low: "Low", moderate: "Moderate", high: "High", "very-high": "Very high", zero: "Zero", invalid: "Invalid" },
  learnTitle: "Learn",
  learn: "Every trade crosses the spread and slippage. Round-trip cost = spread + 2×slippage (one slip each way). % of notional = cost/price shows cost as a share of position. Net return = gross − cost. Illiquidity eats profits.",
};
function fmtNum(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(4);
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(3) + "%";
}
export default function SlippagePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [price, setPrice] = useState(100);
  const [spread, setSpread] = useState(0.02);
  const [slippage, setSlippage] = useState(0.01);
  const [grossReturn, setGrossReturn] = useState(5);
  const res = useMemo(
    () => slippageSummary({ price, spread, slippage, grossReturn: grossReturn / 100 }),
    [price, spread, slippage, grossReturn],
  );
  const applyPreset = (p) => {
    setPrice(p.price); setSpread(p.spread);
    setSlippage(p.slippage); setGrossReturn(p.grossReturn * 100);
  };
  const band = res.band || "invalid";
  const bandColor =
    band === "low" ? "text-emerald-600" :
    band === "moderate" ? "text-indigo-600" :
    band === "high" ? "text-amber-600" :
    band === "very-high" ? "text-rose-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="slippage" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(SLIPPAGE_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels[p.id] || p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.priceLabel}</span>
              <input type="number" value={price} step={0.001}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.spreadLabel}</span>
              <input type="number" value={spread} min={0} step={0.001}
                onChange={(e) => setSpread(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.slipLabel}</span>
              <input type="number" value={slippage} min={0} step={0.001}
                onChange={(e) => setSlippage(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.grossLabel}</span>
              <input type="number" value={grossReturn} step={0.1}
                onChange={(e) => setGrossReturn(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.resultTitle}</h2>
            {res.valid ? (
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-400">{L.costLabel}</div><div className="font-mono text-lg">{fmtNum(res.roundTripCost)}</div></div>
                <div><div className="text-xs text-slate-400">{L.costPctLabel}</div><div className="font-mono text-lg">{fmtPct(res.costPct)}</div></div>
                <div><div className="text-xs text-slate-400">{L.netLabel}</div><div className="font-mono text-lg">{fmtPct(res.netReturn)}</div></div>
                <div>
                  <div className="text-xs text-slate-400">{L.bandLabel}</div>
                  <div className={`font-semibold ${bandColor}`}>{L.bandText[band] || band}</div>
                </div>
              </div>
            ) : <p className="text-slate-400 text-sm">{L.subtitle}</p>}
          </div>
          <div className="bg-indigo-50 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-indigo-900 mb-2">{L.learnTitle}</h2>
            <p className="text-sm text-indigo-800 leading-relaxed">{L.learn}</p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}