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
  payoffSummary, PAYOFF_PRESETS,
} from "../lib/optionsPayoff";

export const metadata = {
  title: "期权盈亏 / 盈亏平衡计算器 — Weacond",
  description: "到期盈亏=内在价值∓权利金，盈亏平衡点，最大盈亏。单腿期权。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};

function fmtNum(x) {
  if (!Number.isFinite(x)) return x > 0 ? "∞" : "−∞";
  return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function OptionsPayoffPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [type, setType] = useState("call");
  const [side, setSide] = useState("long");
  const [spot, setSpot] = useState(105);
  const [strike, setStrike] = useState(100);
  const [premium, setPremium] = useState(3);

  const res = useMemo(
    () => payoffSummary({ type, side, spot, strike, premium }),
    [type, side, spot, strike, premium],
  );

  const applyPreset = (p) => {
    setType(p.type);
    setSide(p.side);
    setSpot(p.spot);
    setStrike(p.strike);
    setPremium(p.premium);
  };

  const payoffColor = res.currentPayoff > 0 ? "text-emerald-600" : res.currentPayoff < 0 ? "text-rose-600" : "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="options-payoff" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/options-payoff"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Options Payoff / Break-Even", href: "/options-payoff" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(PAYOFF_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex gap-2">
              <button onClick={() => setType("call")}
                className={`flex-1 py-2 rounded-lg text-sm border ${type === "call" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200"}`}>Call</button>
              <button onClick={() => setType("put")}
                className={`flex-1 py-2 rounded-lg text-sm border ${type === "put" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200"}`}>Put</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSide("long")}
                className={`flex-1 py-2 rounded-lg text-sm border ${side === "long" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-slate-200"}`}>{L.longLabel}</button>
              <button onClick={() => setSide("short")}
                className={`flex-1 py-2 rounded-lg text-sm border ${side === "short" ? "bg-rose-600 text-white border-rose-600" : "bg-white border-slate-200"}`}>{L.shortLabel}</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.spotLabel}</span>
              <input type="number" value={spot} min={0} step={1}
                onChange={(e) => setSpot(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.strikeLabel}</span>
              <input type="number" value={strike} min={0} step={1}
                onChange={(e) => setStrike(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.premiumLabel}</span>
              <input type="number" value={premium} min={0} step={0.1}
                onChange={(e) => setPremium(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.currentLabel}</div>
                <div className={`text-4xl font-bold ${payoffColor}`}>{fmtNum(res.currentPayoff)}</div>
                <div className="text-xs mt-1 text-slate-400">
                  {L.typeLabel} {res.type} · {L.sideLabel} {res.side} · {res.atTheMoney ? L.atm : L.otm}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.beLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{fmtNum(res.breakEven)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.ivLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtNum(res.intrinsic)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.maxLossLabel}</div>
                  <div className="text-xl font-bold text-rose-600">{fmtNum(res.maxLoss)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.maxProfitLabel}</div>
                  <div className="text-xl font-bold text-emerald-600">{fmtNum(res.maxProfit)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/options" className="text-indigo-500 hover:underline">→ {L.linkOptions}</Link>
            {" · "}
            <Link href="/r-multiple" className="text-indigo-500 hover:underline">→ {L.linkRMultiple}</Link>
            {" · "}
            <Link href="/risk-ruin" className="text-indigo-500 hover:underline">→ {L.linkRiskRuin}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "期权盈亏 / 盈亏平衡",
  subtitle: "到期盈亏 = 内在价值∓权利金；盈亏平衡点；最大盈亏（单腿）。教育性参考。",
  howToTitle: "如何使用期权盈亏/盈亏平衡计算器",
  howTo: [
    "选择期权类型与方向（买/卖 看涨/看跌），输入行权价与权利金。",
    "计算器算到期盈亏 = 内在价值 ∓ 权利金。",
    "查看盈亏平衡点与最大盈亏（单腿）。",
  ],
  typeLabel: "类型",
  sideLabel: "方向",
  longLabel: "买",
  shortLabel: "卖",
  spotLabel: "现价",
  strikeLabel: "行权价",
  premiumLabel: "权利金",
  currentLabel: "当前盈亏",
  beLabel: "盈亏平衡点",
  ivLabel: "内在价值",
  maxLossLabel: "最大亏损",
  maxProfitLabel: "最大盈利",
  atm: "实值/平值区",
  otm: "虚值区",
  invalid: "类型/方向须合法，行权价>0，权利金≥0。",
  disclaimer: "单腿到期盈亏，未计时间价值/波动率/手续费，非投资建议。",
  linkOptions: "期权定价",
  linkRMultiple: "R 倍数",
  linkRiskRuin: "破产风险",
  presetLabels: { longCall: "买权 call", shortPut: "卖权 put", longPut: "买权 put", shortCall: "卖权 call", itmCall: "实值 call" },
};
const en = {
  title: "Options Payoff / Break-Even",
  subtitle: "Expiry P/L = intrinsic ∓ premium; break-even point; max profit/loss (single leg). Educational.",
  howToTitle: "How to use the options payoff / break-even calculator",
  howTo: [
    "Choose option type and side (long/short, call/put); enter strike and premium.",
    "The calculator computes expiry P/L = intrinsic ∓ premium.",
    "Read the break-even point and max profit/loss (single leg).",
  ],
  typeLabel: "Type",
  sideLabel: "Side",
  longLabel: "Buy",
  shortLabel: "Sell",
  spotLabel: "Spot",
  strikeLabel: "Strike",
  premiumLabel: "Premium",
  currentLabel: "Current P/L",
  beLabel: "Break-even",
  ivLabel: "Intrinsic",
  maxLossLabel: "Max loss",
  maxProfitLabel: "Max profit",
  atm: "ITM/ATM zone",
  otm: "OTM zone",
  invalid: "Type/side must be valid, strike > 0, premium ≥ 0.",
  disclaimer: "Single-leg expiry payoff; excludes time value/volatility/commission. Not investment advice.",
  linkOptions: "Options",
  linkRMultiple: "R-Multiple",
  linkRiskRuin: "Risk of Ruin",
  presetLabels: { longCall: "Buy call", shortPut: "Sell put", longPut: "Buy put", shortCall: "Sell call", itmCall: "ITM call" },
};

