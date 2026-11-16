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
import { alphaSummary, ALPHA_PRESETS } from "../lib/alpha";

export const metadata = {
  title: "Jensen's Alpha 计算器 — Weacond",
  description: "输入组合收益、市场收益、无风险利率与 beta，算 CAPM 预期收益与 Jensen's Alpha（纯超额）；衡量跑赢/跑输市场。教育性参考。",
  robots: { index: true, follow: true },
};

const verdictColor = {
  strong: "text-emerald-600",
  outperform: "text-indigo-600",
  underperform: "text-amber-600",
  weak: "text-rose-600",
  invalid: "text-slate-400",
};

function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}

export default function AlphaPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [rpPct, setRpPct] = useState(ALPHA_PRESETS.beat.rp);
  const [rmPct, setRmPct] = useState(ALPHA_PRESETS.beat.rm);
  const [rfPct, setRfPct] = useState(ALPHA_PRESETS.beat.rf);
  const [beta, setBeta] = useState(ALPHA_PRESETS.beat.beta);

  const applyPreset = (p) => {
    setRpPct(p.rp);
    setRmPct(p.rm);
    setRfPct(p.rf || 0);
    setBeta(p.beta);
  };

  // UI 以 % 输入，调用处换算为小数（与 calmar/sortino 的 *Summary 约定一致）。
  const res = useMemo(
    () => alphaSummary({
      rp: (rpPct || 0) / 100,
      rm: (rmPct || 0) / 100,
      rf: (rfPct || 0) / 100,
      beta,
    }),
    [rpPct, rmPct, rfPct, beta]
  );

  const vColor = verdictColor[res.verdict] || "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="alpha" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/alpha"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Jensen's Alpha", href: "/alpha" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.values(ALPHA_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.rpLabel}</span>
              <input type="number" value={rpPct} step={0.1}
                onChange={(e) => setRpPct(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rmLabel}</span>
              <input type="number" value={rmPct} step={0.1}
                onChange={(e) => setRmPct(parseFloat(e.target.value) || 0)}
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
                <div className="text-xs text-slate-400 mb-1">{L.alphaLabel}</div>
                <div className={`text-4xl font-bold ${vColor}`}>{fmtPct(res.alpha)}</div>
                <div className={`text-xs mt-1 ${vColor}`}>{L.verdictLabels ? L.verdictLabels[res.verdict] : res.verdict}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.expectedLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.expected)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.marketPremiumLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.marketPremium)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.rpLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtPct(res.rp)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.betaLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.beta}</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/calmar" className="text-indigo-500 hover:underline">→ {L.linkCalmar}</Link>
                {" · "}
                <Link href="/sortino" className="text-indigo-500 hover:underline">→ {L.linkSortino}</Link>
                {" · "}
                <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
                {" · "}
                <Link href="/portfolio-beta" className="text-indigo-500 hover:underline">→ {L.linkBeta}</Link>
              </p>
              <FaqSection faqs={L.faqs} title={L.faqTitle} />
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
        </div>
      </section>
      <CrossLinks slug="alpha" />
      <Footer />
    </div>
  );
}

const zh = {
  title: "Jensen's Alpha 计算器",
  subtitle: "输入组合收益、市场收益、无风险利率与 beta，算 CAPM 预期收益与 Jensen's Alpha（纯超额）；衡量是否跑赢/跑输市场。",
  rpLabel: "组合收益 %（年）",
  rmLabel: "市场收益 %（年）",
  rfLabel: "无风险利率 %（年）",
  betaLabel: "Beta（系统风险）",
  presetLabels: { beat: "跑赢市场", betaPlay: "纯 beta", under: "跑输市场", highBeta: "高 beta 落后" },
  alphaLabel: "Jensen's Alpha",
  expectedLabel: "CAPM 预期收益",
  marketPremiumLabel: "市场溢价 (Rm−Rf)",
  verdictLabels: {
    strong: "明显跑赢（>1%）",
    outperform: "小幅跑赢（0–1%）",
    underperform: "小幅跑输（-1%–0）",
    weak: "明显跑输（<-1%）",
    invalid: "输入无效",
  },
  invalid: "请输入有效的组合收益与市场收益（数字）。",
  disclaimer: "Jensen's Alpha = 组合收益 − CAPM 预期[Rf + beta×(Rm−Rf)]，剔除系统风险后的纯超额。假设给定输入，忽略交易成本与税费，不构成投资建议。",
  linkCalmar: "Calmar 比率",
  linkSortino: "Sortino 比率",
  linkRisk: "风险仪表盘",
  linkBeta: "组合 Beta",
  faqTitle: "常见问题",
  howToTitle: "如何使用 Jensen's Alpha 计算器",
  howTo: [
    "输入组合收益 Rp、市场收益 Rm、无风险利率 Rf 与 beta（或点击预设）。",
    "CAPM 预期收益 = Rf + beta × (Rm − Rf)：beta 暴露带来的「应得」收益。",
    "Jensen's Alpha = Rp − CAPM 预期：跑赢则为正、跑输则为负。",
    "Alpha > 0 表示在承担相同系统风险后仍获得超额收益。",
  ],
  faqs: [
    { q: "Jensen's Alpha 怎么算？", a: "Jensen's Alpha = 实际组合收益 Rp − CAPM 预期收益 [Rf + beta×(Rm−Rf)]。它衡量剔除系统风险(beta)后，经理/策略创造的纯超额收益。" },
    { q: "Alpha 和夏普/Calmar 有何不同？", a: "夏普/Calmar/Sortino 看「风险调整后的效率」（收益÷风险），Alpha 看「绝对超额」（跑赢基准多少）。二者互补：Alpha 衡量能力，风险调整比率衡量性价比。" },
    { q: "Alpha 多少算好？", a: "Alpha > 0 即跑赢基准；>1%（年化）通常被视为稳健的超额能力；为负说明在承担相同系统风险下表现落后。需结合同类比较。" },
    { q: "beta 和 beta 溢价是什么？", a: "beta 衡量组合相对市场的系统风险敏感度（beta=1 与市场同波动）；市场溢价 Rm−Rf 是市场超额于无风险利率的部分，CAPM 据此推算预期收益。" },
    { q: "为什么高 beta 也会跑输？", a: "高 beta 放大市场涨跌；若 Rm 不高而组合 beta 大，CAPM 预期被抬高，组合收益难以覆盖，Alpha 转负——「高 beta 落后」即此情形。" },
  ],
};
const en = {
  title: "Jensen's Alpha Calculator",
  subtitle: "Enter portfolio return, market return, risk-free rate and beta to get the CAPM expected return and Jensen's Alpha (pure excess) — measure outperformance vs. the market.",
  rpLabel: "Portfolio return % (annual)",
  rmLabel: "Market return % (annual)",
  rfLabel: "Risk-free rate % (annual)",
  betaLabel: "Beta (systematic risk)",
  presetLabels: { beat: "Outperformer", betaPlay: "Beta play", under: "Underperformer", highBeta: "High-beta lag" },
  alphaLabel: "Jensen's Alpha",
  expectedLabel: "CAPM expected return",
  marketPremiumLabel: "Market premium (Rm−Rf)",
  verdictLabels: {
    strong: "Strong outperformance (>1%)",
    outperform: "Slight outperformance (0–1%)",
    underperform: "Slight underperformance (-1%–0)",
    weak: "Weak underperformance (<-1%)",
    invalid: "Invalid input",
  },
  invalid: "Enter valid portfolio and market returns (numbers).",
  disclaimer: "Jensen's Alpha = portfolio return − CAPM expected [Rf + beta×(Rm−Rf)], the pure excess after stripping systematic risk. Assumes the given inputs, ignores costs and taxes. Not investment advice.",
  linkCalmar: "Calmar Ratio",
  linkSortino: "Sortino Ratio",
  linkRisk: "Risk Dashboard",
  linkBeta: "Portfolio Beta",
  faqTitle: "FAQ",
  howToTitle: "How to use the Jensen's Alpha calculator",
  howTo: [
    "Enter portfolio return Rp, market return Rm, risk-free rate Rf and beta (or click a preset).",
    "CAPM expected return = Rf + beta × (Rm − Rf): the return beta exposure should earn.",
    "Jensen's Alpha = Rp − CAPM expected: positive if it beats the benchmark, negative if it lags.",
    "Alpha > 0 means the manager/strategy earned excess return for the same systematic risk.",
  ],
  faqs: [
    { q: "How is Jensen's Alpha computed?", a: "Jensen's Alpha = actual portfolio return Rp − CAPM expected return [Rf + beta×(Rm−Rf)]. It measures the pure excess a manager/strategy creates after stripping out systematic (beta) risk." },
    { q: "How does Alpha differ from Sharpe/Calmar?", a: "Sharpe/Calmar/Sortino measure risk-adjusted efficiency (return ÷ risk); Alpha measures absolute outperformance vs. a benchmark. They complement each other: Alpha gauges skill, risk-adjusted ratios gauge value-for-risk." },
    { q: "What Alpha is considered good?", a: "Alpha > 0 already beats the benchmark; >1% (annualized) is usually seen as solid excess skill; a negative Alpha means it lagged for the same systematic risk. Judge relative to peers." },
    { q: "What are beta and the market premium?", a: "Beta gauges the portfolio's sensitivity to market systematic risk (beta = 1 moves with the market); the market premium Rm−Rf is the market's excess over the risk-free rate, which CAPM uses to derive expected return." },
    { q: "Why can high beta still lose?", a: "High beta amplifies market moves; when Rm is modest but beta is large, the CAPM expected return is pushed up and the portfolio cannot cover it, so Alpha turns negative — the 'high-beta lag' case." },
  ],
};