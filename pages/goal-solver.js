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
import { goalSolverSummary, GOAL_PRESETS } from "../lib/goalSolver";
export const metadata = {
  title: "目标储蓄 / 复利逆解器 — Weacond",
  description: "所需利率=(FV/PV)^(1/n)−1；所需年数=ln(FV/PV)/ln(1+r)；所需定投额。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(1) + "%";
}
export default function GoalSolverPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [pv, setPv] = useState(50000);
  const [fv, setFv] = useState(1000000);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(5);
  const res = useMemo(
    () => goalSolverSummary({ pv, fv, years, rate: rate / 100 }),
    [pv, fv, years, rate],
  );
  const applyPreset = (p) => {
    setPv(p.pv);
    setFv(p.fv);
    setYears(p.years);
    setRate(p.rate * 100);
  };
  const band = res.band;
  const bandColor =
    band === "ahead" ? "text-emerald-600" :
    band === "onTrack" ? "text-indigo-600" :
    band === "behind" ? "text-amber-600" :
    "text-rose-600";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="goal-solver" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/goal-solver"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Goal Solver / Compound Inverse", href: "/goal-solver" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(GOAL_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.pvLabel}</span>
              <input type="number" value={pv} min={0} step={10000}
                onChange={(e) => setPv(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.fvLabel}</span>
              <input type="number" value={fv} min={0} step={50000}
                onChange={(e) => setFv(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={1} max={50} step={1}
                onChange={(e) => setYears(Math.max(1, Math.floor(parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateLabel}</span>
              <input type="number" value={rate} min={0} max={30} step={0.1}
                onChange={(e) => setRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.reqRateLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtPct(res.requiredRate)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.reqYearsLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.requiredYears > 0 ? res.requiredYears.toFixed(1) + " " + L.yearUnit : "—"}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.reqPmtLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{fmtMoney(res.requiredContribution)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.pvLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.pv)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.fvLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.fv)}</div>
                </div>
              </div>
              {res.gap > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 shadow-sm border border-amber-100 mb-4 text-center">
                  <div className="text-xs text-amber-500 mb-1">{L.gapLabel}</div>
                  <div className="text-lg font-bold text-amber-700">{fmtMoney(res.gap)} ({(res.gapPct * 100).toFixed(1)}%)</div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/compound" className="text-indigo-500 hover:underline">→ {L.linkCompound}</Link>
            {" · "}
            <Link href="/annuity" className="text-indigo-500 hover:underline">→ {L.linkAnnuity}</Link>
            {" · "}
            <Link href="/real-return" className="text-indigo-500 hover:underline">→ {L.linkRealReturn}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
const zh = {
  title: "目标储蓄 / 复利逆解器",
  subtitle: "所需利率=(FV/PV)^(1/n)−1；所需年数；所需定投额。教育性参考。",
  howToTitle: "如何使用目标储蓄/复利逆解器",
  howTo: [
    "输入现值 PV、目标终值 FV 与已知量（利率或年数）。",
    "计算器反解所需利率 = (FV/PV)^(1/n) − 1。",
    "查看达成目标所需年数与所需定投额。",
  ],
  pvLabel: "现有本金",
  fvLabel: "目标金额",
  yearsLabel: "年数",
  rateLabel: "年化利率 %",
  reqRateLabel: "所需年化利率",
  reqYearsLabel: "所需年数",
  reqPmtLabel: "每年定投",
  gapLabel: "缺口（本金复利不足部分）",
  yearUnit: "年",
  invalid: "目标金额须 >0，年数 ≥1。",
  disclaimer: "简化模型（假设利率恒定），非投资建议。",
  linkCompound: "复利",
  linkAnnuity: "年金给付",
  linkRealReturn: "实际回报",
  bandLabels: { insufficient: "不足", behind: "落后 0.8–1.0", onTrack: "达标 1.0–1.2", ahead: "超前 ≥1.2" },
  presetLabels: { retirement: "退休 100万", house: "购房 50万", education: "教育 30万", quick: "快速翻倍", aggressive: "激进 200万" },
};
const en = {
  title: "Goal Solver / Compound Inverse",
  subtitle: "Required rate=(FV/PV)^(1/n)−1; required years; required contribution. Educational.",
  howToTitle: "How to use the goal-solver / compound-inverse calculator",
  howTo: [
    "Enter present value PV, target FV and one known (rate or years).",
    "The calculator inverts for the required rate = (FV/PV)^(1/n) − 1.",
    "Read the years and contribution needed to reach the goal.",
  ],
  pvLabel: "Present value",
  fvLabel: "Target amount",
  yearsLabel: "Years",
  rateLabel: "Annual rate %",
  reqRateLabel: "Required annual rate",
  reqYearsLabel: "Required years",
  reqPmtLabel: "Annual contribution",
  gapLabel: "Gap (PV compound shortfall)",
  yearUnit: "yr",
  invalid: "Target > 0, years ≥ 1.",
  disclaimer: "Simplified model (constant rate). Not investment advice.",
  linkCompound: "Compound",
  linkAnnuity: "Annuity",
  linkRealReturn: "Real Return",
  bandLabels: { insufficient: "Insufficient", behind: "Behind 0.8–1.0", onTrack: "On track 1.0–1.2", ahead: "Ahead ≥1.2" },
  presetLabels: { retirement: "Retire 1M", house: "House 500k", education: "Edu 300k", quick: "Double", aggressive: "Aggr 2M" },
};
