"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  fxSummary, FX_PRESETS,
} from "../lib/fxPip";

export const metadata = {
  title: "FX 点值 / 名义头寸计算器 — Weacond",
  description: "每点价值=pipSize×头寸/汇率，名义头寸=头寸×汇率。简化模型，教育性参考。",
  robots: { index: true, follow: true },
};

function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}

export default function FxPipPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [pipSize, setPipSize] = useState(0.0001);
  const [positionSize, setPositionSize] = useState(100000);
  const [rate, setRate] = useState(1.085);
  const [pips, setPips] = useState(30);

  const res = useMemo(
    () => fxSummary({ pipSize, positionSize, rate, pips }),
    [pipSize, positionSize, rate, pips],
  );

  const applyPreset = (p) => {
    setPipSize(p.pipSize);
    setPositionSize(p.positionSize);
    setRate(p.rate);
    setPips(p.pips);
  };

  const band = res.band;
  const bandColor =
    band === "high" ? "text-rose-600" :
    band === "moderate" ? "text-amber-600" :
    band === "low" ? "text-emerald-600" :
    "text-slate-400";

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
            {Object.values(FX_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.pipSizeLabel}</span>
              <input type="number" value={pipSize} min={0} step={0.0001}
                onChange={(e) => setPipSize(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.positionLabel}</span>
              <input type="number" value={positionSize} min={0} step={1000}
                onChange={(e) => setPositionSize(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateLabel}</span>
              <input type="number" value={rate} min={0} step={0.0001}
                onChange={(e) => setRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.pipsLabel}</span>
              <input type="number" value={pips} step={1}
                onChange={(e) => setPips(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.pnlLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtMoney(res.pnl)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.pipValueLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.pipValue.toFixed(4)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.notionalLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.notional)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.pipPctLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{res.pipPercent.toFixed(3)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.lotsLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.lots.toFixed(2)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/position-size" className="text-indigo-500 hover:underline">→ {L.linkPosition}</Link>
            {" · "}
            <Link href="/leverage" className="text-indigo-500 hover:underline">→ {L.linkLeverage}</Link>
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
  title: "FX 点值 / 名义头寸",
  subtitle: "每点价值 = pipSize × 头寸 / 汇率；名义头寸 = 头寸 × 汇率。简化模型，教育性参考。",
  pipSizeLabel: "点大小 pipSize",
  positionLabel: "头寸（单位）",
  rateLabel: "汇率 rate",
  pipsLabel: "点数 pips",
  pnlLabel: "盈亏 P&L",
  pipValueLabel: "每点价值",
  notionalLabel: "名义头寸",
  pipPctLabel: "价格变动 %",
  lotsLabel: "手数",
  invalid: "头寸/汇率/点大小须 >0。",
  disclaimer: "简化模型（账户货币≈报价货币或按 rate 换算），忽略点差、隔夜利息与滑点，非交易建议。",
  linkPosition: "头寸规模",
  linkLeverage: "杠杆",
  linkRisk: "风险度量",
  bandLabels: { none: "无变动", low: "低 <0.1%", moderate: "中 0.1–0.5%", high: "高 ≥0.5%" },
  presetLabels: { eurUsd: "EUR/USD 标准手", gbpUsd: "GBP/USD 半手", usdJpy: "USD/JPY 标准手", miniLot: "迷你手", microLot: "微型手" },
};
const en = {
  title: "FX Pip Value / Notional",
  subtitle: "Pip value = pipSize × size / rate; notional = size × rate. Simplified model, educational.",
  pipSizeLabel: "Pip size",
  positionLabel: "Position (units)",
  rateLabel: "Rate",
  pipsLabel: "Pips",
  pnlLabel: "Profit & Loss",
  pipValueLabel: "Pip value",
  notionalLabel: "Notional",
  pipPctLabel: "Price move %",
  lotsLabel: "Lots",
  invalid: "Position / rate / pip size must be > 0.",
  disclaimer: "Simplified model (account ccy ≈ quote ccy or via rate); ignores spread, swap, slippage. Not trading advice.",
  linkPosition: "Position size",
  linkLeverage: "Leverage",
  linkRisk: "Risk metrics",
  bandLabels: { none: "None", low: "Low <0.1%", moderate: "Moderate 0.1–0.5%", high: "High ≥0.5%" },
  presetLabels: { eurUsd: "EUR/USD std", gbpUsd: "GBP/USD ½", usdJpy: "USD/JPY std", miniLot: "Mini", microLot: "Micro" },
};

