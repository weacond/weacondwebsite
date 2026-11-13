"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { takeProfitSummary, TAKE_PROFIT_PRESETS } from "../lib/takeProfit";
export const metadata = {
  title: "止盈目标 — Weacond",
  description: "止盈价=入场±目标R×风险，R:R比，止盈回报%。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "止盈目标 / R:R 计算器",
  subtitle: "止盈价=入场±目标R×每单位风险；R:R=盈利/风险；止盈回报%=盈利/入场。教育性参考，非投资建议。",
  entryLabel: "入场价",
  stopLabel: "止损价",
  targetRLabel: "目标 R 倍数",
  sideLabel: "方向",
  long: "多头",
  short: "空头",
  presetLabels: {
    rr2: "2R 止盈", rr3: "3R 止盈", shortRr2: "空头 2R", rr5: "5R 波段", rr1: "1R 短线",
  },
  resultTitle: "结果",
  riskLabel: "每单位风险",
  tpLabel: "止盈价",
  rewardLabel: "每单位盈利",
  rrLabel: "R:R 比",
  tpPctLabel: "止盈回报 %",
  bandLabel: "R:R 等级",
  bandText: {
    poor: "偏低", fair: "一般", good: "良好", excellent: "优秀", zero: "零", invalid: "无效",
  },
  learnTitle: "学习",
  learn: "止盈目标价 = 入场 ± 目标R × 每单位风险。R:R 比 = 潜在盈利 ÷ 风险。R:R≥2 通常被视为良好，≥3 优秀。配合胜率可算期望值（见 R:R 与期望工具）。",
};
const en = {
  title: "Take-Profit / R:R Target",
  subtitle: "TP price = entry ± target R × risk/unit; R:R = reward/risk; TP return % = reward/entry. Educational, not investment advice.",
  entryLabel: "Entry",
  stopLabel: "Stop",
  targetRLabel: "Target R",
  sideLabel: "Side",
  long: "Long",
  short: "Short",
  presetLabels: {
    rr2: "2R TP", rr3: "3R TP", shortRr2: "Short 2R", rr5: "5R Swing", rr1: "1R Scalp",
  },
  resultTitle: "Results",
  riskLabel: "Risk per unit",
  tpLabel: "Take-Profit",
  rewardLabel: "Reward per unit",
  rrLabel: "R:R Ratio",
  tpPctLabel: "TP Return %",
  bandLabel: "R:R Level",
  bandText: {
    poor: "Low", fair: "Fair", good: "Good", excellent: "Excellent", zero: "Zero", invalid: "Invalid",
  },
  learnTitle: "Learn",
  learn: "Take-profit price = entry ± target R × risk/unit. R:R = potential reward ÷ risk. R:R ≥ 2 is usually good, ≥ 3 excellent. Combine with win rate for expectancy (see R:R / expectancy tools).",
};
function fmtNum(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}
export default function TakeProfitPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [entry, setEntry] = useState(100);
  const [stop, setStop] = useState(95);
  const [targetR, setTargetR] = useState(2);
  const [side, setSide] = useState("long");
  const res = useMemo(
    () => takeProfitSummary({ entry, stop, targetR, side }),
    [entry, stop, targetR, side],
  );
  const applyPreset = (p) => {
    setEntry(p.entry); setStop(p.stop);
    setTargetR(p.targetR); setSide(p.side || "long");
  };
  const band = res.band || "invalid";
  const bandColor =
    band === "good" ? "text-emerald-600" :
    band === "excellent" ? "text-indigo-600" :
    band === "fair" ? "text-amber-600" :
    band === "poor" ? "text-rose-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(TAKE_PROFIT_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels[p.id] || p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.entryLabel}</span>
              <input type="number" value={entry} step={0.01}
                onChange={(e) => setEntry(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.stopLabel}</span>
              <input type="number" value={stop} step={0.01}
                onChange={(e) => setStop(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.targetRLabel}</span>
              <input type="number" value={targetR} min={0.1} step={0.1}
                onChange={(e) => setTargetR(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.sideLabel}</span>
              <select value={side} onChange={(e) => setSide(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                <option value="long">{L.long}</option>
                <option value="short">{L.short}</option>
              </select>
            </label>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.resultTitle}</h2>
            {res.valid ? (
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-400">{L.riskLabel}</div><div className="font-mono text-lg">{fmtNum(res.riskPerUnit)}</div></div>
                <div><div className="text-xs text-slate-400">{L.tpLabel}</div><div className="font-mono text-lg">{fmtNum(res.takeProfit)}</div></div>
                <div><div className="text-xs text-slate-400">{L.rewardLabel}</div><div className="font-mono text-lg">{fmtNum(res.rewardPerUnit)}</div></div>
                <div><div className="text-xs text-slate-400">{L.rrLabel}</div><div className="font-mono text-lg">{fmtNum(res.rrRatio)}</div></div>
                <div><div className="text-xs text-slate-400">{L.tpPctLabel}</div><div className="font-mono text-lg">{fmtPct(res.tpReturnPct)}</div></div>
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