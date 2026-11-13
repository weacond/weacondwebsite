"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import { fundingSummary, FUNDING_PRESETS } from "../lib/fundingRate";
export const metadata = {
  title: "永续资金费率成本计算器 — Weacond",
  description: "资金费=名义本金×费率×期数；年化=费率×每年期数；空头可收资金费。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "永续资金费率成本计算器",
  subtitle: "资金费 = 名义本金 × 费率 × 期数；年化 = 费率 × 每年期数；费率为负时持有方收资金费。教育性参考，非投资建议。",
  notionalLabel: "名义本金", rateLabel: "资金费率 %/8h", daysLabel: "持有天数", ppdLabel: "每天期数",
  presetLabels: { normalLong: "多头 0.01%/8h · 7天", highFunding: "高费 0.05%/8h · 30天", shortReceives: "空头收 0.01%/8h · 30天", weekly: "7天 0.01%/8h", monthly: "30天 0.01%/8h" },
  resultTitle: "结果", costLabel: "总资金成本", fracLabel: "占本金比例", annLabel: "年化资金费率", bandLabel: "成本等级",
  bandText: { none: "无", low: "低", moderate: "中", high: "高", "very-high": "极高", invalid: "无效" },
  learnTitle: "学习",
  learn: "永续合约每 8 小时结算一次资金费，费率由多空 imbalance 决定。单期成本 = 名义本金 × 费率；N 期总成本 = 名义本金 × 费率 × N。年化 = 费率 × 每年期数（默认 1095）。费率为正时多头付、空头收；为负则相反。高费率长期持仓成本不可忽视。",
};
const en = {
  title: "Funding Rate Cost",
  subtitle: "Cost = notional × rate × periods; annualized = rate × periods/year; negative rate means you receive funding. Educational, not investment advice.",
  notionalLabel: "Notional", rateLabel: "Funding %/8h", daysLabel: "Days Held", ppdLabel: "Periods/Day",
  presetLabels: { normalLong: "Long 0.01%/8h · 7d", highFunding: "High 0.05%/8h · 30d", shortReceives: "Short recv 0.01%/8h · 30d", weekly: "7d 0.01%/8h", monthly: "30d 0.01%/8h" },
  resultTitle: "Results", costLabel: "Total Funding", fracLabel: "% of Notional", annLabel: "Annualized Rate", bandLabel: "Cost Level",
  bandText: { none: "None", low: "Low", moderate: "Moderate", high: "High", "very-high": "Very high", invalid: "Invalid" },
  learnTitle: "Learn",
  learn: "Perpetuals settle funding every 8h; the rate reflects long/short imbalance. Single-period cost = notional × rate; N-period cost = notional × rate × N. Annualized = rate × periods/year (default 1095). A positive rate means longs pay shorts; negative reverses it. High-rate long holds are not free.",
};
function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return "$" + x.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(3) + "%";
}

export default function FundingPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [notional, setNotional] = useState(100000);
  const [rate, setRate] = useState(0.01);
  const [days, setDays] = useState(7);
  const [ppd, setPpd] = useState(3);
  const res = useMemo(
    () => fundingSummary({ notional, fundingRatePct: rate, days, periodsPerDay: ppd }),
    [notional, rate, days, ppd],
  );
  const applyPreset = (p) => {
    setNotional(p.notional); setRate(p.fundingRatePct); setDays(p.days);
  };
  const band = res.band || "invalid";
  const bandColor =
    band === "none" ? "text-slate-400" :
    band === "low" ? "text-emerald-600" :
    band === "moderate" ? "text-indigo-600" :
    band === "high" ? "text-amber-600" :
    band === "very-high" ? "text-rose-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>{L.title} — Weacond</title>
        <meta name="description" content={L.subtitle} />
      </Head>
      <Navbar />
      <section className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{L.title}</h1>
        <p className="text-sm text-slate-500 mb-6">{L.subtitle}</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.values(FUNDING_PRESETS).map((p) => (
            <button key={p.id} onClick={() => applyPreset(p)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:border-indigo-300 transition">
              {L.presetLabels[p.id] || p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <label className="block">
            <span className="text-xs text-slate-500">{L.notionalLabel}</span>
            <input type="number" value={notional} min={0} step={1000}
              onChange={(e) => setNotional(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{L.rateLabel}</span>
            <input type="number" value={rate} step={0.001}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{L.daysLabel}</span>
            <input type="number" value={days} min={0} step={1}
              onChange={(e) => setDays(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{L.ppdLabel}</span>
            <input type="number" value={ppd} min={0.1} step={0.5}
              onChange={(e) => setPpd(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
          </label>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.resultTitle}</h2>
          {res.valid ? (
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-slate-400">{L.costLabel}</div><div className="font-mono text-lg">{fmtMoney(res.totalCost)}</div></div>
              <div><div className="text-xs text-slate-400">{L.fracLabel}</div><div className="font-mono text-lg">{fmtPct(res.costFraction)}</div></div>
              <div><div className="text-xs text-slate-400">{L.annLabel}</div><div className="font-mono text-lg">{fmtPct(res.annualized)}</div></div>
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
      </section>
      <Footer />
    </div>
  );
}