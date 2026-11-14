"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import FaqLd from "../components/FaqLd";
import FaqSection from "../components/FaqSection";
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
  howToTitle: "如何使用移动止损/保本止损计算器",
  howTo: [
    "输入入场价、每单位风险与跟踪距离。",
    "设定触发 R（保本周期的触发点）。",
    "计算器滚动移动止损，并在达到触发 R 时移成本保本。",
    "查看已实现 R 与保本/移动止损价。",
  ],
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
  faqTitle: "常见问题",
  faqs: [
    { q: "移动止损怎么用？", a: "止损随价格滚动锁定利润：多头 = max(初始止损, 现价−跟踪距离)，空头反之。跟踪距离越大越抗噪但回吐越多。" },
    { q: "保本止损是什么？", a: "当已实现 R 达到触发 R（默认 1R）时，把止损移到成本价，使该笔最差不亏（仅可能亏手续费）。" },
    { q: "跟踪距离怎么选？", a: "取决于波动与持仓周期：日内用较小距离，波段用较大；过大易回吐、过小易被震出，常见 0.5–2 倍 ATR 或 5–10%。" },
    { q: "锁定 R 代表什么？", a: "锁定 R = 若现按移动止损平仓能锁定的 R 倍数，用于判断是否已实现足够利润可上保本。" },
  ],
};
const en = {
  title: "Trailing / Break-even Stop",
  subtitle: "R achieved = profit ÷ risk/unit; trailing stop rolls with price; break-even moves stop to cost at trigger R. Educational, not investment advice.",
  howToTitle: "How to use the trailing / break-even stop calculator",
  howTo: [
    "Enter entry price, risk per unit and the trail distance.",
    "Set the trigger R for the break-even phase.",
    "The calculator rolls the trailing stop and moves it to cost at trigger R.",
    "Read R achieved and the break-even / trailing stop price.",
  ],
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
  faqTitle: "FAQ",
  faqs: [
    { q: "How do I use a trailing stop?", a: "The stop rolls with price to lock profit: long = max(initial stop, price − trail), short mirror. A larger trail tolerates more noise but gives back more." },
    { q: "What is a break-even stop?", a: "When R achieved hits trigger R (default 1R), move the stop to cost so the trade can no longer lose (fees aside)." },
    { q: "How to choose the trail distance?", a: "Match it to volatility and holding period: smaller intraday, larger for swing; too wide gives back profit, too tight gets shaken out — commonly 0.5–2× ATR or 5–10%." },
    { q: "What does lock-in R mean?", a: "Lock-in R is the R you would lock if you closed at the trailing stop now — a cue for whether enough profit is in to move to break-even." },
  ],
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
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/trailing-stop"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Trailing / Break-even Stop", href: "/trailing-stop" }]),
      ]} />
      <FaqLd questions={L.faqs} />
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
          <FaqSection faqs={L.faqs} title={L.faqTitle} />
        </div>
      </section>
      <Footer />
    </div>
  );
}