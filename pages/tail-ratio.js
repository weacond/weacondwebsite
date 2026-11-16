"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CrossLinks from "../components/CrossLinks";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import FaqLd from "../components/FaqLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import FaqSection from "../components/FaqSection";
import Link from "next/link";
import {
  parseReturns,
  tailSummary,
  TAIL_PRESETS,
} from "../lib/tailRatio";

export const metadata = {
  title: "尾部比率计算器 — Weacond",
  description: "输入一串周期收益与上下分位，算尾部比率 Tail = 上分位 ÷ |下分位|（默认 95% ÷ |5%|）；刻画分布上行尾与下行尾之比，与 Omega 互补。教育性参考。",
  robots: { index: true, follow: true },
};

const verdictColor = {
  excellent: "text-emerald-600",
  good: "text-indigo-600",
  modest: "text-amber-600",
  poor: "text-rose-600",
  infinite: "text-slate-400",
};

function fmtNum(x) {
  if (!Number.isFinite(x)) return "∞";
  return x.toFixed(2);
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}

export default function TailRatioPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [series, setSeries] = useState(TAIL_PRESETS.upskew.returns);
  const [lowerQ, setLowerQ] = useState(TAIL_PRESETS.upskew.lowerQ);
  const [upperQ, setUpperQ] = useState(TAIL_PRESETS.upskew.upperQ);

  const applyPreset = (p) => {
    setSeries(p.returns);
    setLowerQ(p.lowerQ);
    setUpperQ(p.upperQ);
  };

  const returns = useMemo(() => parseReturns(series), [series]);
  const res = useMemo(
    () => tailSummary({ returns, lowerQ, upperQ }),
    [returns, lowerQ, upperQ]
  );

  const vColor = verdictColor[res.verdict] || "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="tail-ratio" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/tail-ratio"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Tail Ratio", href: "/tail-ratio" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.values(TAIL_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <label className="block mb-4">
            <span className="text-xs text-slate-500">{L.seriesLabel}</span>
            <textarea value={series} rows={4} onChange={(e) => setSeries(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            <span className="text-[11px] text-slate-400">{L.seriesHint}</span>
          </label>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.lowerQLabel}</span>
              <input type="number" value={lowerQ} min={0} max={0.99} step={0.05}
                onChange={(e) => setLowerQ(parseFloat(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.upperQLabel}</span>
              <input type="number" value={upperQ} min={0.01} max={1} step={0.05}
                onChange={(e) => setUpperQ(parseFloat(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">{L.hint}</p>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.tailLabel}</div>
                <div className={`text-4xl font-bold ${vColor}`}>{fmtNum(res.tail)}</div>
                <div className={`text-xs mt-1 ${vColor}`}>{L.verdictLabels ? L.verdictLabels[res.verdict] : res.verdict}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.lowerQLabel}</div>
                  <div className="text-xl font-bold text-rose-600">{fmtPct(res.lowerQuantile)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.upperQLabel}</div>
                  <div className="text-xl font-bold text-emerald-600">{fmtPct(res.upperQuantile)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.periodsLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.n}</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/omega" className="text-indigo-500 hover:underline">→ {L.linkOmega}</Link>
                {" · "}
                <Link href="/sharpe" className="text-indigo-500 hover:underline">→ {L.linkSharpe}</Link>
                {" · "}
                <Link href="/var" className="text-indigo-500 hover:underline">→ {L.linkVar}</Link>
              </p>
              <FaqSection faqs={L.faqs} title={L.faqTitle} />
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
        </div>
      </section>
      <CrossLinks slug="tail-ratio" />
      <Footer />
    </div>
  );
}
const zh = {
  title: "尾部比率计算器",
  subtitle: "输入一串周期收益与上下分位，算尾部比率 Tail = 上分位 ÷ |下分位|（默认 95% ÷ |5%|）；刻画分布的上行尾与下行尾之比，与 Omega 互补。",
  seriesLabel: "周期收益序列 %（每行或逗号分隔）",
  seriesHint: "如 1.2, 1.0, -1.5, 1.1 …；每行/每项为一个周期收益。",
  lowerQLabel: "下分位（0~0.99，默认 0.05）",
  upperQLabel: "上分位（0.01~1，默认 0.95）",
  hint: "分位取 0~1 之间的小数：0.05 表示 5% 分位，0.95 表示 95% 分位。",
  presetLabels: { upskew: "上行偏斜", symmetric: "近似对称", downside: "下行偏重", short: "短序列" },
  tailLabel: "Tail Ratio",
  periodsLabel: "周期数",
  verdictLabels: {
    excellent: "优秀（≥4）",
    good: "良好（2–4）",
    modest: "一般（1–2）",
    poor: "下行偏重（<1）",
    infinite: "无下行尾（∞）",
  },
  invalid: "请输入至少 2 个周期收益，上分位 > 下分位，且每个收益为有限数。",
  disclaimer: "Tail = 上分位 ÷ |下分位|；>1 表示上行尾比下行尾厚，越高越优。假设给定收益序列，忽略成本与税费，不构成投资建议。",
  linkOmega: "Omega 比率",
  linkSharpe: "Sharpe 比率",
  linkVar: "VaR 风险价值",
  faqTitle: "常见问题",
  howToTitle: "如何使用尾部比率计算器",
  howTo: [
    "粘贴一串周期收益（%），逗号或换行分隔，或点击预设。",
    "设置下分位与上分位（默认 5% 与 95%）。",
    "读取上下分位、尾部比率与解读：>1 表示上行尾更厚。",
    "对比 Omega：尾部比率只看两端分位，对极端值更稳健。",
  ],
  faqs: [
    { q: "尾部比率怎么算？", a: "Tail = 上分位 ÷ |下分位|（默认 95% 分位 ÷ |5% 分位|）。它刻画分布上行尾与下行尾的相对厚度，>1 表示上行尾更厚。" },
    { q: "尾部比率和 Omega 有何不同？", a: "Omega 用全部盈利金额 ÷ 全部亏损金额；尾部比率只用上下分位数。尾部比率对极端值更稳健（不依赖所有样本），二者互补。" },
    { q: "尾部比率多少算好？", a: "经验上 >1 为正向（上行尾更厚），2–4 良好、≥4 优秀；<1 表示下行尾更厚（亏损更重）。需结合策略与同类比较。" },
    { q: "为什么有时显示 ∞？", a: "当下分位为 0（没有可测量的下行尾）时，分母为 0，尾部比率无定义，按惯例封顶显示 ∞；这是理想但罕见的情形。" },
    { q: "分位怎么取？", a: "分位取 0~1 之间的小数（0.05 = 5% 分位）。下分位刻画下行尾、上分位刻画上行尾；常用 5% 与 95%。" },
  ],
};
const en = {
  title: "Tail Ratio Calculator",
  subtitle: "Enter a series of period returns plus lower and upper quantiles to get the tail ratio = upper quantile ÷ |lower quantile| (default 95% ÷ |5%|); it gauges the upside tail vs. the downside tail — complementary to the Omega ratio.",
  seriesLabel: "Period returns series (%, one per line or comma-separated)",
  seriesHint: "e.g. 1.2, 1.0, -1.5, 1.1 …; each entry is one period's return.",
  lowerQLabel: "Lower quantile (0–0.99, default 0.05)",
  upperQLabel: "Upper quantile (0.01–1, default 0.95)",
  hint: "Quantiles are decimals in 0–1: 0.05 = the 5th percentile, 0.95 = the 95th percentile.",
  presetLabels: { upskew: "Upside skew", symmetric: "Symmetric", downside: "Downside-heavy", short: "Short series" },
  tailLabel: "Tail Ratio",
  periodsLabel: "Periods",
  verdictLabels: {
    excellent: "Excellent (≥4)",
    good: "Good (2–4)",
    modest: "Modest (1–2)",
    poor: "Downside-heavy (<1)",
    infinite: "No downside tail (∞)",
  },
  invalid: "Enter at least 2 period returns, upper quantile > lower quantile, and each return finite.",
  disclaimer: "Tail = upper quantile ÷ |lower quantile|; >1 means the upside tail is thicker, and higher is better. Assumes the given series, ignores costs and taxes. Not investment advice.",
  linkOmega: "Omega Ratio",
  linkSharpe: "Sharpe Ratio",
  linkVar: "VaR",
  faqTitle: "FAQ",
  howToTitle: "How to use the tail ratio calculator",
  howTo: [
    "Paste a series of period returns (%) separated by commas or newlines, or click a preset.",
    "Set the lower and upper quantiles (default 5% and 95%).",
    "Read the quantiles, the tail ratio and the verdict: >1 means a thicker upside tail.",
    "Compare with Omega: the tail ratio uses only the two end quantiles, so it is more robust to extremes.",
  ],
  faqs: [
    { q: "How is the tail ratio computed?", a: "Tail = upper quantile ÷ |lower quantile| (default 95th percentile ÷ |5th percentile|). It gauges the relative thickness of the upside vs. downside tail; >1 means a thicker upside tail." },
    { q: "How does the tail ratio differ from Omega?", a: "Omega uses total profit amount ÷ total loss amount; the tail ratio uses only the upper and lower quantiles. The tail ratio is more robust to extremes (it does not depend on every sample), and the two complement each other." },
    { q: "What tail ratio is good?", a: "As a rule of thumb >1 is positive (thicker upside tail), 2–4 good, and ≥4 excellent; <1 means the downside tail is heavier (bigger losses). Judge with the strategy and peers." },
    { q: "Why does it sometimes show ∞?", a: "When the lower quantile is 0 (no measurable downside tail), the denominator is 0 and the tail ratio is undefined, capped at ∞ by convention — an ideal but rare case." },
    { q: "How do I choose the quantiles?", a: "Quantiles are decimals in 0–1 (0.05 = the 5th percentile). The lower quantile characterizes the downside tail and the upper quantile the upside tail; 5% and 95% are common." },
  ],
};
