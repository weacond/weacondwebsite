"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import Link from "next/link";
import {
  stakeSummary, STAKING_PRESETS,
} from "../lib/staking";
export const metadata = {
  title: "加密质押收益 / 通胀侵蚀计算器 — Weacond",
  description: "总奖励=P·((1+apy)^n−1)，净收益率=apy−通胀，通胀侵蚀后终值。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
function fmtNum(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
export default function StakingPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [principal, setPrincipal] = useState(100);
  const [apy, setApy] = useState(4); // 百分比
  const [inflationRate, setInflationRate] = useState(2); // 百分比
  const [years, setYears] = useState(3);
  const res = useMemo(
    () => stakeSummary({ principal, apy: apy / 100, inflationRate: inflationRate / 100, years }),
    [principal, apy, inflationRate, years],
  );
  const applyPreset = (p) => {
    setPrincipal(p.principal);
    setApy(p.apy * 100);
    setInflationRate(p.inflationRate * 100);
    setYears(p.years);
  };
  const band = res.band;
  const bandColor =
    band === "high" ? "text-emerald-600" :
    band === "moderate" ? "text-amber-600" :
    band === "low" ? "text-indigo-600" :
    "text-rose-600";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="staking" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(STAKING_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.principalLabel}</span>
              <input type="number" value={principal} min={0} step={1}
                onChange={(e) => setPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.apyLabel}</span>
              <input type="number" value={apy} min={0} max={50} step={0.1}
                onChange={(e) => setApy(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.inflLabel}</span>
              <input type="number" value={inflationRate} min={0} max={50} step={0.1}
                onChange={(e) => setInflationRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={0} max={30} step={1}
                onChange={(e) => setYears(Math.max(0, Math.floor(parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.rewardLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtNum(res.stakingReward)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.netLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{(res.netYield * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.erodedLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtNum(res.inflationEroded)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.annLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{fmtNum(res.annualReward)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.yearsLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{years} {L.yearUnit}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/compound" className="text-indigo-500 hover:underline">→ {L.linkCompound}</Link>
            {" · "}
            <Link href="/real-return" className="text-indigo-500 hover:underline">→ {L.linkRealReturn}</Link>
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
  title: "加密质押收益 / 通胀侵蚀",
  subtitle: "总奖励=P·((1+apy)^n−1)；净收益率=apy−通胀；通胀侵蚀后终值。教育性参考。",
  principalLabel: "持有数量",
  apyLabel: "质押年化 %",
  inflLabel: "代币通胀 %",
  yearsLabel: "年数",
  rewardLabel: "总质押奖励",
  netLabel: "净收益率",
  erodedLabel: "通胀侵蚀后终值",
  annLabel: "年度奖励",
  yearUnit: "年",
  invalid: "持有数须 >0，年数 ≥0。",
  disclaimer: "简化模型（假设 APY 恒定、无锁仓/滑点/价格变动），非投资建议。",
  linkCompound: "复利",
  linkRealReturn: "实际回报",
  linkRisk: "风险度量",
  bandLabels: { negative: "负 <0%", low: "低 0–3%", moderate: "中 3–7%", high: "高 ≥7%" },
  presetLabels: { ethStake: "ETH 质押", solStake: "SOL 质押", dotStake: "DOT 质押", highInfl: "高通胀代币", longStake: "长期 5Y" },
};
const en = {
  title: "Crypto Staking / Inflation Erosion",
  subtitle: "Total reward = P·((1+apy)^n−1); net yield = apy−inflation; inflation-eroded value. Educational.",
  principalLabel: "Amount held",
  apyLabel: "Staking APY %",
  inflLabel: "Token inflation %",
  yearsLabel: "Years",
  rewardLabel: "Total staking reward",
  netLabel: "Net yield",
  erodedLabel: "Inflation-eroded value",
  annLabel: "Annual reward",
  yearUnit: "yr",
  invalid: "Amount > 0, years ≥ 0.",
  disclaimer: "Simplified model (constant APY, no lockup/slippage/price change). Not investment advice.",
  linkCompound: "Compound",
  linkRealReturn: "Real Return",
  linkRisk: "Risk metrics",
  bandLabels: { negative: "Neg <0%", low: "Low 0–3%", moderate: "Mod 3–7%", high: "High ≥7%" },
  presetLabels: { ethStake: "ETH Stake", solStake: "SOL Stake", dotStake: "DOT Stake", highInfl: "High Inflation", longStake: "Long 5Y" },
};
