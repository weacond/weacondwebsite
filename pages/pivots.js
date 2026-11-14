"use client";

import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import { pivotLevels, classicPivots, pivotTrend } from "../lib/pivots";

export const metadata = {
  title: "支点计算器 — Weacond",
  description: "经典/伍迪/卡马拉拉/斐波那契支点（R1~R3 / S1~S3），由前周期高/低/收盘计算；含当日趋势解读。日内交易的支撑阻力位。",
  robots: { index: true, follow: true },
};

// 变体定义：标签 + 有序档位（resistance/support/pivot 用于配色）
const VARIANTS = {
  classic: { zh: "经典", en: "Classic", keys: ["r3", "r2", "r1", "pivot", "s1", "s2", "s3"] },
  woodie: { zh: "伍迪", en: "Woodie", keys: ["r2", "r1", "pivot", "s1", "s2"] },
  camarilla: { zh: "卡马拉拉", en: "Camarilla", keys: ["r4", "r3", "r2", "r1", "pivot", "s1", "s2", "s3", "s4"] },
  fibonacci: { zh: "斐波那契", en: "Fibonacci", keys: ["rF3", "rF2", "rF1", "pivot", "sF1", "sF2", "sF3"] },
};

// 档位配色（静态类，避免 Tailwind purge）
const TYPE_CLS = {
  resistance: "text-rose-600",
  support: "text-emerald-600",
  pivot: "text-indigo-600 font-bold",
};

const TREND_BADGE = {
  bullish: { cls: "bg-green-100 text-green-700", zh: "偏多", en: "Bullish" },
  neutral: { cls: "bg-slate-100 text-slate-600", zh: "中性", en: "Neutral" },
  bearish: { cls: "bg-red-100 text-red-700", zh: "偏空", en: "Bearish" },
  unknown: { cls: "bg-slate-100 text-slate-500", zh: "—", en: "—" },
};

export default function PivotsPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  // 默认：前周期 高 110 / 低 100 / 收 105，当前价 105
  const [high, setHigh] = useState("110");
  const [low, setLow] = useState("100");
  const [close, setClose] = useState("105");
  const [prevClose, setPrevClose] = useState("103");
  const [price, setPrice] = useState("105");
  const [variant, setVariant] = useState("classic");

  const levels = pivotLevels(variant, Number(high), Number(low), Number(close), Number(prevClose));
  const classic = classicPivots(Number(high), Number(low), Number(close));
  const trend = pivotTrend(Number(price), classic);
  const tb = TREND_BADGE[trend];
  const variantMeta = VARIANTS[variant];

  const fmt = (v) => (Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—");

  // 档位类型（支撑/阻力/中枢）
  const typeOf = (key) =>
    key === "pivot" ? "pivot" : key.startsWith("r") || key.startsWith("R") ? "resistance" : "support";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="pivots" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/pivots"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Pivot Points Calculator", href: "/pivots" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 输入 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold mb-4">{L.inputs}</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Field label={L.high} value={high} onChange={setHigh} />
                  <Field label={L.low} value={low} onChange={setLow} />
                  <Field label={L.close} value={close} onChange={setClose} />
                </div>
                <Field label={L.prevClose} value={prevClose} onChange={setPrevClose} hint={L.prevCloseHint} />
                <Field label={L.currentPrice} value={price} onChange={setPrice} />
                <label className="block">
                  <span className="text-xs text-slate-400">{L.variant}</span>
                  <select
                    value={variant}
                    onChange={(e) => setVariant(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white"
                  >
                    {Object.entries(VARIANTS).map(([k, m]) => (
                      <option key={k} value={k}>
                        {m[lang]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-4">{L.formula}</p>
            </div>

            {/* 结果 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">
                  {L.results} · {variantMeta[lang]}
                </h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tb.cls}`}>{tb[lang]}</span>
              </div>
              {levels ? (
                <div className="space-y-2">
                  {variantMeta.keys.map((key) => (
                    <Result
                      key={key}
                      label={key === "pivot" ? L.pivot : key}
                      value={fmt(levels[key])}
                      cls={TYPE_CLS[typeOf(key)]}
                    />
                  ))}
                  <p className="text-xs text-slate-400 pt-2 border-t">{L.trendHint[trend]}</p>
                </div>
              ) : (
                <p className="text-sm text-red-500">{L.invalid}</p>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
    </div>
  );
}
function Field({ label, value, onChange, suffix, hint }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">
        {label}
        {hint ? <span className="ml-1 text-[10px] text-slate-300">{hint}</span> : null}
      </span>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
        />
        {suffix ? <span className="text-sm text-slate-400">{suffix}</span> : null}
      </div>
    </label>
  );
}

function Result({ label, value, cls }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`font-mono font-semibold ${cls || ""}`}>{value}</span>
    </div>
  );
}

const zh = {
  title: "支点计算器",
  subtitle: "由前一周期的高/低/收盘计算日内支撑阻力位。经典 / 伍迪 / 卡马拉拉 / 斐波那契四种算法，含当日趋势解读。",
  howToTitle: "如何使用支点计算器",
  howTo: [
    "输入前一周期的高、低、收盘。",
    "计算器按经典 / 伍迪 / 卡马拉拉 / 斐波那契算出日内支撑阻力位。",
    "查看当日趋势解读。",
  ],
  inputs: "输入",
  high: "最高 High",
  low: "最低 Low",
  close: "收盘 Close",
  prevClose: "前收（伍迪用）",
  prevCloseHint: "伍迪",
  currentPrice: "当前价",
  variant: "算法",
  formula: "中枢 P=(H+L+C)/3；阻力 R=2P−L、P+(H−L)…；支撑 S=2P−H、P−(H−L)…。非投资建议。",
  results: "支点位",
  pivot: "中枢 P",
  trendHint: {
    bullish: "当前价 ≥ R1，处于阻力区上方，偏多。",
    neutral: "当前价在 S1 与 R1 之间，震荡中性。",
    bearish: "当前价 < S1，处于支撑区下方，偏空。",
    unknown: "请输入有效的价格。",
  },
  invalid: "请输入有效的高/低/收盘。",
  disclaimer: "支点基于前周期价格，是技术支撑阻力位，不构成投资建议。",
};
const en = {
  title: "Pivot Points Calculator",
  subtitle: "Intraday support/resistance from the prior period's high/low/close. Classic / Woodie / Camarilla / Fibonacci, with a trend read.",
  howToTitle: "How to use the pivot points calculator",
  howTo: [
    "Enter the prior period's high, low and close.",
    "The calculator computes intraday support/resistance via Classic / Woodie / Camarilla / Fibonacci.",
    "Read the intraday trend interpretation.",
  ],
  inputs: "Inputs",
  high: "High",
  low: "Low",
  close: "Close",
  prevClose: "Prev Close (Woodie)",
  prevCloseHint: "Woodie",
  currentPrice: "Current Price",
  variant: "Method",
  formula: "Pivot P=(H+L+C)/3; resistances R=2P−L, P+(H−L)…, supports S=2P−H, P−(H−L)…. Not investment advice.",
  results: "Levels",
  pivot: "Pivot P",
  trendHint: {
    bullish: "Price ≥ R1 — above resistance, bullish.",
    neutral: "Price between S1 and R1 — range/neutral.",
    bearish: "Price < S1 — below support, bearish.",
    unknown: "Enter a valid price.",
  },
  invalid: "Enter a valid high / low / close.",
  disclaimer: "Pivots are technical levels from prior-period prices; not investment advice.",
};

