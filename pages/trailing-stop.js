"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import Link from "next/link";
import { trailingStopSummary, TRAILING_STOP_PRESETS } from "../lib/trailingStop";
export const metadata = {
  title: "移动止损 — Weacond",
  description: "移动止损/保本止损/已实现R。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "移动止损 / 保本止损计算器",
  subtitle: "已实现R=盈亏÷每单位风险；移动止损=按跟踪距离滚动；保本=达到触发R后止损移成本。教育性参考，非投资建议。",
  entryLabel: "入场价",
  stopLabel: "初始止损",
  priceLabel: "当前价",
  trailLabel: "跟踪距离",
  sideLabel: "方向",
  long: "多头",
  short: "空头",
  presetLabels: {
    long5: "多头 5% 止损", longBreakeven: "多头 1R 保本",
    short5: "空头 5% 止损", longTight: "多头紧止损", swing: "波段 10% 止损",
  },
  resultTitle: "结果",
  riskLabel: "每单位风险",
  stopPctLabel: "止损距离 %",
  rLabel: "已实现 R",
  trailStopLabel: "移动止损位",
  beLabel: "保本触发",
  lockLabel: "锁定 R",
  profitLabel: "当前盈亏",
  yes: "是",
  no: "否",
  learnTitle: "学习",
  learn: "移动止损随价格滚动以锁定利润：多头止损 = max(初始止损, 现价−跟踪距离)，空头反之。当已实现 R 达到触发 R（默认 1R）时可将止损移到成本（保本）。锁定 R 表示若现按移动止损平仓能锁定的 R 倍数。",
};
const en = {
  title: "Trailing / Break-even Stop",
  subtitle: "R achieved = profit ÷ risk/unit; trailing stop rolls with price; break-even moves stop to cost at trigger R. Educational, not investment advice.",
  entryLabel: "Entry",
  stopLabel: "Initial Stop",
  priceLabel: "Current Price",
  trailLabel: "Trail Distance",
  sideLabel: "Side",
  long: "Long",
  short: "Short",
  presetLabels: {
    long5: "Long 5% stop", longBreakeven: "Long 1R BE",
    short5: "Short 5% stop", longTight: "Long tight", swing: "Swing 10% stop",
  },
  resultTitle: "Results",
  riskLabel: "Risk per unit",
  stopPctLabel: "Stop distance %",
  rLabel: "R Achieved",
  trailStopLabel: "Trailing Stop",
  beLabel: "Break-even",
  lockLabel: "Lock-in R",
  profitLabel: "Current P&L",
  yes: "Yes",
  no: "No",
  learnTitle: "Learn",
  learn: "A trailing stop rolls with price to lock profit: long stop = max(initial stop, price − trail), short mirror. When R achieved reaches trigger R (default 1R) you can move stop to cost (break-even). Lock-in R is the R locked if you close at the trailing stop now.",
};
function fmtNum(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}
export default function TrailingStopPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [entry, setEntry] = useState(100);
  const [stop, setStop] = useState(90);
  const [price, setPrice] = useState(112);
  const [trailDistance, setTrailDistance] = useState(10);
  const [side, setSide] = useState("long");
  const res = useMemo(
    () => trailingStopSummary({ entry, stop, price, trailDistance, side }),
    [entry, stop, price, trailDistance, side],
  );
  const applyPreset = (p) => {
    setEntry(p.entry); setStop(p.stop); setPrice(p.price);
    setTrailDistance(p.trailDistance); setSide(p.side || "long");
  };
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="trailing-stop" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(TRAILING_STOP_PRESETS).map((p) => (
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
              <span className="text-xs text-slate-500">{L.priceLabel}</span>
              <input type="number" value={price} step={0.01}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.trailLabel}</span>
              <input type="number" value={trailDistance} min={0.01} step={0.01}
                onChange={(e) => setTrailDistance(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block col-span-2">
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
                <div><div className="text-xs text-slate-400">{L.stopPctLabel}</div><div className="font-mono text-lg">{fmtPct(res.stopPct)}</div></div>
                <div><div className="text-xs text-slate-400">{L.rLabel}</div><div className="font-mono text-lg">{fmtNum(res.rAchieved)}</div></div>
                <div><div className="text-xs text-slate-400">{L.trailStopLabel}</div><div className="font-mono text-lg">{fmtNum(res.trailingStop)}</div></div>
                <div><div className="text-xs text-slate-400">{L.beLabel}</div><div className={`font-semibold ${res.breakEvenTriggered ? "text-emerald-600" : "text-slate-400"}`}>{res.breakEvenTriggered ? L.yes : L.no}</div></div>
                <div><div className="text-xs text-slate-400">{L.lockLabel}</div><div className="font-mono text-lg">{fmtNum(res.lockInR)}</div></div>
                <div><div className="text-xs text-slate-400">{L.profitLabel}</div><div className="font-mono text-lg">{fmtNum(res.profit)}</div></div>
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