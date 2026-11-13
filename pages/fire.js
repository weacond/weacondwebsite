"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import { fireSummary, FIRE_PRESETS } from "../lib/fire";
export const metadata = {
  title: "FIRE 财务自由计算器 — Weacond",
  description: "FIRE 目标=年支出/安全提取率；由储蓄率+实际增长求达标年数。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "FIRE 财务自由计算器",
  subtitle: "FIRE 目标=年支出/安全提取率；由储蓄率与实际增长求达标年数。教育性参考，非投资建议。",
  expenseLabel: "年支出", swrLabel: "安全提取率 %", savingsLabel: "当前储蓄",
  savingsRateLabel: "储蓄率 %", growthLabel: "实际增长 %",
  presetLabels: { fast: "快速 FIRE", typical: "典型", slow: "缓慢 3%提取", aggressive: "激进 50%储蓄", coast: "Coast 0 当前" },
  resultTitle: "结果", targetLabel: "FIRE 资金目标", annualSaveLabel: "每年新增储蓄",
  yearsLabel: "达标年数", bandLabel: "时间等级",
  bandText: { now: "已达标", near: "近期", moderate: "中期", far: "远期", "very-far": "极远", invalid: "无效" },
  learnTitle: "学习",
  learn: "FIRE 资金目标 = 年支出 ÷ 安全提取率（4% 规则即 25× 支出）。每年新增储蓄 = 储蓄率 × 年支出，按实际增长复利。闭式解 n = ln(x)/ln(1+g) 给出达标年数。储蓄率越高、增长越稳，越早自由。",
};
const en = {
  title: "FIRE / Financial Freedom",
  subtitle: "FIRE target = expense / safe-withdrawal; solve years from savings rate + real growth. Educational, not investment advice.",
  expenseLabel: "Annual Expense", swrLabel: "Safe Withdrawal %", savingsLabel: "Current Savings",
  savingsRateLabel: "Savings Rate %", growthLabel: "Real Growth %",
  presetLabels: { fast: "Fast FIRE", typical: "Typical", slow: "Slow 3% SW", aggressive: "Aggressive 50%", coast: "Coast 0 now" },
  resultTitle: "Results", targetLabel: "FIRE Target", annualSaveLabel: "Annual Savings",
  yearsLabel: "Years to FIRE", bandLabel: "Time Level",
  bandText: { now: "Already", near: "Near", moderate: "Mid", far: "Far", "very-far": "Very far", invalid: "Invalid" },
  learnTitle: "Learn",
  learn: "FIRE target = expense ÷ safe-withdrawal (the 4% rule = 25× expense). Annual savings = savings rate × expense, compounding at real growth. The closed form n = ln(x)/ln(1+g) gives years to freedom. Higher savings rate and steadier growth get you there sooner.",
};
function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return "$" + x.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtYears(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(1) + "y";
}

export default function FirePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [expense, setExpense] = useState(60000);
  const [swr, setSwr] = useState(4);
  const [savings, setSavings] = useState(100000);
  const [savingsRate, setSavingsRate] = useState(25);
  const [growth, setGrowth] = useState(5);
  const res = useMemo(
    () => fireSummary({ annualExpense: expense, safeWithdrawalRate: swr / 100, currentSavings: savings, savingsRate: savingsRate / 100, realGrowth: growth / 100 }),
    [expense, swr, savings, savingsRate, growth],
  );
  const applyPreset = (p) => {
    setExpense(p.annualExpense); setSwr(p.safeWithdrawalRate * 100);
    setSavings(p.currentSavings); setSavingsRate(p.savingsRate * 100); setGrowth(p.realGrowth * 100);
  };
  const band = res.band || "invalid";
  const bandColor =
    band === "now" ? "text-emerald-600" :
    band === "near" ? "text-emerald-600" :
    band === "moderate" ? "text-indigo-600" :
    band === "far" ? "text-amber-600" :
    band === "very-far" ? "text-rose-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="fire" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(FIRE_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels[p.id] || p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.expenseLabel}</span>
              <input type="number" value={expense} min={0} step={1000}
                onChange={(e) => setExpense(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.savingsLabel}</span>
              <input type="number" value={savings} min={0} step={10000}
                onChange={(e) => setSavings(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.savingsRateLabel}</span>
              <input type="number" value={savingsRate} min={0} max={100} step={1}
                onChange={(e) => setSavingsRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.swrLabel}</span>
              <input type="number" value={swr} min={0.1} step={0.1}
                onChange={(e) => setSwr(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.growthLabel}</span>
              <input type="number" value={growth} step={0.1}
                onChange={(e) => setGrowth(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.resultTitle}</h2>
            {res.valid ? (
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-400">{L.targetLabel}</div><div className="font-mono text-lg">{fmtMoney(res.fireTarget)}</div></div>
                <div><div className="text-xs text-slate-400">{L.annualSaveLabel}</div><div className="font-mono text-lg">{fmtMoney(res.annualSavings)}</div></div>
                <div><div className="text-xs text-slate-400">{L.yearsLabel}</div><div className="font-mono text-lg">{fmtYears(res.years)}</div></div>
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