"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CrossLinks from "../components/CrossLinks";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import Link from "next/link";
import {
  purchasingPower,
  ppBand,
  PP_PRESETS,
} from "../lib/purchasingPower";

export const metadata = {
  title: "购买力 / 通胀计算器 — Weacond",
  description: "通胀如何侵蚀货币：维持购买力所需名义金额、N 年后今日购买力、流失比、半衰期与 72 法则。教育性参考。",
  robots: { index: true, follow: true },
};

export default function PurchasingPowerPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [amount, setAmount] = useState(100000);
  const [inflation, setInflation] = useState(3); // 百分比
  const [years, setYears] = useState(10);
  const [realReturn, setRealReturn] = useState(0); // 百分比

  const args = useMemo(
    () => ({
      amount,
      inflation: inflation / 100,
      years,
      realReturn: realReturn / 100,
    }),
    [amount, inflation, years, realReturn],
  );

  const res = useMemo(() => purchasingPower(args), [args]);

  const applyPreset = (p) => {
    setAmount(p.amount);
    setInflation((p.inflation || 0) * 100);
    setYears(p.years);
    setRealReturn((p.realReturn || 0) * 100);
  };

  const band = ppBand(res.powerLost);
  const bandColor =
    band === "severe" ? "text-red-600" :
    band === "noticeable" ? "text-amber-600" :
    band === "mild" ? "text-indigo-600" : "text-slate-400";

  const money = (n) => (n === null || !Number.isFinite(n) ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }));
  const pct = (n) => (n === null || !Number.isFinite(n) ? "—" : `${Number(n).toFixed(1)}%`);
  const yrs = (n) => (n === null || !Number.isFinite(n) ? "—" : `${Number(n).toFixed(1)} ${L.yearWord}`);
  const inputCls = "w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="purchasing-power" />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/purchasing-power"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Purchasing Power", href: "/purchasing-power" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(PP_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels[p.id] ?? p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <label className="text-sm font-medium text-slate-600">{L.amountLabel}
              <input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.inflationLabel}
              <input type="number" className={inputCls} value={inflation} onChange={(e) => setInflation(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.yearsLabel}
              <input type="number" className={inputCls} value={years} onChange={(e) => setYears(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.realReturnLabel}
              <input type="number" className={inputCls} value={realReturn} onChange={(e) => setRealReturn(Number(e.target.value))} /></label>
          </div>

          {!res.valid && <p className="mt-3 text-xs text-amber-600">{L.invalid}</p>}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">{L.futureNominalLabel}</div>
              <div className="text-lg font-bold">{money(res.futureNominal)}</div>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">{L.realValueTodayLabel}</div>
              <div className="text-lg font-bold">{money(res.realValueToday)}</div>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">{L.factorLabel}</div>
              <div className="text-lg font-bold">{Number(res.factor).toFixed(3)}×</div>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">{L.requiredNominalLabel}</div>
              <div className="text-lg font-bold">{pct(res.requiredNominal * 100)}</div>
            </div>
            <div className={`col-span-2 text-center ${bandColor} font-bold`}>{L.powerLostLabel}: {pct(res.powerLost * 100)} · {L.bandLabels[band]}</div>
          </div>

          <div className="mt-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="text-xs text-slate-500">{L.halfLifeLabel}</div>
                <div className="font-mono text-sm">{yrs(res.halfLife)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">{L.rule72Label}</div>
                <div className="font-mono text-sm">{yrs(res.rule72)}</div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            <Link href="/inflation-goal" className="text-indigo-500 hover:underline">→ {L.linkInflationGoal}</Link>
            {" · "}
            <Link href="/real-return" className="text-indigo-500 hover:underline">→ {L.linkRealReturn}</Link>
            {" · "}
            <Link href="/fire" className="text-indigo-500 hover:underline">→ {L.linkFire}</Link>
          </p>
          <p className="mt-3 text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
      <CrossLinks slug="purchasing-power" />
      <Footer />
    </div>
  );
}

const zh = {
  title: "购买力 / 通胀计算器",
  subtitle: "通胀如何侵蚀货币：维持购买力所需名义金额、N 年后今日购买力、流失比、半衰期与 72 法则。教育性参考。",
  amountLabel: "金额",
  inflationLabel: "年通胀 %",
  yearsLabel: "年数",
  realReturnLabel: "实际目标收益 %",
  yearWord: "年",
  bandLabels: { severe: "严重", noticeable: "明显", mild: "温和", negligible: "可忽略", "n/a": "不适用" },
  futureNominalLabel: "维持购买力所需名义金额",
  realValueTodayLabel: "N 年后今日购买力",
  factorLabel: "通胀因子",
  requiredNominalLabel: "跑赢通胀所需名义收益",
  powerLostLabel: "购买力流失",
  halfLifeLabel: "购买力减半年数（精确）",
  rule72Label: "72 法则（近似）",
  invalid: "金额须 ≥0，通胀须 ≥0，年数须 ≥0。",
  disclaimer: "简化模型：固定年通胀的复利侵蚀。费雪精确式 (1+名义)=(1+实际)(1+通胀)−1。历史通胀率波动大，非投资建议。",
  linkInflationGoal: "通胀目标",
  linkRealReturn: "实际收益",
  linkFire: "FIRE 财务自由",
  howToTitle: "如何使用购买力 / 通胀计算器",
  howTo: [
    "输入今天的金额、年通胀率与年数。",
    "读取维持同等购买力所需的未来名义金额，以及这笔钱 N 年后的今日购买力。",
    "查看购买力流失比例与减半年数（精确 vs 72 法则近似）。",
    "填入实际目标收益，得到跑赢通胀所需的最低名义收益率。",
  ],
  presetLabels: { mild: "温和 3% × 10y", moderate: "常态 5% × 10y", high: "高 8% × 10y", severe: "严重 25% × 5y" },
};

const en = {
  title: "Purchasing Power / Inflation",
  subtitle: "How inflation erodes money: nominal to hold purchasing power, present value after N years, loss ratio, half-life & the 72-rule. For education.",
  amountLabel: "Amount",
  inflationLabel: "Annual inflation %",
  yearsLabel: "Years",
  realReturnLabel: "Target real return %",
  yearWord: "yrs",
  bandLabels: { severe: "Severe", noticeable: "Noticeable", mild: "Mild", negligible: "Negligible", "n/a": "N/A" },
  futureNominalLabel: "Nominal to Hold Power",
  realValueTodayLabel: "Today's Power in N Years",
  factorLabel: "Inflation Factor",
  requiredNominalLabel: "Nominal to Beat Inflation",
  powerLostLabel: "Purchasing-Power Loss",
  halfLifeLabel: "Halving Time (exact)",
  rule72Label: "Rule of 72 (approx)",
  invalid: "Amount, inflation and years must be ≥ 0.",
  disclaimer: "Simplified model: fixed-rate compounding erosion. Fisher exact: (1+nominal)=(1+real)(1+inflation)−1. Historical inflation varies widely. Not investment advice.",
  linkInflationGoal: "Inflation-Adjusted Goal",
  linkRealReturn: "Real Return",
  linkFire: "FIRE / Financial Freedom",
  howToTitle: "How to use the purchasing-power / inflation calculator",
  howTo: [
    "Enter today's amount, the annual inflation rate, and the number of years.",
    "Read the nominal amount needed to hold today's purchasing power, and that money's present value after N years.",
    "See the purchasing-power loss ratio and the halving time (exact vs the rule-of-72 approximation).",
    "Enter a target real return to find the minimum nominal return needed to beat inflation.",
  ],
  presetLabels: { mild: "Mild 3% × 10y", moderate: "Moderate 5% × 10y", high: "High 8% × 10y", severe: "Severe 25% × 5y" },
};