"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  excursionSummary, captureBand, EXCURSION_PRESETS,
} from "../lib/excursion";

export const metadata = {
  title: "最大偏移（MFE/MAE）计算器 — Weacond",
  description: "评估单笔交易的入场/出场质量：MFE 最大浮盈、MAE 最大浮亏、捕获率=实际盈亏/MFE。教育性参考。",
  robots: { index: true, follow: true },
};

export default function ExcursionPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [side, setSide] = useState("long");
  const [entry, setEntry] = useState(100);
  const [high, setHigh] = useState(104);
  const [low, setLow] = useState(98);
  const [exit, setExit] = useState(102);

  const res = useMemo(
    () => excursionSummary({ side, entry, high, low, exit }),
    [side, entry, high, low, exit],
  );

  const applyPreset = (p) => {
    setSide(p.side || "long");
    setEntry(p.entry);
    setHigh(p.high);
    setLow(p.low);
    setExit(p.exit);
  };

  const band = res.band;
  const bandColor =
    band === "full" ? "text-emerald-600" :
    band === "good" ? "text-emerald-600" :
    band === "partial" ? "text-amber-600" :
    band === "missed" ? "text-red-600" : "text-slate-400";

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
            {Object.values(EXCURSION_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.sideLabel}</span>
              <select value={side} onChange={(e) => setSide(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                <option value="long">{L.sides.long}</option>
                <option value="short">{L.sides.short}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.entryLabel}</span>
              <input type="number" value={entry} min={0} step={0.01}
                onChange={(e) => setEntry(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.highLabel}</span>
              <input type="number" value={high} min={0} step={0.01}
                onChange={(e) => setHigh(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.lowLabel}</span>
              <input type="number" value={low} min={0} step={0.01}
                onChange={(e) => setLow(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-slate-500">{L.exitLabel}</span>
              <input type="number" value={exit} min={0} step={0.01}
                onChange={(e) => setExit(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.mfeLabel}</div>
                  <div className="text-xl font-bold text-emerald-600">{res.mfe.toFixed(2)}<span className="text-xs text-slate-400 ml-1">({(res.mfePct * 100).toFixed(2)}%)</span></div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.maeLabel}</div>
                  <div className="text-xl font-bold text-red-600">{res.mae.toFixed(2)}<span className="text-xs text-slate-400 ml-1">({(res.maePct * 100).toFixed(2)}%)</span></div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.captureLabel}</div>
                <div className={`text-3xl font-bold ${bandColor}`}>{Number.isFinite(res.cap.capture) ? (res.cap.capture * 100).toFixed(0) + "%" : "—"}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/leverage" className="text-indigo-500 hover:underline">→ {L.linkLeverage}</Link>
            {" · "}
            <Link href="/r-multiple" className="text-indigo-500 hover:underline">→ {L.linkR}</Link>
            {" · "}
            <Link href="/atr-stop" className="text-indigo-500 hover:underline">→ {L.linkAtr}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "最大偏移（MFE/MAE）计算器",
  subtitle: "评估单笔交易的入场/出场质量：MFE 最大浮盈、MAE 最大浮亏、捕获率 = 实际盈亏 / MFE。",
  sideLabel: "方向",
  entryLabel: "入场价",
  highLabel: "过程最高价",
  lowLabel: "过程最低价",
  exitLabel: "出场价",
  mfeLabel: "最大浮盈 MFE",
  maeLabel: "最大浮亏 MAE",
  captureLabel: "捕获率（盈亏/MFE）",
  invalid: "入场价须 >0，且最高价 ≥ 最低价。",
  disclaimer: "MFE/MAE 衡量过程偏移，未计手续费/滑点，不构成投资建议。",
  linkLeverage: "杠杆与强平",
  linkR: "R 倍数",
  linkAtr: "ATR 止损",
  sides: { long: "多", short: "空" },
  bandLabels: { na: "无数据", missed: "未获利 / 亏损", partial: "部分捕获 <50%", good: "良好 50–100%", full: "完全捕获 ≥100%" },
  presetLabels: { longDay: "日内多头", shortSwing: "波段空头", bigWin: "大盈利", whipsaw: "假突破" },
};
const en = {
  title: "Max Excursion (MFE/MAE)",
  subtitle: "Grade a trade's entry & exit quality: MFE max favorable excursion, MAE max adverse, capture = P&L / MFE.",
  sideLabel: "Side",
  entryLabel: "Entry",
  highLabel: "Intra-trade high",
  lowLabel: "Intra-trade low",
  exitLabel: "Exit",
  mfeLabel: "Max favorable (MFE)",
  maeLabel: "Max adverse (MAE)",
  captureLabel: "Capture (P&L / MFE)",
  invalid: "Entry must be >0 and high ≥ low.",
  disclaimer: "MFE/MAE measure path excursions; excludes fees/slippage. Not investment advice.",
  linkLeverage: "Leverage & Liquidation",
  linkR: "R-Multiple",
  linkAtr: "ATR Stop",
  sides: { long: "Long", short: "Short" },
  bandLabels: { na: "No data", missed: "No profit / loss", partial: "Partial <50%", good: "Good 50–100%", full: "Full ≥100%" },
  presetLabels: { longDay: "Day long", shortSwing: "Swing short", bigWin: "Big win", whipsaw: "Whipsaw" },
};
