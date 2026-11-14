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
import {
  fxCrossSummary, FXCROSS_PRESETS,
} from "../lib/fxCross";
export const metadata = {
  title: "FX 交叉汇率 / 货币换算计算器 — Weacond",
  description: "交叉汇率=A/C=(A/B)/(B/C)，货币换算，交叉对点值。教育性参考，非交易建议。",
  robots: { index: true, follow: true },
};
function fmtNum(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
export default function FxCrossPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [rateAB, setRateAB] = useState(1.085);
  const [rateBC, setRateBC] = useState(1.27);
  const [amount, setAmount] = useState(1000);
  const [notional, setNotional] = useState(100000);
  const res = useMemo(
    () => fxCrossSummary({ rateAB, rateBC, amount, pipSize: 0.0001, notional }),
    [rateAB, rateBC, amount, notional],
  );
  const applyPreset = (p) => {
    setRateAB(p.rateAB);
    setRateBC(p.rateBC);
    setAmount(p.amount);
    setNotional(p.notional);
  };
  const band = res.band;
  const bandColor =
    band === "high" ? "text-rose-600" :
    band === "moderate" ? "text-amber-600" :
    band === "low" ? "text-emerald-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="fx-cross" />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/fx-cross"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "FX Cross-Rate / Conversion", href: "/fx-cross" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(FXCROSS_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateABLabel}</span>
              <input type="number" value={rateAB} min={0} step={0.0001}
                onChange={(e) => setRateAB(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateBCLabel}</span>
              <input type="number" value={rateBC} min={0} step={0.0001}
                onChange={(e) => setRateBC(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.amountLabel}</span>
              <input type="number" value={amount} min={0} step={100}
                onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.notionalLabel}</span>
              <input type="number" value={notional} min={0} step={10000}
                onChange={(e) => setNotional(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.crossLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtNum(res.crossRate)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.convertLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtNum(res.converted)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.invLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{fmtNum(res.invertedRate)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.pipLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.pipValue.toFixed(4)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.notionalLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{notional.toLocaleString()}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/fx-pip" className="text-indigo-500 hover:underline">→ {L.linkFxPip}</Link>
            {" · "}
            <Link href="/leverage" className="text-indigo-500 hover:underline">→ {L.linkLeverage}</Link>
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
  title: "FX 交叉汇率 / 货币换算",
  subtitle: "A/C = (A/B)/(B/C)；货币换算 = 金额 × 汇率。教育性参考，非交易建议。",
  rateABLabel: "汇率 A/B（分子）",
  rateBCLabel: "汇率 B/C（分母）",
  amountLabel: "金额（货币 A）",
  notionalLabel: "名义头寸",
  crossLabel: "交叉汇率 A/C",
  convertLabel: "换算后金额",
  invLabel: "反报价 C/A",
  pipLabel: "每点价值",
  howToTitle: "如何使用 FX 交叉汇率 / 货币换算计算器",
  howTo: [
    "输入汇率 A/B（分子）与 B/C（分母），如 EUR/USD 与 USD/JPY。",
    "读取交叉汇率 A/C = (A/B) / (B/C)，无需美元即可得任意两币汇率。",
    "输入金额（货币 A），读取换算后金额 = 金额 × 汇率。",
    "读取反报价 C/A 与每点价值，便于反向换算与点值估算。",
  ],
  invalid: "汇率须 >0，名义头寸 >0。",
  disclaimer: "简化模型（忽略点差/隔夜利息/流动性），非交易建议。",
  linkFxPip: "FX 点值",
  linkLeverage: "杠杆",
  linkRisk: "风险度量",
  bandLabels: { none: "无", low: "低 <5", moderate: "中 5–10", high: "高 ≥10" },
  presetLabels: { eurGbp: "EUR/GBP", eurJpy: "EUR/JPY", gbpJpy: "GBP/JPY", audUsd: "AUD/USD", usdChf: "USD/CHF" },
};
const en = {
  title: "FX Cross-Rate / Currency Conversion",
  subtitle: "A/C = (A/B)/(B/C); convert = amount × rate. Educational, not trading advice.",
  rateABLabel: "Rate A/B (numerator)",
  rateBCLabel: "Rate B/C (denominator)",
  amountLabel: "Amount (ccy A)",
  notionalLabel: "Notional",
  crossLabel: "Cross rate A/C",
  convertLabel: "Converted amount",
  invLabel: "Inverted C/A",
  pipLabel: "Pip value",
  howToTitle: "How to use the FX cross-rate / currency conversion calculator",
  howTo: [
    "Enter rate A/B (numerator) and B/C (denominator), e.g. EUR/USD and USD/JPY.",
    "Read the cross rate A/C = (A/B) / (B/C): any pair's rate without going through USD.",
    "Enter an amount in currency A and read the converted amount = amount × rate.",
    "Read the inverted rate C/A and pip value for reverse conversion and pip sizing.",
  ],
  invalid: "Rates must be > 0, notional > 0.",
  disclaimer: "Simplified model (ignores spread/swap/liquidity). Not trading advice.",
  linkFxPip: "FX Pip Value",
  linkLeverage: "Leverage",
  linkRisk: "Risk metrics",
  bandLabels: { none: "None", low: "Low <5", moderate: "Moderate 5–10", high: "High ≥10" },
  presetLabels: { eurGbp: "EUR/GBP", eurJpy: "EUR/JPY", gbpJpy: "GBP/JPY", audUsd: "AUD/USD", usdChf: "USD/CHF" },
};
