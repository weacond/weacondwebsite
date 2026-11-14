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
  breakevenSummary, rrBand, BREAKEVEN_PRESETS,
} from "../lib/breakeven";

export const metadata = {
  title: "含手续费盈亏平衡计算器 — Weacond",
  description: "扣手续费后多少价打平：平衡价=入场·(1±fee)/(∓fee)，并给出扣费后有效盈亏比。教育性参考。",
  robots: { index: true, follow: true },
};

export default function BreakevenPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [side, setSide] = useState("long");
  const [entry, setEntry] = useState(100);
  const [stop, setStop] = useState(97);
  const [target, setTarget] = useState(106);
  const [feePct, setFeePct] = useState(0.1);

  const res = useMemo(
    () => breakevenSummary({ side, entry, stop, target, feePct }),
    [side, entry, stop, target, feePct],
  );

  const applyPreset = (p) => {
    setSide(p.side || "long");
    setEntry(p.entry);
    setStop(p.stop);
    setTarget(p.target);
    setFeePct(p.feePct);
  };

  const band = res.rr ? rrBand(res.rr.rr) : null;
  const bandColor =
    band === "strong" ? "text-emerald-600" :
    band === "fair" ? "text-amber-600" :
    band === "thin" ? "text-orange-600" : "text-red-600";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="breakeven" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/breakeven"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Breakeven After Fees", href: "/breakeven" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(BREAKEVEN_PRESETS).map((p) => (
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
              <span className="text-xs text-slate-500">{L.feeLabel}</span>
              <input type="number" value={feePct} min={0} step={0.01}
                onChange={(e) => setFeePct(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.entryLabel}</span>
              <input type="number" value={entry} min={0} step={0.01}
                onChange={(e) => setEntry(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.stopLabel}</span>
              <input type="number" value={stop} min={0} step={0.01}
                onChange={(e) => setStop(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-slate-500">{L.targetLabel}</span>
              <input type="number" value={target} min={0} step={0.01}
                onChange={(e) => setTarget(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.beLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{res.breakeven.toFixed(4)}</div>
                  <div className="text-xs text-slate-400 mt-1">{L.moveLabel} {(res.movePct * 100).toFixed(3)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.feeLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{(res.fee * 100).toFixed(3)}%</div>
                </div>
              </div>

              {res.rr && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.rrLabel}</div>
                  <div className={`text-3xl font-bold ${bandColor}`}>1 : {Number.isFinite(res.rr.rr) ? res.rr.rr.toFixed(2) : "∞"}</div>
                  <div className="text-xs text-slate-400 mt-1">{L.grossRrLabel} 1 : {res.rr.grossRr.toFixed(2)} → {L.bandLabels ? L.bandLabels[band] : band}</div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/r-multiple" className="text-indigo-500 hover:underline">→ {L.linkR}</Link>
            {" · "}
            <Link href="/excursion" className="text-indigo-500 hover:underline">→ {L.linkExcursion}</Link>
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
  title: "含手续费盈亏平衡计算器",
  subtitle: "扣手续费后多少价打平：平衡价 = 入场·(1±fee)/(∓fee)，并给出扣费后有效盈亏比。",
  howToTitle: "如何使用含手续费盈亏平衡计算器",
  howTo: [
    "输入入场价、目标价、止损价与手续费率%。",
    "计算器按 平衡价 = 入场·(1±fee)/(∓fee) 算扣费后打平价。",
    "查看扣费后有效盈亏比，评估真实成本。",
  ],
  sideLabel: "方向",
  feeLabel: "单边手续费 %",
  entryLabel: "入场价",
  stopLabel: "止损价",
  targetLabel: "目标价",
  beLabel: "盈亏平衡价",
  moveLabel: "需移动",
  rrLabel: "扣费后 R:R",
  grossRrLabel: "毛 R:R",
  invalid: "入场价须 >0，手续费须 <100%。",
  disclaimer: "手续费按双边近似，未计滑点/资金费，不构成投资建议。",
  linkR: "R 倍数",
  linkExcursion: "最大偏移",
  linkLeverage: "杠杆与强平",
  sides: { long: "多", short: "空" },
  bandLabels: { poor: "无盈亏比", thin: "偏薄 <1", fair: "合理 1–2", strong: "优秀 ≥2" },
  presetLabels: { stock: "股票 0.05%", crypto: "币圈 0.1%", short: "空头 0.1%", simple: "零手续费" },
};
const en = {
  title: "Breakeven After Fees",
  subtitle: "What price breaks even after fees: breakeven = entry·(1±fee)/(∓fee), plus the net (post-fee) R:R.",
  howToTitle: "How to use the breakeven-after-fees calculator",
  howTo: [
    "Enter entry, target and stop prices, plus the fee rate %.",
    "The calculator computes breakeven = entry·(1±fee)/(∓fee) after fees.",
    "Read the net (post-fee) R:R to assess the true cost.",
  ],
  sideLabel: "Side",
  feeLabel: "Fee per side %",
  entryLabel: "Entry",
  stopLabel: "Stop",
  targetLabel: "Target",
  beLabel: "Breakeven price",
  moveLabel: "Move needed",
  rrLabel: "Net R:R (post-fee)",
  grossRrLabel: "Gross R:R",
  invalid: "Entry must be >0 and fee <100%.",
  disclaimer: "Fees approximated as two-sided; excludes slippage/funding. Not investment advice.",
  linkR: "R-Multiple",
  linkExcursion: "Max Excursion",
  linkLeverage: "Leverage & Liquidation",
  sides: { long: "Long", short: "Short" },
  bandLabels: { poor: "No R:R", thin: "Thin <1", fair: "Fair 1–2", strong: "Strong ≥2" },
  presetLabels: { stock: "Stock 0.05%", crypto: "Crypto 0.1%", short: "Short 0.1%", simple: "No fee" },
};
