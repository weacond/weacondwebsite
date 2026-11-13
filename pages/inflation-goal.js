"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import { inflationGoalSummary, INFLATION_GOAL_PRESETS } from "../lib/inflationGoal";
export const metadata = {
  title: "含通胀定投目标 — Weacond",
  description: "名义终值→实际终值(剔除通胀)；求达成实际目标所需月投。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "含通胀的定投目标计算器",
  subtitle: "名义终值复利后除以(1+通胀)^n得实际终值；反推达成实际目标所需月投。教育性参考，非投资建议。",
  principalLabel: "本金",
  monthlyLabel: "月投",
  rateLabel: "名义年化 %",
  inflationLabel: "通胀 %",
  yearsLabel: "年限",
  goalLabel: "实际目标",
  presetLabels: { retirement: "退休 低通胀", highInflation: "高通胀", homeDown: "首付目标", education: "教育基金", erode: "通胀侵蚀" },
  resultTitle: "结果",
  nomFVLabel: "名义终值",
  realFVLabel: "实际终值",
  reqMonthlyLabel: "达成目标需月投",
  shortfallLabel: "月投缺口",
  bandLabel: "通胀等级",
  bandText: { deflation: "通缩", low: "低", moderate: "中", high: "高", "very-high": "极高", invalid: "无效" },
  learnTitle: "学习",
  learn: "名义终值随通胀贬值。实际终值 = 名义终值 ÷ (1+通胀)^n，反映购买力。反推「达成实际目标所需月投」帮你把通胀纳入储蓄计划。",
};
const en = {
  title: "Inflation-Adjusted DCA Goal",
  subtitle: "Nominal FV ÷ (1+inflation)^n = real FV; solve monthly contribution to hit a real goal. Educational, not investment advice.",
  principalLabel: "Principal",
  monthlyLabel: "Monthly",
  rateLabel: "Nominal Rate %",
  inflationLabel: "Inflation %",
  yearsLabel: "Years",
  goalLabel: "Real Goal",
  presetLabels: { retirement: "Retire Low-Inf", highInflation: "High Inf", homeDown: "Down Payment", education: "Education", erode: "Erosion" },
  resultTitle: "Results",
  nomFVLabel: "Nominal FV",
  realFVLabel: "Real FV",
  reqMonthlyLabel: "Monthly to Hit Goal",
  shortfallLabel: "Monthly Gap",
  bandLabel: "Inflation Level",
  bandText: { deflation: "Deflation", low: "Low", moderate: "Moderate", high: "High", "very-high": "Very high", invalid: "Invalid" },
  learnTitle: "Learn",
  learn: "Nominal FV loses value to inflation. Real FV = nominal FV ÷ (1+inflation)^n reflects purchasing power. Solving 'monthly to hit goal' folds inflation into your savings plan.",
};
function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return "$" + x.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
export default function InflationGoalPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [principal, setPrincipal] = useState(100000);
  const [monthly, setMonthly] = useState(1000);
  const [rate, setRate] = useState(7);
  const [inflation, setInflation] = useState(2.5);
  const [years, setYears] = useState(30);
  const [goal, setGoal] = useState(1000000);
  const res = useMemo(
    () => inflationGoalSummary({ principal, monthly, annualRate: rate / 100, inflation: inflation / 100, years, realGoal: goal }),
    [principal, monthly, rate, inflation, years, goal],
  );
  const applyPreset = (p) => {
    setPrincipal(p.principal); setMonthly(p.monthly);
    setRate(p.annualRate * 100); setInflation(p.inflation * 100);
    setYears(p.years); setGoal(p.realGoal);
  };
  const band = res.inflationBand || "invalid";
  const bandColor =
    band === "low" ? "text-emerald-600" :
    band === "moderate" ? "text-indigo-600" :
    band === "high" ? "text-amber-600" :
    band === "very-high" ? "text-rose-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="inflation-goal" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(INFLATION_GOAL_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels[p.id] || p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.principalLabel}</span>
              <input type="number" value={principal} min={0} step={1000}
                onChange={(e) => setPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.monthlyLabel}</span>
              <input type="number" value={monthly} min={0} step={100}
                onChange={(e) => setMonthly(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.goalLabel}</span>
              <input type="number" value={goal} min={0} step={10000}
                onChange={(e) => setGoal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateLabel}</span>
              <input type="number" value={rate} step={0.1}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.inflationLabel}</span>
              <input type="number" value={inflation} step={0.1}
                onChange={(e) => setInflation(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={1} max={100} step={1}
                onChange={(e) => setYears(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.resultTitle}</h2>
            {res.valid ? (
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-400">{L.nomFVLabel}</div><div className="font-mono text-lg">{fmtMoney(res.nominalFV)}</div></div>
                <div><div className="text-xs text-slate-400">{L.realFVLabel}</div><div className="font-mono text-lg">{fmtMoney(res.realFV)}</div></div>
                <div><div className="text-xs text-slate-400">{L.reqMonthlyLabel}</div><div className="font-mono text-lg">{fmtMoney(res.requiredMonthly)}</div></div>
                <div><div className="text-xs text-slate-400">{L.shortfallLabel}</div><div className="font-mono text-lg">{fmtMoney(res.monthlyShortfall)}</div></div>
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