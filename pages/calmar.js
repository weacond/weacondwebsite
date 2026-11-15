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
  calmarSummary,
  CALMAR_PRESETS,
} from "../lib/calmar";

export const metadata = {
  title: "Calmar 比率计算器 — Weacond",
  description: "输入一串周期收益，算年化收益(CAGR)、最大回撤(MDD) 与 Calmar = 年化÷|回撤|；含净 Calmar 与风险调整解读。教育性参考。",
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

export default function CalmarPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [series, setSeries] = useState(CALMAR_PRESETS.steady.returns);
  const [freq, setFreq] = useState(CALMAR_PRESETS.steady.freq);
  const [rfPct, setRfPct] = useState(CALMAR_PRESETS.steady.rf * 100);

  const applyPreset = (p) => {
    setSeries(p.returns);
    setFreq(p.freq);
    setRfPct((p.rf || 0) * 100);
  };

  const returns = useMemo(() => parseReturns(series), [series]);
  const res = useMemo(
    () => calmarSummary({ returns, freq, rf: (rfPct || 0) / 100 }),
    [returns, freq, rfPct]
  );
  const curve = useMemo(() => (res.valid ? wealthIndex(returns) : null), [res, returns]);

  const vColor = verdictColor[res.verdict] || "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="calmar" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/calmar"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Calmar Ratio", href: "/calmar" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.values(CALMAR_PRESETS).map((p) => (
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
              <span className="text-xs text-slate-500">{L.rfLabel}</span>
              <input type="number" value={rfPct} step={0.1}
                onChange={(e) => setRfPct(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.calmarLabel}</div>
                <div className={`text-4xl font-bold ${vColor}`}>{fmtNum(res.calmar)}</div>
                <div className={`text-xs mt-1 ${vColor}`}>{L.verdictLabels ? L.verdictLabels[res.verdict] : res.verdict}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.annualizedLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.annualized)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.mddLabel}</div>
                  <div className="text-xl font-bold text-rose-600">-{fmtPct(res.mdd)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.calmarRfLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{fmtNum(res.calmarRf)}</div>
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
                <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
                {" · "}
                <Link href="/performance" className="text-indigo-500 hover:underline">→ {L.linkPerformance}</Link>
                {" · "}
                <Link href="/var" className="text-indigo-500 hover:underline">→ {L.linkVar}</Link>
                {" · "}
                <Link href="/drawdown" className="text-indigo-500 hover:underline">→ {L.linkDrawdown}</Link>
              </p>
              <FaqSection faqs={L.faqs} title={L.faqTitle} />
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
        </div>
      </section>
      <CrossLinks slug="calmar" />
      <Footer />
    </div>
  );
}

const zh = {
  title: "Calmar 比率计算器",
  subtitle: "输入一串周期收益，算年化收益(CAGR)、最大回撤(MDD) 与 Calmar = 年化 ÷ |回撤|；含扣无风险利率的净 Calmar 与风险调整解读。",
  seriesLabel: "周期收益序列（%，每行或逗号分隔）",
  seriesHint: "例：1.2, 1.0, -1.5, 1.1 …；每格为一个周期的收益率。",
  freqLabel: "频率（每年周期数）",
  rfLabel: "无风险利率 %（年）",
  freqLabels: { 1: "年度", 4: "季度", 12: "月度", 52: "周度", 252: "日度" },
  presetLabels: { steady: "稳健权益", volatile: "高波动", bondlike: "低波债券", crypto: "高弹高震" },
  calmarLabel: "Calmar 比率",
  annualizedLabel: "年化收益 (CAGR)",
  mddLabel: "最大回撤 (MDD)",
  calmarRfLabel: "净 Calmar（扣无风险）",
  periodsLabel: "周期数",
  wealthLabel: "财富指数曲线",
  verdictLabels: {
    excellent: "优秀（≥3）",
    good: "良好（1–3）",
    modest: "一般（0–1）",
    poor: "为负（<0）",
    infinite: "无回撤（∞）",
  },
  invalid: "请输入至少 2 个周期收益，频率 > 0，且每格收益 > −100%。",
  disclaimer: "Calmar = 年化收益 ÷ |最大回撤|，是经典风险调整指标；>1 通常稳健、>3 优秀。假设给定收益序列，忽略交易成本与税费，不构成投资建议。",
  linkRisk: "风险仪表盘",
  linkPerformance: "业绩/交易日志",
  linkVar: "VaR 风险价值",
  linkDrawdown: "回撤恢复",
  faqTitle: "常见问题",
  howToTitle: "如何使用 Calmar 比率计算器",
  howTo: [
    "粘贴一串周期收益率（%），逗号或换行分隔，或点击预设填充。",
    "选择频率（年/季/月/周/日）——决定把收益年化到多少年。",
    "填入无风险利率（可选），得到扣无风险利率的「净 Calmar」。",
    "读取 Calmar、年化收益、最大回撤与解读：Calmar 越高，每单位回撤换来的收益越多。",
  ],
  faqs: [
    { q: "Calmar 比率怎么算？", a: "Calmar = 年化收益(CAGR) ÷ |最大回撤(MDD)|。它衡量每承受一单位回撤换来多少收益，数值越高越稳健。" },
    { q: "Calmar 和夏普比率有何不同？", a: "夏普用波动率(标准差)作分母，Calmar 用最大回撤作分母。回撤更贴近投资者实际体验的「痛感」，故 Calmar 常用于对冲基金等回撤敏感策略。" },
    { q: "Calmar 多少算好？", a: "经验上 >1 通常被视为稳健，>3 被视为优秀；为负说明年化收益无法覆盖回撤。具体好坏需结合策略与同类比较。" },
    { q: "为什么有时显示 ∞？", a: "当序列单调上升、从未回撤(MDD=0)时，Calmar 无定义（分母为 0），以 ∞ 表示；这是理想但罕见的情形。" },
    { q: "净 Calmar 是什么？", a: "净 Calmar = (年化收益 − 无风险利率) ÷ |最大回撤|，剔除无风险收益后的风险调整效率，便于跨利率环境比较。" },
  ],
};
const en = {
  title: "Calmar Ratio Calculator",
  subtitle: "Enter a series of period returns to get annualized return (CAGR), max drawdown (MDD), and Calmar = annualized ÷ |MDD| — plus a risk-free-adjusted net Calmar.",
  seriesLabel: "Period returns series (%, one per line or comma-separated)",
  seriesHint: "e.g. 1.2, 1.0, -1.5, 1.1 …; each entry is one period's return.",
  freqLabel: "Frequency (periods per year)",
  rfLabel: "Risk-free rate % (annual)",
  freqLabels: { 1: "Annual", 4: "Quarterly", 12: "Monthly", 52: "Weekly", 252: "Daily" },
  presetLabels: { steady: "Steady equity", volatile: "Volatile", bondlike: "Bond-like", crypto: "Crypto-like" },
  calmarLabel: "Calmar Ratio",
  annualizedLabel: "Annualized (CAGR)",
  mddLabel: "Max Drawdown (MDD)",
  calmarRfLabel: "Net Calmar (ex-risk-free)",
  periodsLabel: "Periods",
  wealthLabel: "Wealth index",
  verdictLabels: {
    excellent: "Excellent (≥3)",
    good: "Good (1–3)",
    modest: "Modest (0–1)",
    poor: "Negative (<0)",
    infinite: "No drawdown (∞)",
  },
  invalid: "Enter at least 2 period returns, frequency > 0, and each return > -100%.",
  disclaimer: "Calmar = annualized return ÷ |max drawdown|, a classic risk-adjusted metric; >1 is usually solid, >3 excellent. Assumes the given return series, ignores costs and taxes. Not investment advice.",
  linkRisk: "Risk Dashboard",
  linkPerformance: "Performance / Journal",
  linkVar: "Value at Risk (VaR)",
  linkDrawdown: "Drawdown Recovery",
  faqTitle: "FAQ",
  howToTitle: "How to use the Calmar ratio calculator",
  howTo: [
    "Paste a series of period returns (%) separated by commas or newlines, or click a preset.",
    "Pick a frequency (annual/quarterly/monthly/weekly/daily) — it sets how many periods per year.",
    "Enter a risk-free rate (optional) to get the net Calmar (ex-risk-free).",
    "Read Calmar, annualized return, max drawdown and the verdict: the higher the Calmar, the more return per unit of drawdown.",
  ],
  faqs: [
    { q: "How is the Calmar ratio computed?", a: "Calmar = annualized return (CAGR) ÷ |max drawdown (MDD)|. It measures return earned per unit of drawdown taken; higher is more robust." },
    { q: "How does Calmar differ from the Sharpe ratio?", a: "Sharpe uses volatility (standard deviation) as the denominator; Calmar uses max drawdown. Drawdown tracks the pain an investor actually feels, so Calmar is favored for drawdown-sensitive strategies such as hedge funds." },
    { q: "What Calmar is considered good?", a: "As a rule of thumb >1 is usually solid and >3 excellent; a negative Calmar means the annualized return does not cover the drawdown. Judge relative to peers." },
    { q: "Why does it sometimes show ∞?", a: "When the series never draws down (MDD = 0, monotonically increasing), Calmar is undefined (zero denominator) and shown as ∞ — an ideal but rare case." },
    { q: "What is the net Calmar?", a: "Net Calmar = (annualized return − risk-free rate) ÷ |max drawdown|, i.e. risk-adjusted efficiency after stripping out the risk-free return, useful for comparing across interest-rate environments." },
  ],
};