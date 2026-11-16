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
import { sterlingSummary, STERLING_PRESETS } from "../lib/sterling";

export const metadata = {
  title: "斯特林比率计算器 — Weacond",
  description: "输入总收益与最长连续亏损交易数，算斯特林比率 Sterling = 总收益 ÷ 最长连亏；把收益按最坏连亏归一，衡量抗回撤韧性，与卡玛比率互补。教育性参考。",
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

export default function SterlingPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [totalReturn, setTotalReturn] = useState(STERLING_PRESETS.strong.totalReturn);
  const [maxLosingStreak, setMaxLosingStreak] = useState(STERLING_PRESETS.strong.maxLosingStreak);

  const applyPreset = (p) => {
    setTotalReturn(p.totalReturn);
    setMaxLosingStreak(p.maxLosingStreak);
  };

  const res = useMemo(
    () => sterlingSummary({ totalReturn, maxLosingStreak }),
    [totalReturn, maxLosingStreak]
  );

  const vColor = verdictColor[res.verdict] || "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="sterling" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/sterling"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Sterling Ratio", href: "/sterling" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.values(STERLING_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.totalReturnLabel}</span>
              <input type="number" value={totalReturn} step={0.1}
                onChange={(e) => setTotalReturn(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.maxLosingStreakLabel}</span>
              <input type="number" value={maxLosingStreak} min={0} step={1}
                onChange={(e) => setMaxLosingStreak(Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">{L.hint}</p>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.sterlingLabel}</div>
                <div className={`text-4xl font-bold ${vColor}`}>{fmtNum(res.sterling)}</div>
                <div className={`text-xs mt-1 ${vColor}`}>{L.verdictLabels ? L.verdictLabels[res.verdict] : res.verdict}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.totalReturnLabel}</div>
                  <div className="text-xl font-bold text-emerald-600">{fmtMag(res.totalReturn)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.maxLosingStreakLabel}</div>
                  <div className="text-xl font-bold text-rose-600">{fmtMag(res.maxLosingStreak)}</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/calmar" className="text-indigo-500 hover:underline">→ {L.linkCalmar}</Link>
                {" · "}
                <Link href="/payoff" className="text-indigo-500 hover:underline">→ {L.linkPayoff}</Link>
                {" · "}
                <Link href="/sharpe" className="text-indigo-500 hover:underline">→ {L.linkSharpe}</Link>
              </p>
              <FaqSection faqs={L.faqs} title={L.faqTitle} />
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
        </div>
      </section>
      <CrossLinks slug="sterling" />
      <Footer />
    </div>
  );
}
const zh = {
  title: "斯特林比率计算器",
  subtitle: "输入总收益与最长连续亏损交易数，算斯特林比率 Sterling = 总收益 ÷ 最长连亏；把收益按最坏连亏归一，衡量抗回撤韧性，与卡玛比率（对最大回撤归一）互补。",
  totalReturnLabel: "总收益（%，带符号）",
  maxLosingStreakLabel: "最长连续亏损交易数（整数 ≥0）",
  hint: "总收益按百分数输入（60 表示 60%）；最长连亏为连续亏损的交易笔数。",
  presetLabels: { strong: "高抗回撤", good: "良好", modest: "一般", poor: "低收益/高连亏" },
  sterlingLabel: "Sterling Ratio",
  verdictLabels: {
    excellent: "优秀（≥6）",
    good: "良好（3–6）",
    modest: "一般（1–3）",
    poor: "为负（<1）",
    infinite: "无连亏（∞）",
    invalid: "输入无效",
  },
  invalid: "请输入有效的总收益与最长连亏（总收益为有限数字，最长连亏为非负整数，且二者不全为 0）。",
  disclaimer: "Sterling = 总收益 ÷ 最长连续亏损交易数；把收益按最坏连亏归一，越高越优。与卡玛比率（对最大回撤归一）互补。假设给定数据，忽略成本与税费，不构成投资建议。",
  linkCalmar: "Calmar 比率",
  linkPayoff: "盈亏比",
  linkSharpe: "Sharpe 比率",
  faqTitle: "常见问题",
  howToTitle: "如何使用斯特林比率计算器",
  howTo: [
    "输入总收益（%）与最长连续亏损交易数，或点击预设。",
    "斯特林比率 = 总收益 ÷ 最长连亏：把收益按最坏连亏归一。",
    "值越大，单位连亏对应的收益越高，抗回撤韧性越强。",
    "读取斯特林比率与解读：越高，抗回撤效率越优。",
  ],
  faqs: [
    { q: "斯特林比率怎么算？", a: "Sterling = 总收益 ÷ 最长连续亏损交易数。它把收益按「最坏连亏」归一，从连亏次数维度衡量风险调整收益，与卡玛比率（对最大回撤归一）互补。" },
    { q: "斯特林比率和卡玛比率有何不同？", a: "卡玛比率以最大回撤为分母，斯特林比率以最长连亏为分母；二者从不同维度衡量抗回撤韧性，可互为补充。" },
    { q: "斯特林比率多少算好？", a: "越高越优；经验上 1–3 一般、3–6 良好、≥6 优秀；<1 表示收益不足以覆盖连亏。需结合样本与策略判断。" },
    { q: "最长连亏怎么数？", a: "统计连续亏损交易中的最长一笔：从第一次亏损到盈利为止的连续亏损笔数，取历史最长。" },
    { q: "为什么有时显示 ∞？", a: "当最长连亏为 0（从未连续亏损）且总收益为正时，分母为 0，按惯例封顶显示 ∞/999；这是理想但罕见的情形。" },
  ],
};
const en = {
  title: "Sterling Ratio Calculator",
  subtitle: "Enter total return and the longest losing streak to get the Sterling ratio = total return ÷ longest losing streak; it normalizes return by the worst streak — a drawdown-resilience metric complementary to the Calmar ratio.",
  totalReturnLabel: "Total return (% , signed)",
  maxLosingStreakLabel: "Longest losing streak (integer ≥ 0)",
  hint: "Total return is entered as a percentage (60 = 60%); the longest losing streak is the count of consecutive losing trades.",
  presetLabels: { strong: "High resilience", good: "Good", modest: "Modest", poor: "Low return / long streak" },
  sterlingLabel: "Sterling Ratio",
  verdictLabels: {
    excellent: "Excellent (≥6)",
    good: "Good (3–6)",
    modest: "Modest (1–3)",
    poor: "Negative (<1)",
    infinite: "No streak (∞)",
    invalid: "Invalid input",
  },
  invalid: "Enter a valid total return and losing streak (finite total return, non-negative integer streak, not both zero).",
  disclaimer: "Sterling = total return ÷ longest losing streak; it normalizes return by the worst streak, and higher is better. Complementary to the Calmar ratio (which normalizes by max drawdown). Assumes the given data, ignores costs and taxes. Not investment advice.",
  linkCalmar: "Calmar Ratio",
  linkPayoff: "Payoff Ratio",
  linkSharpe: "Sharpe Ratio",
  faqTitle: "FAQ",
  howToTitle: "How to use the Sterling ratio calculator",
  howTo: [
    "Enter total return (%) and the longest losing streak, or click a preset.",
    "Sterling = total return ÷ longest losing streak: it normalizes return by the worst streak.",
    "The higher, the more return per unit of streak — stronger drawdown resilience.",
    "Read the Sterling ratio and verdict: the higher, the better the drawdown-adjusted efficiency.",
  ],
  faqs: [
    { q: "How is the Sterling ratio computed?", a: "Sterling = total return ÷ longest losing streak. It normalizes return by the worst streak, measuring risk-adjusted return from the 'number of consecutive losses' dimension, complementary to the Calmar ratio (which normalizes by max drawdown)." },
    { q: "How does Sterling differ from Calmar?", a: "Calmar uses max drawdown as the denominator; Sterling uses the longest losing streak. They measure drawdown resilience from different angles and complement each other." },
    { q: "What Sterling ratio is good?", a: "Higher is better; as a rule of thumb 1–3 is modest, 3–6 good, and ≥6 excellent; <1 means return is insufficient relative to the streak. Judge with the sample and strategy." },
    { q: "How do I count the longest losing streak?", a: "Count the longest run of consecutive losing trades: from the first loss to the next win, take the maximum over the history." },
    { q: "Why does it sometimes show ∞?", a: "When the longest losing streak is 0 (no consecutive losses) and total return is positive, the denominator is 0 and the ratio is capped at ∞/999 by convention — an ideal but rare case." },
  ],
};
