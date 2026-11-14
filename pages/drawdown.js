"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import FaqLd from "../components/FaqLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import FaqSection from "../components/FaqSection";
import Link from "next/link";
import { recoveryGainPct, recoveryTime, RECOVERY_TABLE, validDrawdown } from "../lib/drawdown";

export const metadata = {
  title: "回撤恢复计算器 — Weacond",
  description: "给定回撤幅度与年化 CAGR，算出回本所需涨幅与预计恢复时间。揭示回撤的不对称性。教育性参考。",
  robots: { index: true, follow: true },
};

export default function DrawdownPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [dd, setDd] = useState(50);
  const [cagr, setCagr] = useState(10);

  const gain = recoveryGainPct(dd);
  const rec = recoveryTime(dd, cagr);
  const valid = validDrawdown(dd);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="drawdown" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/drawdown"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Drawdown Recovery", href: "/drawdown" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.ddLabel}</span>
              <div className="mt-1 flex items-center gap-2">
                <input type="number" value={dd} min={0} max={100} step={1}
                  onChange={(e) => setDd(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
                <span className="text-xs text-slate-400 w-6">%</span>
              </div>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.cagrLabel}</span>
              <div className="mt-1 flex items-center gap-2">
                <input type="number" value={cagr} min={-20} max={40} step={0.5}
                  onChange={(e) => setCagr(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
                <span className="text-xs text-slate-400 w-6">%</span>
              </div>
            </label>
          </div>

          {!valid && <p className="text-xs text-red-500 mb-4">{L.invalid}</p>}

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 text-center">
            <div className="text-xs text-slate-400 mb-1">{L.gainLabel}</div>
            <div className="text-4xl font-bold text-red-600 mb-4">
              {Number.isFinite(gain) ? `+${gain.toFixed(1)}%` : L.never}
            </div>
            <div className="text-xs text-slate-400 mb-1">{L.timeLabel}</div>
            <div className="text-2xl font-bold text-slate-800">
              {rec.possible ? `${rec.years.toFixed(1)} ${L.years}` : L.never}
            </div>
            <p className="text-sm text-slate-500 mt-4">{L.insight(dd, gain, cagr, rec)}</p>
          </div>

          {/* 速查表 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-6">
            <div className="text-xs text-slate-400 mb-3">{L.tableTitle}</div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {RECOVERY_TABLE.map((row) => (
                <button key={row.dd} onClick={() => setDd(row.dd)}
                  className={`text-center p-2 rounded-lg text-xs transition ${dd === row.dd ? "bg-indigo-50 border border-indigo-300" : "bg-slate-50 border border-transparent hover:bg-slate-100"}`}>
                  <div className="font-bold text-slate-700">-{row.dd}%</div>
                  <div className="text-slate-400">+{row.gain.toFixed(0)}%</div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
            {" · "}
            <Link href="/montecarlo" className="text-indigo-500 hover:underline">→ {L.linkMonteCarlo}</Link>
          </p>
          <FaqSection faqs={L.faqs} title={L.faqTitle} />
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "回撤恢复计算器",
  subtitle: "回撤与恢复不对称：跌 50% 要涨 100% 才回本。给定回撤幅度与年化收益，算出回本所需涨幅与时间。",
  ddLabel: "回撤幅度",
  cagrLabel: "年化 CAGR",
  gainLabel: "回本所需涨幅",
  timeLabel: "预计恢复时间",
  years: "年",
  never: "无法回本",
  invalid: "回撤需在 1%~99% 之间。",
  tableTitle: "常见回撤 → 回本涨幅（点击套用）",
  insight: (dd, gain, cagr, rec) =>
    `下跌 ${dd}% 需要上涨 ${Number.isFinite(gain) ? gain.toFixed(1) + "%" : "无穷"}才能回到原点；` +
    `按 ${cagr}% 年化，${rec.possible ? `约 ${rec.years.toFixed(1)} 年可回本` : "无法回本（CAGR 需 > 0）"}。`,
  disclaimer: "假设连续复利增长，忽略波动路径与最大回撤中的中途归零风险。教育用途，不构成投资建议。",
  linkRisk: "风险仪表盘",
  linkMonteCarlo: "蒙特卡洛",
  faqTitle: "常见问题",
  howToTitle: "如何使用回撤恢复计算器",
  howTo: [
    "输入回撤幅度 dd（0–100%，如 50% 表示账户从高点跌 50%）。",
    "查看回本所需涨幅：亏损 50% 需涨 100% 才能回本（不对称性，分母是缩水后的本金）。",
    "输入年化 CAGR，读取预计恢复时间（年）= ln(1+回本涨幅) / ln(1+CAGR)。",
    "回撤越大，回本涨幅越非线性：75% 回撤需涨 300%。",
  ],
  faqs: [
    { q: "跌 50% 要涨多少回本？", a: "需涨 100%——回撤与恢复不对称：跌幅越深，回本所需涨幅越大（跌 25% 需 33%，跌 75% 需 300%）。" },
    { q: "怎么算回本时间？", a: "在给定年化 CAGR 下，用连续复利估算从当前回撤值涨回原点的年数；CAGR ≤0 则无法回本。" },
    { q: "为何强调回撤不对称？", a: "因对数收益不对称：下跌 x% 需上涨 x/(100−x)×100% 才回本，深回撤恢复成本极高，凸显控制回撤的重要性。" },
    { q: "这个计算有什么局限？", a: "假设连续复利、忽略波动路径与中途归零风险，仅为教学示意；实盘需结合最大回撤与波动。" },
  ],
};
const en = {
  title: "Drawdown Recovery",
  subtitle: "Drawdowns and recoveries are asymmetric: a 50% drop needs a 100% gain. Given a drawdown and CAGR, compute the gain and time to break even.",
  ddLabel: "Drawdown",
  cagrLabel: "Annual CAGR",
  gainLabel: "Gain needed to recover",
  timeLabel: "Est. time to recover",
  years: "yrs",
  never: "No recovery",
  invalid: "Drawdown must be between 1% and 99%.",
  tableTitle: "Common drawdowns → recovery gain (tap to apply)",
  insight: (dd, gain, cagr, rec) =>
    `A ${dd}% drop needs a ${Number.isFinite(gain) ? gain.toFixed(1) + "%" : "infinite"} gain to break even; ` +
    `at ${cagr}% CAGR, ${rec.possible ? `it recovers in ~${rec.years.toFixed(1)} years` : "no recovery (CAGR must be > 0)"}.`,
  disclaimer: "Assumes continuous compounding; ignores path risk and intraday ruin. For education, not investment advice.",
  linkRisk: "Risk dashboard",
  linkMonteCarlo: "Monte Carlo",
  faqTitle: "FAQ",
  howToTitle: "How to use the drawdown recovery calculator",
  howTo: [
    "Enter the drawdown dd (0–100%, e.g. 50% means the account fell 50% from its peak).",
    "Read the recovery gain: a 50% loss needs a 100% gain to recover (asymmetry — the denominator is the shrunken base).",
    "Enter an annual CAGR and read the estimated recovery time (years) = ln(1+gain) / ln(1+CAGR).",
    "The larger the drawdown, the more nonlinear the recovery gain: a 75% drawdown needs a 300% gain.",
  ],
  faqs: [
    { q: "How much to recover a 50% drop?", a: "A 100% gain — drawdowns and recoveries are asymmetric: the deeper the drop, the larger the gain needed (−25% needs +33%, −75% needs +300%)." },
    { q: "How is recovery time computed?", a: "Given an annual CAGR, it estimates the years to compound from the current drawdown back to the start; CAGR ≤ 0 means no recovery." },
    { q: "Why emphasize asymmetry?", a: "Because log returns are asymmetric: an x% drop needs an x/(100−x)×100% gain to recover, so deep drawdowns cost far more — underscoring why controlling drawdown matters." },
    { q: "What are the limits of this calc?", a: "It assumes continuous compounding, ignoring path risk and intraday ruin — an educational illustration; live use needs max drawdown and volatility." },
  ],
};

