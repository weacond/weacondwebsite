"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import Link from "next/link";
import { ddSizingSummary, DD_SIZING_PRESETS } from "../lib/drawdownSizing";
export const metadata = {
  title: "回撤→头寸缩放计算器 — Weacond",
  description: "头寸=targetDD/stratDD；缩放收益；每笔最大亏损；风险调整夏普。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(1) + "%";
}
function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}
export default function DdSizingPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [account, setAccount] = useState(100000);
  const [targetDD, setTargetDD] = useState(15);
  const [strategyDD, setStrategyDD] = useState(30);
  const [stratReturn, setStratReturn] = useState(25);
  const [stratVol, setStratVol] = useState(20);
  const [numTrades, setNumTrades] = useState(50);
  const res = useMemo(
    () => ddSizingSummary({
      account, targetDD: targetDD / 100, strategyDD: strategyDD / 100,
      stratReturn: stratReturn / 100, stratVol: stratVol / 100, numTrades,
    }),
    [account, targetDD, strategyDD, stratReturn, stratVol, numTrades],
  );
  const applyPreset = (p) => {
    setAccount(p.account);
    setTargetDD(p.targetDD * 100);
    setStrategyDD(p.strategyDD * 100);
    setStratReturn(p.stratReturn * 100);
    setStratVol(p.stratVol * 100);
    setNumTrades(p.numTrades);
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
      <CalcLd slug="drawdown-sizing" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(DD_SIZING_PRESETS).map((p) => (
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
              <span className="text-xs text-slate-500">{L.targetDDLabel}</span>
              <input type="number" value={targetDD} min={0.1} max={50} step={0.5}
                onChange={(e) => setTargetDD(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.strategyDDLabel}</span>
              <input type="number" value={strategyDD} min={0.1} max={100} step={0.5}
                onChange={(e) => setStrategyDD(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.stratReturnLabel}</span>
              <input type="number" value={stratReturn} min={0} max={100} step={0.5}
                onChange={(e) => setStratReturn(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.stratVolLabel}</span>
              <input type="number" value={stratVol} min={0} max={100} step={0.5}
                onChange={(e) => setStratVol(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.numTradesLabel}</span>
              <input type="number" value={numTrades} min={1} max={500} step={1}
                onChange={(e) => setNumTrades(Math.max(1, Math.floor(parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.positionLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtPct(res.position)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.scaledReturnLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.scaledReturn)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.maxLossLabel}</div>
                  <div className="text-xl font-bold text-rose-600">{fmtMoney(res.maxLossPerTrade)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.accountLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.account)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.scaledSharpeLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{res.scaledSharpe > 0 ? res.scaledSharpe.toFixed(2) : "—"}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/position-size" className="text-indigo-500 hover:underline">→ {L.linkPosition}</Link>
            {" · "}
            <Link href="/kelly" className="text-indigo-500 hover:underline">→ {L.linkKelly}</Link>
            {" · "}
            <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
const zh = {
  title: "回撤→头寸缩放",
  subtitle: "头寸=targetDD/stratDD；缩放收益；每笔最大亏损。教育性参考。",
  accountLabel: "账户金额",
  targetDDLabel: "目标最大回撤 %",
  strategyDDLabel: "策略历史回撤 %",
  stratReturnLabel: "策略年化收益 %",
  stratVolLabel: "策略年化波动 %",
  numTradesLabel: "交易次数",
  positionLabel: "头寸比例",
  scaledReturnLabel: "缩放年化收益",
  maxLossLabel: "每笔最大亏损",
  scaledSharpeLabel: "风险调整夏普",
  invalid: "账户须 >0，回撤 0.1–100%。",
  disclaimer: "简化模型（假设回撤与收益线性缩放），非投资建议。",
  linkPosition: "头寸管理",
  linkKelly: "凯利",
  linkRisk: "风险",
  bandLabels: { zero: "零", small: "小 0–25%", moderate: "中 25–50%", large: "大 50–75%", full: "满仓 ≥75%" },
  presetLabels: { conservative: "保守 10%", standard: "标准 15%", aggressive: "激进 25%", lowDD: "低回撤 5%", highDD: "高回撤 30%" },
};
const en = {
  title: "Drawdown → Position Sizing",
  subtitle: "Position = targetDD/stratDD; scaled return; max loss/trade. Educational.",
  accountLabel: "Account size",
  targetDDLabel: "Target max DD %",
  strategyDDLabel: "Strategy max DD %",
  stratReturnLabel: "Strategy return %",
  stratVolLabel: "Strategy vol %",
  numTradesLabel: "Num trades",
  positionLabel: "Position size",
  scaledReturnLabel: "Scaled annual return",
  maxLossLabel: "Max loss / trade",
  scaledSharpeLabel: "Risk-adj. Sharpe",
  invalid: "Account > 0, DD 0.1–100%.",
  disclaimer: "Simplified model (linear scaling). Not investment advice.",
  linkPosition: "Position Size",
  linkKelly: "Kelly",
  linkRisk: "Risk",
  bandLabels: { zero: "Zero", small: "Small 0–25%", moderate: "Moderate 25–50%", large: "Large 50–75%", full: "Full ≥75%" },
  presetLabels: { conservative: "Cons 10%", standard: "Std 15%", aggressive: "Aggr 25%", lowDD: "LowDD 5%", highDD: "HighDD 30%" },
};
