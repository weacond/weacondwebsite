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
  omegaSummary,
  OMEGA_PRESETS,
} from "../lib/omega";

export const metadata = {
  title: "Omega 比率计算器 — Weacond",
  description: "输入一串周期收益与阈值，算欧米伽比率 Omega = 上行总量 ÷ 下行总量；Sharpe/Sortino 的分布推广，不假设正态。教育性参考。",
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

export default function OmegaPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [series, setSeries] = useState(OMEGA_PRESETS.strong.returns);
  const [thPct, setThPct] = useState(OMEGA_PRESETS.strong.threshold * 100);

  const applyPreset = (p) => {
    setSeries(p.returns);
    setThPct((p.threshold || 0) * 100);
  };

  // UI 以 % 输入，调用处换算为小数（与 sharpe 的 *Summary 约定一致）。
  const returns = useMemo(() => parseReturns(series), [series]);
  const res = useMemo(
    () => omegaSummary({ returns, threshold: (thPct || 0) / 100 }),
    [returns, thPct]
  );

  const vColor = verdictColor[res.verdict] || "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="omega" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/omega"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Omega Ratio", href: "/omega" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.values(OMEGA_PRESETS).map((p) => (
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

          <div className="grid grid-cols-1 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.thLabel}</span>
              <input type="number" value={thPct} step={0.01}
                onChange={(e) => setThPct(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
              <span className="text-[11px] text-slate-400">{L.thHint}</span>
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.omegaLabel}</div>
                <div className={`text-4xl font-bold ${vColor}`}>{fmtNum(res.omega)}</div>
                <div className={`text-xs mt-1 ${vColor}`}>{L.verdictLabels ? L.verdictLabels[res.verdict] : res.verdict}</div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.upLabel}</div>
                  <div className="text-xl font-bold text-emerald-600">{fmtPct(res.up)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.downLabel}</div>
                  <div className="text-xl font-bold text-rose-600">{fmtPct(res.down)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.thLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct((thPct || 0) / 100)}</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/sharpe" className="text-indigo-500 hover:underline">→ {L.linkSharpe}</Link>
                {" · "}
                <Link href="/sortino" className="text-indigo-500 hover:underline">→ {L.linkSortino}</Link>
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
      <CrossLinks slug="omega" />
      <Footer />
    </div>
  );
}

const zh = {
  title: "Omega 比率计算器",
  subtitle: "输入一串周期收益与阈值 τ，算欧米伽比率 Omega = 上行总量 ÷ 下行总量；Sharpe/Sortino 的分布推广，不假设收益正态。",
  seriesLabel: "周期收益序列 %（每行或逗号分隔）",
  seriesHint: "如 1.5, 1.2, -0.3 …；每行/每项为一个周期收益。",
  thLabel: "阈值 τ %（通常取 0 或无风险利率）",
  thHint: "上行指 > τ，下行指 < τ；默认 0。",
  presetLabels: { strong: "强势上行", volatile: "高波动", balanced: "均衡震荡", heavy: "重亏下行" },
  omegaLabel: "Omega Ratio",
  upLabel: "累计上行",
  downLabel: "累计下行",
  verdictLabels: {
    excellent: "优秀（≥4）",
    good: "良好（2–4）",
    modest: "一般（1–2）",
    poor: "为负（<1）",
    infinite: "无下行（∞）",
    invalid: "输入无效",
  },
  invalid: "请输入至少 2 个周期收益，且每个收益 > -100%。",
  disclaimer: "Omega = 阈值以上累计上行 ÷ 以下累计下行，比较分布的上下行总量；>1 表示上行压过下行，越高越优。假设给定序列，忽略成本与税费，不构成投资建议。",
  linkSharpe: "Sharpe 比率",
  linkSortino: "Sortino 比率",
  linkCalmar: "Calmar 比率",
  faqTitle: "常见问题",
  howToTitle: "如何使用 Omega 比率计算器",
  howTo: [
    "粘贴一串周期收益（%），逗号或换行分隔，或点击预设。",
    "设置阈值 τ（默认 0）：上行指 > τ，下行指 < τ。",
    "Omega = 上行总量 ÷ 下行总量：比较分布的上下行。",
    "读取 Omega 与解读：>1 表示上行压过下行，越高越优。",
  ],
  faqs: [
    { q: "Omega 比率怎么算？", a: "Omega = Σ(r > τ)(r − τ) ÷ Σ(r < τ)(τ − r)，即阈值以上的累计上行除以以下的累计下行。它是 Sharpe/Sortino 的推广，不假设收益正态，直接比较上下行总量。" },
    { q: "Omega 和 Sharpe/Sortino 有何不同？", a: "Sharpe/Sortino 假设收益近似正态、用均值与(下行)标准差；Omega 不假设分布，直接比较上行与下行的累计总量，对肥尾、偏态更稳健。Omega > 1 等价于「上行总量压过下行总量」。" },
    { q: "Omega 多少算好？", a: "Omega > 1 表示上行压过下行（良好）；越高越优。经验上 1–2 一般、2–4 良好、≥4 优秀；<1 表示下行压过上行。需结合同类比较。" },
    { q: "为什么有时显示 ∞？", a: "当序列中没有任何收益低于阈值（无下行）且存在上行时，分母为 0，Omega 无定义，按惯例封顶显示 ∞/999；这是理想但罕见的情形。" },
    { q: "阈值 τ 取多少？", a: "τ 常取 0（绝对收益）或无风险利率/目标收益（相对收益）。τ 越高，越强调「超过目标」的能力，上下行的划分随之改变。" },
  ],
};
const en = {
  title: "Omega Ratio Calculator",
  subtitle: "Enter a series of period returns and a threshold τ to get the Omega ratio = cumulative upside ÷ cumulative downside — a distributional generalization of Sharpe/Sortino that assumes no normality.",
  seriesLabel: "Period returns series (%, one per line or comma-separated)",
  seriesHint: "e.g. 1.5, 1.2, -0.3 …; each entry is one period's return.",
  thLabel: "Threshold τ % (often 0 or the risk-free rate)",
  thHint: "Upside is > τ, downside is < τ; default 0.",
  presetLabels: { strong: "Strong up", volatile: "Volatile", balanced: "Balanced", heavy: "Heavy losses" },
  omegaLabel: "Omega Ratio",
  upLabel: "Cumulative upside",
  downLabel: "Cumulative downside",
  verdictLabels: {
    excellent: "Excellent (≥4)",
    good: "Good (2–4)",
    modest: "Modest (1–2)",
    poor: "Negative (<1)",
    infinite: "No downside (∞)",
    invalid: "Invalid input",
  },
  invalid: "Enter at least 2 period returns, each > -100%.",
  disclaimer: "Omega = cumulative upside above the threshold ÷ cumulative downside below it, comparing the distribution's upside and downside; >1 means upside outweighs downside, and higher is better. Assumes the given series, ignores costs and taxes. Not investment advice.",
  linkSharpe: "Sharpe Ratio",
  linkSortino: "Sortino Ratio",
  linkCalmar: "Calmar Ratio",
  faqTitle: "FAQ",
  howToTitle: "How to use the Omega ratio calculator",
  howTo: [
    "Paste a series of period returns (%) separated by commas or newlines, or click a preset.",
    "Set the threshold τ (default 0): upside is > τ, downside is < τ.",
    "Omega = cumulative upside ÷ cumulative downside: it compares the distribution's tails.",
    "Read the Omega and verdict: >1 means upside outweighs downside; higher is better.",
  ],
  faqs: [
    { q: "How is the Omega ratio computed?", a: "Omega = Σ(r>τ)(r−τ) ÷ Σ(r<τ)(τ−r): cumulative upside above the threshold divided by cumulative downside below it. It is a generalization of Sharpe/Sortino that assumes no normality, comparing upside and downside totals directly." },
    { q: "How does Omega differ from Sharpe/Sortino?", a: "Sharpe/Sortino assume returns are roughly normal and use the mean and (downside) standard deviation; Omega assumes no distribution and compares cumulative upside and downside, making it more robust to fat tails and skew. Omega > 1 means upside totals outweigh downside." },
    { q: "What Omega is considered good?", a: "Omega > 1 means upside outweighs downside (a good baseline); higher is better. As a rule of thumb 1–2 is modest, 2–4 good, and ≥4 excellent; <1 means downside outweighs upside. Judge relative to peers." },
    { q: "Why does it sometimes show ∞?", a: "When no return falls below the threshold (no downside) and upside exists, the denominator is 0 and Omega is undefined, capped at ∞/999 by convention — an ideal but rare case." },
    { q: "What threshold τ should I use?", a: "τ is often 0 (absolute return) or the risk-free/target rate (relative return). A higher τ emphasizes the ability to beat the target, shifting how upside and downside are split." },
  ],
};