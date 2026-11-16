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
import { payoffSummary, PAYOFF_PRESETS } from "../lib/payoff";

export const metadata = {
  title: "盈亏比计算器 — Weacond",
  description: "输入平均每笔盈利与平均每笔亏损，算盈亏比 Payoff = 平均盈利 ÷ 平均亏损；交易系统的经典绩效指标，>1 表示平均盈利压过平均亏损。教育性参考。",
  robots: { index: true, follow: true },
};

const verdictColor = {
  excellent: "text-emerald-600",
  good: "text-indigo-600",
  modest: "text-amber-600",
  poor: "text-rose-600",
  infinite: "text-slate-400",
  invalid: "text-slate-400",
};

function fmtNum(x) {
  if (!Number.isFinite(x)) return "∞";
  return x.toFixed(2);
}
function fmtMag(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
}

export default function PayoffPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [avgWin, setAvgWin] = useState(PAYOFF_PRESETS.strong.avgWin);
  const [avgLoss, setAvgLoss] = useState(PAYOFF_PRESETS.strong.avgLoss);

  const applyPreset = (p) => {
    setAvgWin(p.avgWin);
    setAvgLoss(p.avgLoss);
  };

  // 盈亏比是无量纲比率（同单位相除），故 UI 直接以幅度输入，无需 /100 换算。
  const res = useMemo(
    () => payoffSummary({ avgWin, avgLoss }),
    [avgWin, avgLoss]
  );

  const vColor = verdictColor[res.verdict] || "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="payoff" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/payoff"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Payoff Ratio", href: "/payoff" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.values(PAYOFF_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.avgWinLabel}</span>
              <input type="number" value={avgWin} step={0.1}
                onChange={(e) => setAvgWin(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.avgLossLabel}</span>
              <input type="number" value={avgLoss} step={0.1}
                onChange={(e) => setAvgLoss(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">{L.hint}</p>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.payoffLabel}</div>
                <div className={`text-4xl font-bold ${vColor}`}>{fmtNum(res.payoff)}</div>
                <div className={`text-xs mt-1 ${vColor}`}>{L.verdictLabels ? L.verdictLabels[res.verdict] : res.verdict}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.avgWinLabel}</div>
                  <div className="text-xl font-bold text-emerald-600">{fmtMag(res.avgWin)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.avgLossLabel}</div>
                  <div className="text-xl font-bold text-rose-600">{fmtMag(res.avgLoss)}</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/expectancy" className="text-indigo-500 hover:underline">→ {L.linkExpectancy}</Link>
                {" · "}
                <Link href="/sharpe" className="text-indigo-500 hover:underline">→ {L.linkSharpe}</Link>
                {" · "}
                <Link href="/calmar" className="text-indigo-500 hover:underline">→ {L.linkCalmar}</Link>
              </p>
              <FaqSection faqs={L.faqs} title={L.faqTitle} />
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
        </div>
      </section>
      <CrossLinks slug="payoff" />
      <Footer />
    </div>
  );
}

const zh = {
  title: "盈亏比计算器",
  subtitle: "输入平均每笔盈利与平均每笔亏损，算盈亏比 Payoff = 平均盈利 ÷ 平均亏损；>1 表示平均盈利压过平均亏损，是交易系统的经典绩效指标。",
  avgWinLabel: "平均每笔盈利（幅度）",
  avgLossLabel: "平均每笔亏损（幅度，正数）",
  hint: "盈亏比无量纲：同单位相除，故无需换算；填入任意一致单位即可。",
  presetLabels: { strong: "高盈亏比", good: "良好", modest: "一般", poor: "亏大于盈" },
  payoffLabel: "Payoff Ratio",
  verdictLabels: {
    excellent: "优秀（≥3）",
    good: "良好（2–3）",
    modest: "一般（1–2）",
    poor: "为负（<1）",
    infinite: "无亏损（∞）",
    invalid: "输入无效",
  },
  invalid: "请输入有效的平均每笔盈利与亏损（非负数字，且至少一个为正）。",
  disclaimer: "Payoff = 平均每笔盈利 ÷ 平均每笔亏损；>1 表示平均盈利压过平均亏损，越高越优。比率无量纲，假设给定数据，忽略成本与税费，不构成投资建议。",
  linkExpectancy: "期望值",
  linkSharpe: "Sharpe 比率",
  linkCalmar: "Calmar 比率",
  faqTitle: "常见问题",
  howToTitle: "如何使用盈亏比计算器",
  howTo: [
    "输入平均每笔盈利与平均每笔亏损（正幅度），或点击预设。",
    "盈亏比 = 平均盈利 ÷ 平均亏损：衡量单笔盈亏幅度之比。",
    ">1 表示平均盈利压过平均亏损。",
    "读取盈亏比与解读：越高，单笔盈利相对亏损越优。",
  ],
  faqs: [
    { q: "盈亏比怎么算？", a: "Payoff = 平均每笔盈利 ÷ 平均每笔亏损（两者均为正幅度）。它衡量单笔盈利相对单笔亏损的幅度之比，>1 表示盈利压过亏损。" },
    { q: "盈亏比和期望值有何不同？", a: "盈亏比只看单笔盈/亏幅度之比；期望值 = 盈亏比 × 胜率 − 亏率，还纳入交易频率。二者互补：盈亏比看单笔，期望值看整体长期收益。" },
    { q: "盈亏比多少算好？", a: ">1 为正向（平均盈利压过亏损）；经验上 1–2 一般、2–3 良好、≥3 优秀；<1 表示亏损压过盈利。需结合胜率与样本判断。" },
    { q: "高盈亏比一定好嗎？", a: "高盈亏比意味着盈利单远大于亏损单，但若胜率极低，整体期望值仍可能为负。需结合胜率与样本质量综合判断。" },
    { q: "为什么有时显示 ∞？", a: "当平均亏损为 0（从不亏损）且平均盈利为正时，分母为 0，按惯例封顶显示 ∞/999；这是理想但罕见的情形。" },
  ],
};
const en = {
  title: "Payoff Ratio Calculator",
  subtitle: "Enter average win and average loss per trade to get the payoff ratio = average win ÷ average loss; >1 means the average win outweighs the average loss — a classic trading-system performance metric.",
  avgWinLabel: "Average win per trade (magnitude)",
  avgLossLabel: "Average loss per trade (magnitude, positive)",
  hint: "The payoff ratio is dimensionless: same units cancel, so enter any consistent unit.",
  presetLabels: { strong: "High payoff", good: "Good", modest: "Modest", poor: "Losses > wins" },
  payoffLabel: "Payoff Ratio",
  verdictLabels: {
    excellent: "Excellent (≥3)",
    good: "Good (2–3)",
    modest: "Modest (1–2)",
    poor: "Negative (<1)",
    infinite: "No losses (∞)",
    invalid: "Invalid input",
  },
  invalid: "Enter a valid average win and loss (non-negative numbers, at least one positive).",
  disclaimer: "Payoff = average win ÷ average loss per trade; >1 means the average win outweighs the average loss, and higher is better. The ratio is dimensionless. Assumes the given data, ignores costs and taxes. Not investment advice.",
  linkExpectancy: "Expectancy",
  linkSharpe: "Sharpe Ratio",
  linkCalmar: "Calmar Ratio",
  faqTitle: "FAQ",
  howToTitle: "How to use the payoff ratio calculator",
  howTo: [
    "Enter average win and average loss per trade (positive magnitudes), or click a preset.",
    "Payoff = average win ÷ average loss: it gauges the win-to-loss magnitude ratio.",
    ">1 means the average win outweighs the average loss.",
    "Read the payoff and verdict: the higher, the better the win relative to the loss.",
  ],
  faqs: [
    { q: "How is the payoff ratio computed?", a: "Payoff = average win per trade ÷ average loss per trade (both positive magnitudes). It gauges the win-to-loss magnitude ratio; >1 means wins outweigh losses." },
    { q: "How does payoff differ from expectancy?", a: "Payoff looks only at the win-to-loss magnitude ratio; expectancy = payoff × win rate − loss rate, also incorporating trade frequency. They are complementary: payoff is per-trade, expectancy is the long-run per-trade return." },
    { q: "What payoff is considered good?", a: ">1 is positive (average win outweighs average loss); as a rule of thumb 1–2 is modest, 2–3 good, and ≥3 excellent; <1 means losses outweigh wins. Judge with the win rate and sample." },
    { q: "Is a high payoff always good?", a: "A high payoff means winning trades are far larger than losing trades, but with a very low win rate the overall expectancy can still be negative. Judge alongside win rate and sample quality." },
    { q: "Why does it sometimes show ∞?", a: "When the average loss is 0 (no losses) and the average win is positive, the denominator is 0 and the ratio is capped at ∞/999 by convention — an ideal but rare case." },
  ],
};