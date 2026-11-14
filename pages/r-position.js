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
import { rPositionSummary, R_POSITION_PRESETS } from "../lib/rPosition";
export const metadata = {
  title: "R-Multiple 头寸管理 — Weacond",
  description: "风险金额=账户×risk%；预期盈利=风险×R；最大亏损=风险；每笔期望值。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}
export default function RPositionPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [account, setAccount] = useState(100000);
  const [riskPct, setRiskPct] = useState(1);
  const [rMultiple, setRMultiple] = useState(2);
  const [winRate, setWinRate] = useState(50);
  const res = useMemo(
    () => rPositionSummary({ account, riskPct: riskPct / 100, rMultiple, winRate: winRate / 100 }),
    [account, riskPct, rMultiple, winRate],
  );
  const applyPreset = (p) => {
    setAccount(p.account);
    setRiskPct(p.riskPct * 100);
    setRMultiple(p.rMultiple);
    setWinRate(p.winRate * 100);
  };
  const band = res.band;
  const bandColor =
    band === "full" ? "text-rose-600" :
    band === "large" ? "text-amber-600" :
    band === "moderate" ? "text-indigo-600" :
    band === "small" ? "text-emerald-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="r-position" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/r-position"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "R-Multiple Position Sizing", href: "/r-position" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(R_POSITION_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.accountLabel}</span>
              <input type="number" value={account} min={0} step={10000}
                onChange={(e) => setAccount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.riskLabel}</span>
              <input type="number" value={riskPct} min={0.1} max={10} step={0.1}
                onChange={(e) => setRiskPct(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rLabel}</span>
              <input type="number" value={rMultiple} min={0.1} max={10} step={0.1}
                onChange={(e) => setRMultiple(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.winRateLabel}</span>
              <input type="number" value={winRate} min={0} max={100} step={1}
                onChange={(e) => setWinRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.expectancyLabel}</div>
                <div className={`text-4xl font-bold ${res.expectancy > 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmtMoney(res.expectancy)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.riskAmtLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.riskAmount)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.profitLabel}</div>
                  <div className="text-xl font-bold text-emerald-600">{fmtMoney(res.expectedProfit)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.maxLossLabel}</div>
                  <div className="text-xl font-bold text-rose-600">{fmtMoney(res.maxLoss)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.rrLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{res.rewardRisk.toFixed(1)} : 1</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/r-multiple" className="text-indigo-500 hover:underline">→ {L.linkR}</Link>
            {" · "}
            <Link href="/kelly" className="text-indigo-500 hover:underline">→ {L.linkKelly}</Link>
            {" · "}
            <Link href="/position-size" className="text-indigo-500 hover:underline">→ {L.linkPos}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
const zh = {
  title: "R-Multiple 头寸管理",
  subtitle: "风险金额=账户×risk%；预期盈利=风险×R；最大亏损=风险。教育性参考。",
  howToTitle: "如何使用 R-Multiple 头寸管理计算器",
  howTo: [
    "输入账户、风险百分比与预期 R（盈亏比）。",
    "计算器算风险金额 = 账户 × risk%，预期盈利 = 风险 × R，最大亏损 = 风险。",
    "据此设定头寸（教育性参考）。",
  ],
  accountLabel: "账户金额",
  riskLabel: "每笔风险 %",
  rLabel: "R 倍数",
  winRateLabel: "胜率 %",
  expectancyLabel: "每笔期望值",
  riskAmtLabel: "风险金额",
  profitLabel: "预期盈利",
  maxLossLabel: "最大亏损",
  rrLabel: "盈亏比",
  invalid: "账户须 >0，risk%>0，R>0。",
  disclaimer: "简化模型（假设 R 恒定），非投资建议。",
  linkR: "R-Multiple",
  linkKelly: "凯利",
  linkPos: "头寸管理",
  bandLabels: { none: "无", tiny: "极小 <0.5%", small: "小 0.5–1%", moderate: "中 1–2%", large: "大 2–5%", full: "大 ≥5%" },
  presetLabels: { standard: "标准 R=2", highR: "高 R=4", lowR: "低 R=1", tight: "紧风控 0.5%", loose: "宽风控 3%" },
};
const en = {
  title: "R-Multiple Position Sizing",
  subtitle: "Risk = account × risk%; profit = risk × R; max loss = risk. Educational.",
  howToTitle: "How to use the R-multiple position-sizing calculator",
  howTo: [
    "Enter the account, risk % and expected R (reward:risk).",
    "The calculator computes risk = account × risk%, profit = risk × R, max loss = risk.",
    "Use it to size the position (educational).",
  ],
  accountLabel: "Account",
  riskLabel: "Risk %/trade",
  rLabel: "R multiple",
  winRateLabel: "Win rate %",
  expectancyLabel: "Expectancy/trade",
  riskAmtLabel: "Risk amount",
  profitLabel: "Expected profit",
  maxLossLabel: "Max loss",
  rrLabel: "Reward:Risk",
  invalid: "Account > 0, risk% > 0, R > 0.",
  disclaimer: "Simplified model (constant R). Not investment advice.",
  linkR: "R-Multiple",
  linkKelly: "Kelly",
  linkPos: "Position Size",
  bandLabels: { none: "None", tiny: "Tiny <0.5%", small: "Small 0.5–1%", moderate: "Mod 1–2%", large: "Large 2–5%", full: "Large ≥5%" },
  presetLabels: { standard: "Std R=2", highR: "High R=4", lowR: "Low R=1", tight: "Tight 0.5%", loose: "Loose 3%" },
};
