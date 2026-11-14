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
import Link from "next/link";
import { kellySummary, KELLY_PRESETS } from "../lib/kelly";
export const metadata = {
  title: "凯利公式 — Weacond",
  description: "f*=p−q/b；几何增长率；分数凯利。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}
export default function KellyPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [pct, setPct] = useState(60);
  const [odds, setOdds] = useState(1);
  const res = useMemo(() => kellySummary({ winRate: pct / 100, odds }), [pct, odds]);
  const applyPreset = (p) => {
    setPct(p.winRate * 100); setOdds(p.odds);
  };
  const band = res.band;
  const bandColor =
    band === "aggressive" ? "text-rose-600" :
    band === "high" ? "text-amber-600" :
    band === "moderate" ? "text-indigo-600" :
    band === "low" ? "text-emerald-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="kelly" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/kelly"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Kelly Criterion", href: "/kelly" }]),
      ]} />
      <FaqLd questions={L.faqs} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(KELLY_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.pLabel}</span>
              <input type="number" value={pct} min={0} max={100} step={1}
                onChange={(e) => setPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.bLabel}</span>
              <input type="number" value={odds} min={0.1} step={0.1}
                onChange={(e) => setOdds(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.fStarLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtPct(res.fStar)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.halfLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{fmtPct(res.half)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.quarterLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{fmtPct(res.quarter)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.expLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{fmtPct(res.expectation)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.growthLabel}</div>
                  <div className="text-sm font-bold text-slate-800">{fmtPct(res.growth)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/risk-ruin" className="text-indigo-500 hover:underline">→ {L.linkRuin}</Link>
            {" · "}
            <Link href="/position-size" className="text-indigo-500 hover:underline">→ {L.linkPos}</Link>
          </p>
          <div className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-lg font-semibold mb-4">{L.faqTitle}</h2>
            <dl className="space-y-4">
              {(L.faqs || []).map((f, i) => (
                <div key={i} className="text-sm">
                  <dt className="font-medium text-slate-800">{f.q}</dt>
                  <dd className="text-slate-500 mt-1">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
const zh = {
  title: "凯利公式",
  subtitle: "f*=p−q/b；几何增长率；分数凯利。教育性参考。",
  howToTitle: "如何使用凯利公式计算器",
  howTo: [
    "输入胜率%与净赔率 b（平均盈利 ÷ 平均亏损）。",
    "计算器算最优仓位 f* = p − q/b。",
    "查看几何增长率（每单位期望）。",
    "读取半凯利/四分之一凯利——现实优势被高估，建议用分数凯利。",
    "若 f*≤0（无正期望），放弃该标的或改进策略。",
  ],
  pLabel: "胜率 %",
  bLabel: "净赔率 b",
  fStarLabel: "最优仓位 f*",
  halfLabel: "半凯利",
  quarterLabel: "四分之一凯利",
  expLabel: "每单位期望",
  growthLabel: "几何增长率",
  invalid: "输入无效。",
  disclaimer: "Kelly 假设无限重复、已知真实概率，现实会高估，建议用分数 Kelly。非投资建议。",
  linkRuin: "破产概率",
  linkPos: "头寸规模",
  bandLabels: { none: "不下注", low: "低 0–5%", moderate: "中 5–15%", high: "高 15–30%", aggressive: "激进 ≥30%" },
  presetLabels: { coinFlip: "公平投币", edge10: "10% 优势", highWin: "高胜率", highOdds: "高赔率", negative: "负期望" },
  faqTitle: "常见问题",
  faqs: [
    { q: "凯利公式怎么用？", a: "输入胜率 p 与净赔率 b（平均盈利÷平均亏损）得最优仓位 f*=p−q/b；建议用分数凯利，并对单笔风险设 1–2% 上限。" },
    { q: "为什么用分数凯利？", a: "全凯利假设概率已知、可无限重复；现实优势被高估，全凯利会造成 40–60% 回撤，多数人扛不住。分数凯利降低方差、更可承受。" },
    { q: "凯利和按风险定仓有何区别？", a: "凯利按优势定仓（优势大则下注大）；按风险百分比（如每笔 1%）保持单笔亏损恒定、更稳，多数交易者优先用它。" },
    { q: "期望为负还交易吗？", a: "不交易。最优仓位 f* 为负表示长期必亏，应放弃该标的或改进策略。" },
  ],
};
const en = {
  title: "Kelly Criterion",
  subtitle: "f*=p−q/b; growth rate; fractional Kelly. Educational.",
  howToTitle: "How to use the Kelly criterion calculator",
  howTo: [
    "Enter win rate % and net odds b (avg win ÷ avg loss).",
    "The calculator computes the optimal fraction f* = p − q/b.",
    "Read the geometric growth rate (expectation per unit).",
    "Check half / quarter Kelly — real edge is over-estimated, so use fractional Kelly.",
    "If f* ≤ 0 (no positive edge), skip the instrument or improve the strategy.",
  ],
  pLabel: "Win rate %",
  bLabel: "Net odds b",
  fStarLabel: "Optimal f*",
  halfLabel: "Half Kelly",
  quarterLabel: "Quarter Kelly",
  expLabel: "Exp/unit",
  growthLabel: "Growth rate",
  invalid: "Invalid input.",
  disclaimer: "Kelly assumes infinite repeats & known probabilities. Use fractional Kelly. Not investment advice.",
  linkRuin: "Risk of Ruin",
  linkPos: "Position Size",
  bandLabels: { none: "No bet", low: "Low 0–5%", moderate: "Mod 5–15%", high: "High 15–30%", aggressive: "Aggr ≥30%" },
  presetLabels: { coinFlip: "Coin flip", edge10: "10% edge", highWin: "High win", highOdds: "High odds", negative: "Negative" },
  faqTitle: "FAQ",
  faqs: [
    { q: "How do I use Kelly?", a: "Enter win rate p and net odds b (avg win / avg loss) to get f*=p−q/b; use fractional Kelly with a 1–2% per-trade cap." },
    { q: "Why fractional Kelly?", a: "Full Kelly assumes known probabilities and infinite repeats; real edge is over-estimated, causing 40–60% drawdowns. Fractional Kelly cuts variance." },
    { q: "Kelly vs risk-percent sizing?", a: "Kelly sizes by edge (bigger edge, bigger bet); risk-percent (e.g. 1% per trade) keeps dollar-risk constant and is steadier." },
    { q: "Trade with negative expectation?", a: "No. A negative optimal fraction means long-run loss; skip the instrument or improve the edge." },
  ],
};