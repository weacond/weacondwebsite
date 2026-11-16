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
  informationRatioSummary,
  INFO_RATIO_PRESETS,
} from "../lib/infoRatio";

export const metadata = {
  title: "Information Ratio 计算器 — Weacond",
  description: "输入组合与基准的逐期收益，算主动收益、追踪误差与信息比率 IR = 年化主动收益 ÷ 年化追踪误差；衡量跑赢基准的性价比。教育性参考。",
  robots: { index: true, follow: true },
};

// 周期频率选项（每年周期数）。
const FREQ_OPTIONS = [1, 4, 12, 52, 252];

const verdictColor = {
  excellent: "text-emerald-600",
  good: "text-indigo-600",
  modest: "text-amber-600",
  neutral: "text-slate-400",
  poor: "text-rose-600",
  undefined: "text-slate-400",
};

function fmtNum(x) {
  if (x == null || !Number.isFinite(x)) return "—";
  return x.toFixed(3);
}
function fmtPct(x) {
  if (x == null || !Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}

export default function InfoRatioPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [portfolio, setPortfolio] = useState(INFO_RATIO_PRESETS.beat.portfolio);
  const [benchmark, setBenchmark] = useState(INFO_RATIO_PRESETS.beat.benchmark);
  const [freq, setFreq] = useState(INFO_RATIO_PRESETS.beat.freq);

  const applyPreset = (p) => {
    setPortfolio(p.portfolio);
    setBenchmark(p.benchmark);
    setFreq(p.freq);
  };

  const pf = useMemo(() => parseReturns(portfolio), [portfolio]);
  const bm = useMemo(() => parseReturns(benchmark), [benchmark]);
  const res = useMemo(
    () => informationRatioSummary({ portfolio: pf, benchmark: bm, freq }),
    [pf, bm, freq]
  );

  const vColor = verdictColor[res.verdict] || "text-slate-400";
  const lenMismatch =
    pf && bm && pf.length !== bm.length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="info-ratio" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/info-ratio"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Info Ratio", href: "/info-ratio" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.values(INFO_RATIO_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.portfolioLabel}</span>
              <textarea value={portfolio} rows={3}
                onChange={(e) => setPortfolio(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.benchmarkLabel}</span>
              <textarea value={benchmark} rows={3}
                onChange={(e) => setBenchmark(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          <label className="block mb-4">
            <span className="text-xs text-slate-500">{L.freqLabel}</span>
            <select value={freq} onChange={(e) => setFreq(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
              {FREQ_OPTIONS.map((f) => (
                <option key={f} value={f}>{L.freqLabels ? L.freqLabels[f] : f + "/yr"}</option>
              ))}
            </select>
          </label>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.irLabel}</div>
                <div className={`text-4xl font-bold ${vColor}`}>{fmtNum(res.ir)}</div>
                <div className={`text-xs mt-1 ${vColor}`}>{L.verdictLabels ? L.verdictLabels[res.verdict] : res.verdict}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.activeReturnLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.activeReturn)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.trackingErrorLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.trackingError)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.periodsLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.n}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.freqLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{L.freqLabels ? L.freqLabels[freq] : freq + "/yr"}</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/calmar" className="text-indigo-500 hover:underline">→ {L.linkCalmar}</Link>
                {" · "}
                <Link href="/sortino" className="text-indigo-500 hover:underline">→ {L.linkSortino}</Link>
                {" · "}
                <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
              </p>
              <FaqSection faqs={L.faqs} title={L.faqTitle} />
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">
              {lenMismatch ? L.lenMismatch : L.invalid}
            </p>
          )}
        </div>
      </section>
      <CrossLinks slug="info-ratio" />
      <Footer />
    </div>
  );
}

const zh = {
  title: "Information Ratio 计算器",
  subtitle: "输入组合与基准的逐期收益，算主动收益、追踪误差与信息比率 IR = 年化主动收益 ÷ 年化追踪误差；衡量跑赢基准的性价比。",
  portfolioLabel: "组合逐期收益 %（逗号或换行分隔）",
  benchmarkLabel: "基准逐期收益 %（逗号或换行分隔，须与组合同期数一致）",
  freqLabel: "频率（每年周期数）",
  freqLabels: { 1: "年度", 4: "季度", 12: "月度", 52: "周度", 252: "日度" },
  presetLabels: { beat: "跑赢基准", track: "紧贴基准", lag: "跑输基准", diverge: "高跟踪误差" },
  irLabel: "Information Ratio",
  activeReturnLabel: "年化主动收益",
  trackingErrorLabel: "年化追踪误差",
  periodsLabel: "周期数",
  verdictLabels: {
    excellent: "优秀（≥0.75）",
    good: "良好（0.5–0.75）",
    modest: "一般（0–0.5）",
    neutral: "中性（=0）",
    poor: "为负（<0）",
    undefined: "无法计算",
  },
  lenMismatch: "组合与基准的周期数必须一致。",
  invalid: "请输入至少 2 个同期组合与基准收益，频率 > 0，且追踪误差需 > 0。",
  disclaimer: "IR = 年化主动收益 ÷ 年化追踪误差（主动收益 = 组合 − 基准，追踪误差 = 主动收益样本标准差），衡量每单位偏离基准换来多少超额。假设给定收益序列，忽略成本与税费，不构成投资建议。",
  linkCalmar: "Calmar 比率",
  linkSortino: "Sortino 比率",
  linkRisk: "风险仪表盘",
  faqTitle: "常见问题",
  howToTitle: "如何使用 Information Ratio 计算器",
  howTo: [
    "分别粘贴组合与基准的逐期收益（%），或点击预设；两序列周期数须一致。",
    "选择频率（年/季/月/周/日）——决定每年周期数，用于年化。",
    "主动收益 = 组合 − 基准（逐期），追踪误差 = 主动收益的样本标准差。",
    "IR = 年化主动收益 ÷ 年化追踪误差：越高，每单位跟踪误差换来的超额越多。",
  ],
  faqs: [
    { q: "Information Ratio 怎么算？", a: "IR = 年化主动收益 ÷ 年化追踪误差。主动收益是组合相对基准的超额（逐期相减），追踪误差是该超额序列的样本标准差；年化用 ×√freq。它衡量每单位跟踪误差换来多少超额。" },
    { q: "IR 和夏普比率有何不同？", a: "夏普以总波动(标准差)为分母、衡量绝对风险调整收益；IR 以相对基准的追踪误差为分母、衡量主动管理/超额能力。主动管理者更看重 IR。" },
    { q: "IR 多少算好？", a: "经验上 >0.5 通常被视为良好，>0.75 被视为优秀；为负说明主动收益无法覆盖追踪误差。需结合同类与成本比较。" },
    { q: "为什么有时显示「无法计算」？", a: "当组合与基准完全一致（主动收益恒为 0，追踪误差 = 0）或周期数不足/不一致时，IR 无定义（分母为 0），显示「无法计算」。" },
    { q: "高 IR 一定好嗎？", a: "高 IR 表示稳定跑赢基准，但若主动策略成本高或依赖不可持续的择时，高 IR 未必可复制。需结合绝对收益与同类比较。" },
  ],
};
const en = {
  title: "Information Ratio Calculator",
  subtitle: "Enter per-period returns for a portfolio and a benchmark to get active return, tracking error and the Information Ratio IR = annualized active ÷ annualized tracking error — value per unit of tracking error.",
  portfolioLabel: "Portfolio per-period returns % (comma or newline separated)",
  benchmarkLabel: "Benchmark per-period returns % (same number of periods as portfolio)",
  freqLabel: "Frequency (periods per year)",
  freqLabels: { 1: "Annual", 4: "Quarterly", 12: "Monthly", 52: "Weekly", 252: "Daily" },
  presetLabels: { beat: "Outperformer", track: "Tracks index", lag: "Laggard", diverge: "High tracking error" },
  irLabel: "Information Ratio",
  activeReturnLabel: "Annualized active return",
  trackingErrorLabel: "Annualized tracking error",
  periodsLabel: "Periods",
  verdictLabels: {
    excellent: "Excellent (≥0.75)",
    good: "Good (0.5–0.75)",
    modest: "Modest (0–0.5)",
    neutral: "Neutral (=0)",
    poor: "Negative (<0)",
    undefined: "Undefined",
  },
  lenMismatch: "Portfolio and benchmark must have the same number of periods.",
  invalid: "Enter at least 2 matched portfolio/benchmark periods, frequency > 0, and non-zero tracking error.",
  disclaimer: "IR = annualized active return ÷ annualized tracking error (active = portfolio − benchmark, tracking error = sample std of active returns), gauging excess earned per unit of tracking error. Assumes the given series, ignores costs and taxes. Not investment advice.",
  linkCalmar: "Calmar Ratio",
  linkSortino: "Sortino Ratio",
  linkRisk: "Risk Dashboard",
  faqTitle: "FAQ",
  howToTitle: "How to use the Information Ratio calculator",
  howTo: [
    "Paste per-period returns (%) for the portfolio and the benchmark separately, or click a preset; both series must have the same number of periods.",
    "Pick a frequency (annual/quarterly/monthly/weekly/daily) — it sets periods per year for annualization.",
    "Active return = portfolio − benchmark (per period); tracking error = sample standard deviation of the active returns.",
    "IR = annualized active ÷ annualized tracking error: the higher, the more excess earned per unit of tracking error.",
  ],
  faqs: [
    { q: "How is the Information Ratio computed?", a: "IR = annualized active return ÷ annualized tracking error. Active return is the portfolio's excess over the benchmark (subtracted per period); tracking error is the sample standard deviation of those active returns, annualized by ×√freq. It gauges excess earned per unit of tracking error." },
    { q: "How does IR differ from the Sharpe ratio?", a: "Sharpe uses total volatility (standard deviation) as the denominator for absolute risk-adjusted return; IR uses tracking error versus a benchmark for active/excess skill. Active managers care more about IR." },
    { q: "What IR is considered good?", a: "As a rule of thumb >0.5 is usually good and >0.75 excellent; a negative IR means active return does not cover tracking error. Judge relative to peers and costs." },
    { q: "Why does it sometimes show 'Undefined'?", a: "When the portfolio exactly tracks the benchmark (active returns are all zero, so tracking error = 0) or the period counts are unequal/insufficient, IR is undefined (zero denominator) and shown as 'Undefined'." },
    { q: "Is a high IR always good?", a: "A high IR means the portfolio beats its benchmark consistently, but if the active strategy is costly or relies on unsustainable timing, a high IR may not be repeatable. Judge alongside absolute return and peers." },
  ],
};