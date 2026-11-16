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
  martinSummary,
  MARTIN_PRESETS,
} from "../lib/martin";

export const metadata = {
  title: "马丁比率计算器 — Weacond",
  description: "输入一串周期收益，算算术平均收益与年化下行偏差，得到马丁比率 Martin = (平均收益 − 无风险) ÷ 下行偏差 × √freq；与 Sortino 同族，仅惩罚亏损。教育性参考。",
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

export default function MartinPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [series, setSeries] = useState(MARTIN_PRESETS.excellent.returns);
  const [freq, setFreq] = useState(MARTIN_PRESETS.excellent.freq);
  const [rfPct, setRfPct] = useState(MARTIN_PRESETS.excellent.rf * 100);

  const applyPreset = (p) => {
    setSeries(p.returns);
    setFreq(p.freq);
    setRfPct((p.rf || 0) * 100);
  };

  const returns = useMemo(() => parseReturns(series), [series]);
  const res = useMemo(
    () => martinSummary({ returns, freq, rf: (rfPct || 0) / 100 }),
    [returns, freq, rfPct]
  );

  const vColor = verdictColor[res.verdict] || "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="martin" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/martin"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Martin Ratio", href: "/martin" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.values(MARTIN_PRESETS).map((p) => (
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
          <p className="text-[11px] text-slate-400 mb-4">{L.hint}</p>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.martinLabel}</div>
                <div className={`text-4xl font-bold ${vColor}`}>{fmtNum(res.martin)}</div>
                <div className={`text-xs mt-1 ${vColor}`}>{L.verdictLabels ? L.verdictLabels[res.verdict] : res.verdict}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.meanLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.mean)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.downsideLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.downsideDeviation)}</div>
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
      <CrossLinks slug="martin" />
      <Footer />
    </div>
  );
}
const zh = {
  title: "马丁比率计算器",
  subtitle: "输入一串周期收益，算算术平均收益与年化下行偏差，得到马丁比率 Martin = (平均收益 − 无风险) ÷ 下行偏差 × √freq；与 Sortino 同族，仅惩罚亏损（阈值 0）。",
  seriesLabel: "周期收益序列 %（每行或逗号分隔）",
  seriesHint: "如 1.2, 1.0, -1.5, 1.1 …；每行/每项为一个周期收益。",
  freqLabel: "频率（每年周期数）",
  rfLabel: "无风险利率 %（年化）",
  hint: "Martin 用算术平均收益（非 CAGR），且下行偏差以 0 为阈值（仅惩罚亏损），与 Sortino（以 MAR 为阈值）略有不同。",
  freqLabels: { 1: "年度", 4: "季度", 12: "月度", 52: "周度", 252: "日度" },
  presetLabels: { excellent: "高下行调整收益", good: "高弹高震", modest: "单一大回撤", poor: "净亏损" },
  martinLabel: "Martin Ratio",
  meanLabel: "每周期平均收益",
  downsideLabel: "每周期下行偏差",
  periodsLabel: "周期数",
  verdictLabels: {
    excellent: "优秀（≥3）",
    good: "良好（1–3）",
    modest: "一般（0–1）",
    poor: "为负（<0）",
    infinite: "无下行（∞）",
  },
  invalid: "请输入至少 2 个周期收益，频率 > 0，且每个收益 > -100%。",
  disclaimer: "Martin = (平均收益 − 无风险) ÷ 下行偏差 × √freq，仅惩罚低于 0 的下行，越高越优。假设给定收益序列，忽略成本与税费，不构成投资建议。",
  linkSharpe: "Sharpe 比率",
  linkSortino: "Sortino 比率",
  linkCalmar: "Calmar 比率",
  faqTitle: "常见问题",
  howToTitle: "如何使用马丁比率计算器",
  howTo: [
    "粘贴一串周期收益（%），逗号或换行分隔，或点击预设。",
    "选择频率（年/季/月/周/日）——决定每年周期数，用于年化。",
    "输入无风险利率（可选），从平均收益中剔除。",
    "读取马丁比率、平均收益、下行偏差与解读：越高，每单位下行换来的收益越多。",
  ],
  faqs: [
    { q: "马丁比率怎么算？", a: "Martin = (算术平均收益 − 无风险) ÷ 下行偏差 × √freq。下行偏差只统计低于 0 的亏损（阈值 0），与 Sortino（以可接受收益 MAR 为阈值）同族但略有不同。" },
    { q: "马丁比率和 Sortino 有何不同？", a: "二者都用下行偏差作分母：Martin 的下行阈值固定为 0（只惩罚绝对亏损），Sortino 的阈值为可接受收益 MAR（惩罚低于 MAR 的部分）。Martin 更强调绝对下行风险。" },
    { q: "马丁比率多少算好？", a: "经验上 >1 通常被视为稳健，>3 被视为优秀；为负说明平均收益无法覆盖无风险与下行。需结合策略、周期与同类比较。" },
    { q: "为什么有时显示 ∞？", a: "当所有周期收益都 ≥0（没有下行，下行偏差为 0，分母为 0）时，Martin 无定义，以 ∞ 表示；这是理想但罕见的情形。" },
    { q: "高马丁比率一定好吗？", a: "高马丁比率表示下行调整收益优秀，但若样本期短、含生存偏差或收益肥尾，未必可持续。需结合样本质量与同类比较。" },
  ],
};
const en = {
  title: "Martin Ratio Calculator",
  subtitle: "Enter a series of period returns to get the arithmetic mean and annualized downside deviation, then the Martin ratio = (mean − risk-free) ÷ downside deviation × √freq — a Sortino-family metric that penalizes only losses (threshold 0).",
  seriesLabel: "Period returns series (%, one per line or comma-separated)",
  seriesHint: "e.g. 1.2, 1.0, -1.5, 1.1 …; each entry is one period's return.",
  freqLabel: "Frequency (periods per year)",
  rfLabel: "Risk-free rate % (annual)",
  hint: "Martin uses the arithmetic mean (not CAGR) and a downside threshold of 0 (penalizes only losses), slightly different from Sortino (threshold = MAR).",
  freqLabels: { 1: "Annual", 4: "Quarterly", 12: "Monthly", 52: "Weekly", 252: "Daily" },
  presetLabels: { excellent: "High risk-adjusted", good: "Crypto-like", modest: "One big drawdown", poor: "Net loss" },
  martinLabel: "Martin Ratio",
  meanLabel: "Per-period mean",
  downsideLabel: "Per-period downside deviation",
  periodsLabel: "Periods",
  verdictLabels: {
    excellent: "Excellent (≥3)",
    good: "Good (1–3)",
    modest: "Modest (0–1)",
    poor: "Negative (<0)",
    infinite: "No downside (∞)",
  },
  invalid: "Enter at least 2 period returns, frequency > 0, and each return > -100%.",
  disclaimer: "Martin = (mean − risk-free) ÷ downside deviation × √freq; it penalizes only downside below 0, and higher is better. Assumes the given series, ignores costs and taxes. Not investment advice.",
  linkSharpe: "Sharpe Ratio",
  linkSortino: "Sortino Ratio",
  linkCalmar: "Calmar Ratio",
  faqTitle: "FAQ",
  howToTitle: "How to use the Martin ratio calculator",
  howTo: [
    "Paste a series of period returns (%) separated by commas or newlines, or click a preset.",
    "Pick a frequency (annual/quarterly/monthly/weekly/daily) — it sets periods per year for annualization.",
    "Enter a risk-free rate (optional) to strip it out of the mean return.",
    "Read the Martin ratio, mean return, downside deviation and the verdict: the higher, the more return per unit of downside.",
  ],
  faqs: [
    { q: "How is the Martin ratio computed?", a: "Martin = (arithmetic mean − risk-free) ÷ downside deviation × √freq. The downside deviation counts only returns below 0 (threshold 0); it is a Sortino-family metric but uses a fixed 0 threshold instead of MAR." },
    { q: "How does Martin differ from Sortino?", a: "Both use downside deviation as the denominator: Martin's threshold is fixed at 0 (penalizes only absolute losses), while Sortino's threshold is the Minimum Acceptable Return MAR (penalizes returns below MAR). Martin emphasizes absolute downside risk." },
    { q: "What Martin ratio is good?", a: "As a rule of thumb >1 is usually solid and >3 excellent; a negative value means the mean return cannot cover the risk-free rate and downside. Judge relative to the strategy, period and peers." },
    { q: "Why does it sometimes show ∞?", a: "When all period returns are ≥ 0 (no downside, so downside deviation = 0 and the denominator is 0), Martin is undefined and shown as ∞ — an ideal but rare case." },
    { q: "Is a high Martin ratio always good?", a: "A high Martin ratio means excellent downside-adjusted return, but with a short sample, survivorship bias, or fat-tailed returns it may not be sustainable. Judge alongside sample quality and peers." },
  ],
};
