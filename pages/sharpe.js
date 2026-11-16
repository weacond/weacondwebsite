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
  sharpeSummary,
  SHARPE_PRESETS,
} from "../lib/sharpe";

export const metadata = {
  title: "Sharpe Ratio 夏普比率计算器 — Weacond",
  description: "输入一串周期收益，算年化收益(CAGR)、年化波动率与夏普比率 Sharpe = (年化收益 − 无风险) ÷ 年化波动率；经典风险调整收益。教育性参考。",
  robots: { index: true, follow: true },
};

// 周期频率选项（每年周期数）。
const FREQ_OPTIONS = [1, 4, 12, 52, 252];

const verdictColor = {
  excellent: "text-emerald-600",
  good: "text-indigo-600",
  modest: "text-amber-600",
  poor: "text-rose-600",
  infinite: "text-slate-400",
};

function fmtNum(x) {
  if (x == null || !Number.isFinite(x)) return "∞";
  return x.toFixed(2);
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}

export default function SharpePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [series, setSeries] = useState(SHARPE_PRESETS.steady.returns);
  const [freq, setFreq] = useState(SHARPE_PRESETS.steady.freq);
  const [rfPct, setRfPct] = useState(SHARPE_PRESETS.steady.rf * 100);

  const applyPreset = (p) => {
    setSeries(p.returns);
    setFreq(p.freq);
    setRfPct((p.rf || 0) * 100);
  };

  const returns = useMemo(() => parseReturns(series), [series]);
  const res = useMemo(
    () => sharpeSummary({ returns, freq, rf: (rfPct || 0) / 100 }),
    [returns, freq, rfPct]
  );

  const vColor = verdictColor[res.verdict] || "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="sharpe" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/sharpe"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Sharpe Ratio", href: "/sharpe" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.values(SHARPE_PRESETS).map((p) => (
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
              <span className="text-xs text-slate-500">{L.freqLabel}</span>
              <select value={freq} onChange={(e) => setFreq(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                {FREQ_OPTIONS.map((f) => (
                  <option key={f} value={f}>{L.freqLabels ? L.freqLabels[f] : f + "/yr"}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rfLabel}</span>
              <input type="number" step="0.01" value={rfPct}
                onChange={(e) => setRfPct(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.sharpeLabel}</div>
                <div className={`text-4xl font-bold ${vColor}`}>{fmtNum(res.sharpe)}</div>
                <div className={`text-xs mt-1 ${vColor}`}>{L.verdictLabels ? L.verdictLabels[res.verdict] : res.verdict}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.annualizedLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.annualized)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.volLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.volatility)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.periodsLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.n}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.rfLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct((rfPct || 0) / 100)}</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/calmar" className="text-indigo-500 hover:underline">→ {L.linkCalmar}</Link>
                {" · "}
                <Link href="/sortino" className="text-indigo-500 hover:underline">→ {L.linkSortino}</Link>
                {" · "}
                <Link href="/info-ratio" className="text-indigo-500 hover:underline">→ {L.linkInfoRatio}</Link>
              </p>
              <FaqSection faqs={L.faqs} title={L.faqTitle} />
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
        </div>
      </section>
      <CrossLinks slug="sharpe" />
      <Footer />
    </div>
  );
}

const zh = {
  title: "Sharpe 比率计算器",
  subtitle: "输入一串周期收益，算年化收益(CAGR)、年化波动率与夏普比率 Sharpe = (年化收益 − 无风险利率) ÷ 年化波动率；最经典的风险调整收益。",
  seriesLabel: "周期收益序列 %（每行或逗号分隔）",
  seriesHint: "如 1.2, 1.0, -1.5, 1.1 …；每行/每项为一个周期收益。",
  freqLabel: "频率（每年周期数）",
  rfLabel: "无风险利率 %（年化）",
  freqLabels: { 1: "年度", 4: "季度", 12: "月度", 52: "周度", 252: "日度" },
  presetLabels: { steady: "稳健权益", volatile: "高波动", bondlike: "低波债券", crypto: "高弹高震" },
  sharpeLabel: "Sharpe Ratio",
  annualizedLabel: "年化收益(CAGR)",
  volLabel: "年化波动率",
  periodsLabel: "周期数",
  verdictLabels: {
    excellent: "优秀（≥3）",
    good: "良好（1–3）",
    modest: "一般（0–1）",
    poor: "为负（<0）",
    infinite: "零波动（∞）",
  },
  invalid: "请输入至少 2 个周期收益，频率 > 0，且每个收益 > -100%。",
  disclaimer: "Sharpe = (年化收益 − 无风险利率) ÷ 年化波动率，衡量每单位总风险换来多少超额；越高越稳健。假设给定收益序列，忽略成本与税费，不构成投资建议。",
  linkCalmar: "Calmar 比率",
  linkSortino: "Sortino 比率",
  linkInfoRatio: "Information Ratio",
  faqTitle: "常见问题",
  howToTitle: "如何使用 Sharpe 比率计算器",
  howTo: [
    "粘贴一串周期收益（%），逗号或换行分隔，或点击预设。",
    "选择频率（年/季/月/周/日）——决定每年周期数，用于年化。",
    "输入无风险利率（可选），从超额收益中剔除。",
    "读取 Sharpe、年化收益、年化波动率与解读：越高，每单位风险换来的超额越多。",
  ],
  faqs: [
    { q: "Sharpe 比率怎么算？", a: "Sharpe = (年化收益 − 无风险利率) ÷ 年化波动率。年化波动率 = 每周期收益样本标准差 × √freq。它衡量每单位总风险换来多少超额收益，数值越高越稳健。" },
    { q: "Sharpe 和 Calmar/Sortino 有何不同？", a: "三者都是风险调整收益：Sharpe 用总波动率(标准差)作分母，对称看待上下行；Calmar 用最大回撤；Sortino 只用下行偏差。夏普最通用，Calmar/Sortino 更贴合回撤敏感策略。" },
    { q: "Sharpe 多少算好？", a: "经验上 >1 通常被视为稳健，>3 被视为优秀；为负说明超额收益无法覆盖风险。需结合策略、周期与同类比较。" },
    { q: "为什么有时显示 ∞？", a: "当所有周期收益相同（波动率为 0，分母为 0）时，Sharpe 无定义，以 ∞ 表示；这是理想但罕见的情形。" },
    { q: "高 Sharpe 一定好嗎？", a: "高 Sharpe 表示风险调整收益优秀，但若样本期短、含生存偏差或收益非正态/肥尾，高 Sharpe 未必可持续。需结合样本质量与同类比较。" },
  ],
};
const en = {
  title: "Sharpe Ratio Calculator",
  subtitle: "Enter a series of period returns to get annualized return (CAGR), annualized volatility and the Sharpe ratio = (annualized return − risk-free) ÷ annualized volatility — the classic risk-adjusted return.",
  seriesLabel: "Period returns series (%, one per line or comma-separated)",
  seriesHint: "e.g. 1.2, 1.0, -1.5, 1.1 …; each entry is one period's return.",
  freqLabel: "Frequency (periods per year)",
  rfLabel: "Risk-free rate % (annual)",
  freqLabels: { 1: "Annual", 4: "Quarterly", 12: "Monthly", 52: "Weekly", 252: "Daily" },
  presetLabels: { steady: "Steady equity", volatile: "Volatile", bondlike: "Bond-like", crypto: "Crypto-like" },
  sharpeLabel: "Sharpe Ratio",
  annualizedLabel: "Annualized (CAGR)",
  volLabel: "Annualized volatility",
  periodsLabel: "Periods",
  verdictLabels: {
    excellent: "Excellent (≥3)",
    good: "Good (1–3)",
    modest: "Modest (0–1)",
    poor: "Negative (<0)",
    infinite: "No volatility (∞)",
  },
  invalid: "Enter at least 2 period returns, frequency > 0, and each return > -100%.",
  disclaimer: "Sharpe = (annualized return − risk-free rate) ÷ annualized volatility; the more return earned per unit of total risk, the higher. Assumes the given series, ignores costs and taxes. Not investment advice.",
  linkCalmar: "Calmar Ratio",
  linkSortino: "Sortino Ratio",
  linkInfoRatio: "Information Ratio",
  faqTitle: "FAQ",
  howToTitle: "How to use the Sharpe ratio calculator",
  howTo: [
    "Paste a series of period returns (%) separated by commas or newlines, or click a preset.",
    "Pick a frequency (annual/quarterly/monthly/weekly/daily) — it sets periods per year for annualization.",
    "Enter a risk-free rate (optional) to strip it out of the excess return.",
    "Read the Sharpe, annualized return, annualized volatility and the verdict: the higher, the more excess per unit of risk.",
  ],
  faqs: [
    { q: "How is the Sharpe ratio computed?", a: "Sharpe = (annualized return − risk-free rate) ÷ annualized volatility. Annualized volatility = per-period sample standard deviation × √freq. It gauges excess return earned per unit of total risk; higher is more robust." },
    { q: "How does Sharpe differ from Calmar/Sortino?", a: "All three are risk-adjusted returns: Sharpe uses total volatility (standard deviation) symmetrically; Calmar uses max drawdown; Sortino uses downside deviation only. Sharpe is the most general; Calmar/Sortino suit drawdown-sensitive strategies." },
    { q: "What Sharpe is considered good?", a: "As a rule of thumb >1 is usually solid and >3 excellent; a negative Sharpe means excess return does not cover risk. Judge relative to the strategy, period and peers." },
    { q: "Why does it sometimes show ∞?", a: "When all period returns are identical (volatility = 0, so the denominator is 0), Sharpe is undefined and shown as ∞ — an ideal but rare case." },
    { q: "Is a high Sharpe always good?", a: "A high Sharpe means excellent risk-adjusted return, but with a short sample, survivorship bias, or non-normal/fat-tailed returns, it may not be sustainable. Judge alongside sample quality and peers." },
  ],
};