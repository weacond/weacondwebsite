"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import { continuousSummary, CONTINUOUS_PRESETS } from "../lib/continuousCompound";
export const metadata = {
  title: "连续复利计算器 — Weacond",
  description: "FV=P·e^(rt)；倍增倍数=e^(rt)；连续有效利率=e^r−1。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "连续复利计算器",
  subtitle: "终值=P·e^(rt)；倍增倍数=e^(rt)；连续有效利率=e^r−1。教育性参考，非投资建议。",
  howToTitle: "如何使用连续复利计算器",
  howTo: [
    "输入本金 P、利率 r 与时间 t。",
    "计算器按 终值 = P·e^(rt) 算终值与倍增倍数。",
    "查看连续有效利率 = e^r − 1。",
  ],
  principalLabel: "本金", rateLabel: "年化 %", yearsLabel: "年数",
  presetLabels: { modest: "稳健 5%/10y", growth: "成长 8%/20y", long: "长线 7%/30y", high: "高增 15%/15y", low: "低增 2%/5y" },
  resultTitle: "结果", fvLabel: "连续复利终值", multLabel: "倍增倍数",
  interestLabel: "利息部分", effLabel: "期间有效利率", earLabel: "连续有效年利率", bandLabel: "增长等级",
  bandText: { flat: "平", growth: "增长", strong: "强", exponential: "指数", invalid: "无效" },
  learnTitle: "学习",
  learn: "连续复利假设收益每秒再投资，终值 FV=P·e^(rt)。倍增倍数 e^(rt) 告诉你本金放大多少倍；期间有效利率 e^(rt)−1 是整段期间的总回报。连续有效年利率 e^r−1 略高于名义 r，是复利的理论上限。",
};
const en = {
  title: "Continuous Compounding",
  subtitle: "FV=P·e^(rt); multiplier=e^(rt); continuous EAR=e^r−1. Educational, not investment advice.",
  howToTitle: "How to use the continuous-compounding calculator",
  howTo: [
    "Enter principal P, rate r and time t.",
    "The calculator computes FV = P·e^(rt) and the multiplier.",
    "Read the continuous effective rate = e^r − 1.",
  ],
  principalLabel: "Principal", rateLabel: "Annual Rate %", yearsLabel: "Years",
  presetLabels: { modest: "Modest 5%/10y", growth: "Growth 8%/20y", long: "Long 7%/30y", high: "High 15%/15y", low: "Low 2%/5y" },
  resultTitle: "Results", fvLabel: "Continuous FV", multLabel: "Multiplier",
  interestLabel: "Interest", effLabel: "Period Effective Rate", earLabel: "Continuous EAR", bandLabel: "Growth Level",
  bandText: { flat: "Flat", growth: "Growth", strong: "Strong", exponential: "Exponential", invalid: "Invalid" },
  learnTitle: "Learn",
  learn: "Continuous compounding assumes returns reinvested every instant: FV=P·e^(rt). The multiplier e^(rt) shows how many times the principal grows; period effective rate e^(rt)−1 is total return over the span. Continuous EAR e^r−1 slightly exceeds the nominal r — the theoretical ceiling of compounding.",
};
function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return "$" + x.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtX(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(3) + "×";
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(3) + "%";
}

export default function ContinuousPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(20);
  const res = useMemo(
    () => continuousSummary({ principal, annualRate: rate / 100, years }),
    [principal, rate, years],
  );
  const applyPreset = (p) => {
    setPrincipal(p.principal); setRate(p.annualRate * 100); setYears(p.years);
  };
  const band = res.band || "invalid";
  const bandColor =
    band === "growth" ? "text-emerald-600" :
    band === "strong" ? "text-indigo-600" :
    band === "exponential" ? "text-rose-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="continuous" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/continuous"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Continuous Compounding", href: "/continuous" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(CONTINUOUS_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels[p.id] || p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.principalLabel}</span>
              <input type="number" value={principal} min={0} step={1000}
                onChange={(e) => setPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateLabel}</span>
              <input type="number" value={rate} step={0.1}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={0} step={1}
                onChange={(e) => setYears(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.resultTitle}</h2>
            {res.valid ? (
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-400">{L.fvLabel}</div><div className="font-mono text-lg">{fmtMoney(res.futureValue)}</div></div>
                <div><div className="text-xs text-slate-400">{L.multLabel}</div><div className="font-mono text-lg">{fmtX(res.multiplier)}</div></div>
                <div><div className="text-xs text-slate-400">{L.interestLabel}</div><div className="font-mono text-lg">{fmtMoney(res.interest)}</div></div>
                <div><div className="text-xs text-slate-400">{L.effLabel}</div><div className="font-mono text-lg">{fmtPct(res.effectiveRate)}</div></div>
                <div><div className="text-xs text-slate-400">{L.earLabel}</div><div className="font-mono text-lg">{fmtPct(res.ear)}</div></div>
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