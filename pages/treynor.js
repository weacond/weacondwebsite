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
import { treynorSummary, TREYNOR_PRESETS } from "../lib/treynor";

export const metadata = {
  title: "Treynor 比率计算器 — Weacond",
  description: "输入组合收益、无风险利率与 beta，算 Treynor 比率 = (年化收益 − 无风险) ÷ beta；衡量每承担一单位系统风险换来多少超额。教育性参考。",
  robots: { index: true, follow: true },
};

const verdictColor = {
  excellent: "text-emerald-600",
  good: "text-indigo-600",
  modest: "text-amber-600",
  poor: "text-rose-600",
  invalid: "text-slate-400",
};

function fmtNum(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(4);
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}

export default function TreynorPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [rpPct, setRpPct] = useState(TREYNOR_PRESETS.beat.rp);
  const [rfPct, setRfPct] = useState(TREYNOR_PRESETS.beat.rf);
  const [beta, setBeta] = useState(TREYNOR_PRESETS.beat.beta);

  const applyPreset = (p) => {
    setRpPct(p.rp);
    setRfPct(p.rf || 0);
    setBeta(p.beta);
  };

  // UI 以 % 输入，调用处换算为小数（与 alpha 的 *Summary 约定一致）。
  const res = useMemo(
    () => treynorSummary({
      rp: (rpPct || 0) / 100,
      rf: (rfPct || 0) / 100,
      beta,
    }),
    [rpPct, rfPct, beta]
  );

  const vColor = verdictColor[res.verdict] || "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="treynor" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/treynor"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Treynor Ratio", href: "/treynor" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.values(TREYNOR_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.rpLabel}</span>
              <input type="number" value={rpPct} step={0.1}
                onChange={(e) => setRpPct(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rfLabel}</span>
              <input type="number" value={rfPct} step={0.1}
                onChange={(e) => setRfPct(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.betaLabel}</span>
              <input type="number" value={beta} step={0.01}
                onChange={(e) => setBeta(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.treynorLabel}</div>
                <div className={`text-4xl font-bold ${vColor}`}>{fmtNum(res.treynor)}</div>
                <div className={`text-xs mt-1 ${vColor}`}>{L.verdictLabels ? L.verdictLabels[res.verdict] : res.verdict}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.excessLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.excessReturn)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.betaLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.beta.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.rpLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.rp)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.rfLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.rf)}</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/sharpe" className="text-indigo-500 hover:underline">→ {L.linkSharpe}</Link>
                {" · "}
                <Link href="/alpha" className="text-indigo-500 hover:underline">→ {L.linkAlpha}</Link>
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
      <CrossLinks slug="treynor" />
      <Footer />
    </div>
  );
}

const zh = {
  title: "Treynor 比率计算器",
  subtitle: "输入组合收益、无风险利率与 beta，算 Treynor 比率 = (年化收益 − 无风险利率) ÷ beta；衡量每承担一单位系统风险换来多少超额，与夏普互补（系统风险 vs 总风险）。",
  rpLabel: "组合收益 %（年化）",
  rfLabel: "无风险利率 %（年化）",
  betaLabel: "Beta（系统风险）",
  presetLabels: { beat: "高效超配", betaPlay: "高 beta 一般", under: "低效落后", def: "防御稳健" },
  treynorLabel: "Treynor Ratio",
  excessLabel: "超额收益 (Rp − Rf)",
  verdictLabels: {
    excellent: "优秀（≥0.10）",
    good: "良好（0.05–0.10）",
    modest: "一般（0–0.05）",
    poor: "为负（<0）",
    invalid: "输入无效",
  },
  invalid: "请输入有效的组合收益（数字），且 beta ≠ 0。",
  disclaimer: "Treynor = (组合年化收益 − 无风险利率) ÷ beta，衡量每单位系统风险换来多少超额；越高越优。假设给定输入，忽略成本与税费，不构成投资建议。",
  linkSharpe: "Sharpe 比率",
  linkAlpha: "Jensen's Alpha",
  linkCalmar: "Calmar 比率",
  faqTitle: "常见问题",
  howToTitle: "如何使用 Treynor 比率计算器",
  howTo: [
    "输入组合收益 Rp、无风险利率 Rf 与 beta，或点击预设。",
    "超额收益 = Rp − Rf：组合相对无风险利率的回报。",
    "Treynor = 超额收益 ÷ beta：每承担一单位系统风险换来的超额。",
    "读取 Treynor 与解读：越高，单位系统风险换来的超额越多。",
  ],
  faqs: [
    { q: "Treynor 比率怎么算？", a: "Treynor = (组合年化收益 − 无风险利率) ÷ beta。它衡量每承担一单位系统性风险（beta）换来多少超额收益，数值越高越优。" },
    { q: "Treynor 和 Sharpe 有何不同？", a: "二者都是风险调整收益：Sharpe 以总波动率(标准差)为分母，对称看待上下行；Treynor 以 beta 为分母，只看系统风险。若组合高度分散，二者接近；集中持股则差异明显。" },
    { q: "Treynor 多少算好？", a: "Treynor 为相对指标，越高越好；经验上 >0.05（每单位 beta 5% 超额）通常被视为良好，>0.10 视为优秀；为负说明超额收益无法覆盖系统风险。需结合同类比较。" },
    { q: "为什么高 beta 可能 Treynor 更低？", a: "Treynor 以 beta 为分母：beta 越高，单位风险成本越大，同样的超额被稀释，Treynor 下降。高 beta 只有在超额足够大时才能维持高 Treynor。" },
    { q: "高 Treynor 一定好嗎？", a: "高 Treynor 表示每单位系统风险换来高超额，但若样本期短或 beta 估计不稳，高 Treynor 未必可持续。需结合样本质量与同类比较。" },
  ],
};
const en = {
  title: "Treynor Ratio Calculator",
  subtitle: "Enter portfolio return, risk-free rate and beta to get the Treynor ratio = (annualized return − risk-free) ÷ beta — excess return earned per unit of systematic risk, the beta-based complement to Sharpe.",
  rpLabel: "Portfolio return % (annual)",
  rfLabel: "Risk-free rate % (annual)",
  betaLabel: "Beta (systematic risk)",
  presetLabels: { beat: "High efficiency", betaPlay: "High-beta modest", under: "Low efficiency", def: "Defensive" },
  treynorLabel: "Treynor Ratio",
  excessLabel: "Excess return (Rp − Rf)",
  verdictLabels: {
    excellent: "Excellent (≥0.10)",
    good: "Good (0.05–0.10)",
    modest: "Modest (0–0.05)",
    poor: "Negative (<0)",
    invalid: "Invalid input",
  },
  invalid: "Enter a valid portfolio return (a number) and beta ≠ 0.",
  disclaimer: "Treynor = (annualized portfolio return − risk-free rate) ÷ beta; the more excess earned per unit of systematic risk, the higher. Assumes the given inputs, ignores costs and taxes. Not investment advice.",
  linkSharpe: "Sharpe Ratio",
  linkAlpha: "Jensen's Alpha",
  linkCalmar: "Calmar Ratio",
  faqTitle: "FAQ",
  howToTitle: "How to use the Treynor ratio calculator",
  howTo: [
    "Enter portfolio return Rp, risk-free rate Rf and beta (or click a preset).",
    "Excess return = Rp − Rf: the portfolio's return above the risk-free rate.",
    "Treynor = excess return ÷ beta: the excess earned per unit of systematic risk.",
    "Read the Treynor and verdict: the higher, the more excess per unit of systematic risk.",
  ],
  faqs: [
    { q: "How is the Treynor ratio computed?", a: "Treynor = (annualized portfolio return − risk-free rate) ÷ beta. It gauges the excess return earned per unit of systematic risk (beta); higher is better." },
    { q: "How does Treynor differ from Sharpe?", a: "Both are risk-adjusted returns: Sharpe uses total volatility (standard deviation) symmetrically, Treynor uses beta (systematic risk only). For a well-diversified portfolio they are close; for concentrated holdings they differ markedly." },
    { q: "What Treynor is considered good?", a: "Treynor is relative; higher is better. As a rule of thumb >0.05 (5% excess per unit beta) is usually solid and >0.10 excellent; a negative Treynor means excess return does not cover systematic risk. Judge relative to peers." },
    { q: "Why can high beta yield a lower Treynor?", a: "Treynor divides by beta: a higher beta raises the per-unit risk cost, so the same excess is diluted and Treynor falls. High beta sustains a high Treynor only when the excess is large enough." },
    { q: "Is a high Treynor always good?", a: "A high Treynor means high excess per unit of systematic risk, but with a short sample or an unstable beta estimate it may not be sustainable. Judge alongside sample quality and peers." },
  ],
};