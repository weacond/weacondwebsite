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
  wealthIndex,
  sortinoSummary,
  SORTINO_PRESETS,
} from "../lib/sortino";

export const metadata = {
  title: "Sortino 比率计算器 — Weacond",
  description: "输入一串周期收益，算年化收益(CAGR)、年化下行偏差与 Sortino = (CAGR − MAR) ÷ 下行偏差；只惩罚下行风险。教育性参考。",
  robots: { index: true, follow: true },
};

// 周期频率选项（每年周期数）。
const FREQ_OPTIONS = [1, 4, 12, 52, 252];

// 财富指数迷你折线（自包含 SVG，画 [1, W1, ...] 的归一曲线）。
function WealthSparkline({ data }) {
  const w = 640, h = 140, pad = 6;
  if (!data || data.length < 2) return null;
  const max = Math.max(...data) || 1;
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (v - min) / span) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#4f46e5" strokeWidth="1.5" />
    </svg>
  );
}

const verdictColor = {
  excellent: "text-emerald-600",
  good: "text-indigo-600",
  modest: "text-amber-600",
  poor: "text-rose-600",
  infinite: "text-slate-400",
};

function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}
function fmtNum(x) {
  if (x == null || !Number.isFinite(x)) return "∞";
  return x.toFixed(2);
}

export default function SortinoPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [series, setSeries] = useState(SORTINO_PRESETS.steady.returns);
  const [freq, setFreq] = useState(SORTINO_PRESETS.steady.freq);
  const [marPct, setMarPct] = useState(SORTINO_PRESETS.steady.mar * 100);

  const applyPreset = (p) => {
    setSeries(p.returns);
    setFreq(p.freq);
    setMarPct((p.mar || 0) * 100);
  };

  const returns = useMemo(() => parseReturns(series), [series]);
  const res = useMemo(
    () => sortinoSummary({ returns, freq, mar: (marPct || 0) / 100 }),
    [returns, freq, marPct]
  );
  const curve = useMemo(() => (res.valid ? wealthIndex(returns) : null), [res, returns]);

  const vColor = verdictColor[res.verdict] || "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="sortino" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/sortino"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Sortino Ratio", href: "/sortino" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.values(SORTINO_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.seriesLabel}</span>
              <textarea
                value={series}
                rows={3}
                onChange={(e) => setSeries(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                placeholder="1.2, 1.0, -1.5, 1.1, ..."
              />
            </label>
            <p className="text-xs text-slate-400 mt-1">{L.seriesHint}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.freqLabel}</span>
              <select value={freq}
                onChange={(e) => setFreq(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                {FREQ_OPTIONS.map((f) => (
                  <option key={f} value={f}>{L.freqLabels[f]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.marLabel}</span>
              <input type="number" value={marPct} step={0.1}
                onChange={(e) => setMarPct(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.sortinoLabel}</div>
                <div className={`text-4xl font-bold ${vColor}`}>{fmtNum(res.sortino)}</div>
                <div className={`text-xs mt-1 ${vColor}`}>{L.verdictLabels ? L.verdictLabels[res.verdict] : res.verdict}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.annualizedLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.annualized)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.ddLabel}</div>
                  <div className="text-xl font-bold text-rose-600">{fmtPct(res.downsideDeviation)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.marLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.mar)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.periodsLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.n}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4">
                <div className="text-xs text-slate-400 mb-2">{L.wealthLabel}</div>
                <WealthSparkline data={curve} />
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/calmar" className="text-indigo-500 hover:underline">→ {L.linkCalmar}</Link>
                {" · "}
                <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
                {" · "}
                <Link href="/performance" className="text-indigo-500 hover:underline">→ {L.linkPerformance}</Link>
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
      <CrossLinks slug="sortino" />
      <Footer />
    </div>
  );
}

const zh = {
  title: "Sortino 比率计算器",
  subtitle: "输入一串周期收益，算年化收益(CAGR)、年化下行偏差与 Sortino = (CAGR − MAR) ÷ 下行偏差；只惩罚下行风险，更贴近投资者真实风险感知。",
  seriesLabel: "周期收益序列（%，每行或逗号分隔）",
  seriesHint: "例：1.2, 1.0, -1.5, 1.1 …；每格为一个周期的收益率。",
  freqLabel: "频率（每年周期数）",
  marLabel: "最低可接受收益 MAR %（年）",
  freqLabels: { 1: "年度", 4: "季度", 12: "月度", 52: "周度", 252: "日度" },
  presetLabels: { steady: "稳健权益", hedge: "对冲基金", crypto: "高弹高震", quarter: "季度收益" },
  sortinoLabel: "Sortino 比率",
  annualizedLabel: "年化收益 (CAGR)",
  ddLabel: "年化下行偏差",
  periodsLabel: "周期数",
  wealthLabel: "财富指数曲线",
  verdictLabels: {
    excellent: "优秀（≥3）",
    good: "良好（1–3）",
    modest: "一般（0–1）",
    poor: "为负（<0）",
    infinite: "无下行（∞）",
  },
  invalid: "请输入至少 2 个周期收益，频率 > 0，且每格收益 > −100%。",
  disclaimer: "Sortino = (年化收益 − MAR) ÷ 年化下行偏差，只惩罚低于 MAR 的下行，比夏普更贴合下行敏感策略。假设给定收益序列，忽略交易成本与税费，不构成投资建议。",
  linkCalmar: "Calmar 比率",
  linkRisk: "风险仪表盘",
  linkPerformance: "业绩/交易日志",
  linkVar: "VaR 风险价值",
  faqTitle: "常见问题",
  howToTitle: "如何使用 Sortino 比率计算器",
  howTo: [
    "粘贴一串周期收益率（%），逗号或换行分隔，或点击预设填充。",
    "选择频率（年/季/月/周/日）——决定把收益与偏差年化到多少年。",
    "填入最低可接受收益 MAR（默认 0）——只有低于 MAR 的收益率计入下行偏差。",
    "读取 Sortino、年化收益、年化下行偏差与解读：Sortino 越高，每单位下行风险换来的收益越多。",
  ],
  faqs: [
    { q: "Sortino 比率怎么算？", a: "Sortino = (年化收益 − MAR) ÷ 年化下行偏差。它只惩罚低于 MAR 的下行收益，比用总波动率的夏普更贴近投资者真实风险感知。" },
    { q: "Sortino 和夏普/Calmar 有何不同？", a: "夏普用总标准差作分母，Calmar 用最大回撤，Sortino 用「下行标准差」（仅统计低于 MAR 的部分）。Sortino 不惩罚上行波动，更适合收益分布不对称的策略。" },
    { q: "MAR 是什么？", a: "MAR = 最低可接受收益（minimum acceptable return），如年化 2%。只有低于 MAR 的周期收益才计入下行偏差；MAR=0 时即惩罚所有负收益。" },
    { q: "Sortino 多少算好？", a: "经验上 >1 通常被视为良好，>3 被视为优秀；为负说明年化收益无法覆盖下行风险。具体好坏需结合策略与同类比较。" },
    { q: "为什么有时显示 ∞？", a: "当所有周期收益都不低于 MAR（无下行，下行偏差=0）时，Sortino 无定义（分母为 0），以 ∞ 表示；这是理想但较少见的情形。" },
  ],
};
const en = {
  title: "Sortino Ratio Calculator",
  subtitle: "Enter a series of period returns to get annualized return (CAGR), annualized downside deviation, and Sortino = (CAGR − MAR) ÷ downside deviation — it penalizes downside risk only.",
  seriesLabel: "Period returns series (%, one per line or comma-separated)",
  seriesHint: "e.g. 1.2, 1.0, -1.5, 1.1 …; each entry is one period's return.",
  freqLabel: "Frequency (periods per year)",
  marLabel: "Min. acceptable return MAR % (annual)",
  freqLabels: { 1: "Annual", 4: "Quarterly", 12: "Monthly", 52: "Weekly", 252: "Daily" },
  presetLabels: { steady: "Steady equity", hedge: "Hedge fund", crypto: "Crypto-like", quarter: "Quarterly" },
  sortinoLabel: "Sortino Ratio",
  annualizedLabel: "Annualized (CAGR)",
  ddLabel: "Annualized downside dev.",
  periodsLabel: "Periods",
  wealthLabel: "Wealth index",
  verdictLabels: {
    excellent: "Excellent (≥3)",
    good: "Good (1–3)",
    modest: "Modest (0–1)",
    poor: "Negative (<0)",
    infinite: "No downside (∞)",
  },
  invalid: "Enter at least 2 period returns, frequency > 0, and each return > -100%.",
  disclaimer: "Sortino = (annualized return − MAR) ÷ annualized downside deviation; it penalizes only downside below MAR, fitting asymmetric strategies better than Sharpe. Assumes the given return series, ignores costs and taxes. Not investment advice.",
  linkCalmar: "Calmar Ratio",
  linkRisk: "Risk Dashboard",
  linkPerformance: "Performance / Journal",
  linkVar: "Value at Risk (VaR)",
  faqTitle: "FAQ",
  howToTitle: "How to use the Sortino ratio calculator",
  howTo: [
    "Paste a series of period returns (%) separated by commas or newlines, or click a preset.",
    "Pick a frequency (annual/quarterly/monthly/weekly/daily) — it sets how returns and deviation are annualized.",
    "Enter a minimum acceptable return MAR (default 0) — only periods below MAR count toward downside deviation.",
    "Read Sortino, annualized return, annualized downside deviation and the verdict: the higher the Sortino, the more return per unit of downside risk.",
  ],
  faqs: [
    { q: "How is the Sortino ratio computed?", a: "Sortino = (annualized return − MAR) ÷ annualized downside deviation. It penalizes only returns below MAR, tracking an investor's downside risk more closely than Sharpe, which uses total volatility." },
    { q: "How does Sortino differ from Sharpe and Calmar?", a: "Sharpe uses total standard deviation; Calmar uses max drawdown; Sortino uses the downside standard deviation (only periods below MAR). Sortino ignores upside volatility, suiting asymmetric return distributions." },
    { q: "What is MAR?", a: "MAR = minimum acceptable return, e.g. 2% annual. Only period returns below MAR count toward downside deviation; with MAR = 0 it penalizes all negative returns." },
    { q: "What Sortino is considered good?", a: "As a rule of thumb >1 is usually good and >3 excellent; a negative Sortino means the annualized return does not cover downside risk. Judge relative to peers." },
    { q: "Why does it sometimes show ∞?", a: "When no period return falls below MAR (zero downside deviation), Sortino is undefined (zero denominator) and shown as ∞ — an ideal but uncommon case." },
  ],
};