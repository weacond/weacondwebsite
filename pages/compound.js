"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import Link from "next/link";
import { futureValue, dcaVsLump, doublingYears, yearSchedule, validCompound } from "../lib/compound";

export const metadata = {
  title: "复利投资规划器 — Weacond",
  description: "本金 + 每月定投，按月复利计算终值、利息贡献；对比 DCA 与一次性投入，附 72 法则。教育性参考。",
  robots: { index: true, follow: true },
};

const fmt = (n) => Number.isFinite(n) ? Math.round(n).toLocaleString() : "—";

// 逐年终值迷你折线（自包含 SVG）
function GrowthSparkline({ data }) {
  const w = 640, h = 140, pad = 6;
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.fv)) || 1;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - d.fv / max) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#4f46e5" strokeWidth="1.5" />
    </svg>
  );
}

export default function CompoundPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [principal, setPrincipal] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(10); // 百分比
  const [years, setYears] = useState(10);

  const valid = validCompound({ principal, monthly, annualRate: rate / 100, years });
  const res = useMemo(() => {
    if (!validCompound({ principal, monthly, annualRate: rate / 100, years })) return null;
    const o = { principal, monthly, annualRate: rate / 100, years };
    return {
      fv: futureValue(o),
      cmp: dcaVsLump({ total: principal + monthly * years * 12, annualRate: rate / 100, years }),
      dbl: doublingYears(rate / 100),
      sched: yearSchedule(o),
    };
  }, [principal, monthly, rate, years]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="compound" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/compound"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Compound Growth Planner", href: "/compound" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.principalLabel}</span>
              <input type="number" value={principal} min={0} step={1000}
                onChange={(e) => setPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.monthlyLabel}</span>
              <input type="number" value={monthly} min={0} step={100}
                onChange={(e) => setMonthly(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rateLabel}</span>
              <input type="number" value={rate} step={0.5}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={0} max={60} step={1}
                onChange={(e) => setYears(Math.max(0, Math.min(60, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {!valid && <p className="text-xs text-red-500 mb-4">{L.invalid}</p>}

          {res && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.fvLabel}</div>
                <div className="text-4xl font-bold text-indigo-600 mb-1">
                  {fmt(res.fv.fv)}
                </div>
                <div className="text-xs text-slate-500">
                  {L.contributed}: {fmt(res.fv.contributed)} · {L.interest}:{" "}
                  <span className="text-green-600 font-semibold">{fmt(res.fv.interest)}</span>
                </div>
                <div className="mt-4">
                  <GrowthSparkline data={res.sched} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.lumpLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmt(res.cmp.lump.fv)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.dcaLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmt(res.cmp.dca.fv)}</div>
                </div>
              </div>
              <p className="text-sm text-slate-500 text-center mb-6">
                {L.edgeNote(res.cmp.edge, res.cmp.edgePct)}
              </p>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-6">
                <div className="text-xs text-slate-400 mb-2">{L.rule72Title}</div>
                <p className="text-sm text-slate-600">
                  {Number.isFinite(res.dbl.rule72)
                    ? L.rule72(res.dbl.rule72, res.dbl.exact, rate)
                    : L.rule72None}
                </p>
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/montecarlo" className="text-indigo-500 hover:underline">→ {L.linkMonteCarlo}</Link>
                {" · "}
                <Link href="/learning" className="text-indigo-500 hover:underline">→ {L.linkLearning}</Link>
                {" · "}
                <Link href="/drawdown" className="text-indigo-500 hover:underline">→ {L.linkDrawdown}</Link>
              </p>
            </>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "复利投资规划器",
  subtitle: "本金 + 每月定投，按月复利算终值与利息贡献；对比 DCA 与一次性投入，附 72 法则。",
  howToTitle: "如何使用复利投资规划器",
  howTo: [
    "输入初始本金与每月定投金额。",
    "设定年化收益率%与持有期数（月/年）。",
    "计算器按月复利算终值与利息贡献。",
    "对比 DCA 与一次性投入，并用 72 法则估算翻倍年限。",
  ],
  principalLabel: "一次性本金",
  monthlyLabel: "每月定投",
  rateLabel: "年化收益率 %",
  yearsLabel: "年限",
  invalid: "请输入非负的本金、定投、年限。",
  fvLabel: "预计终值",
  contributed: "累计投入",
  interest: "其中利息",
  lumpLabel: "一次性投入",
  dcaLabel: "每月定投",
  edgeNote: (edge, edgePct) =>
    edge > 0
      ? `相同总投入下，一次性比 DCA 多赚 ${fmt(edge)}（${(edgePct * 100).toFixed(1)}%）——钱更早复利。`
      : `零收益时两者终值相同。`,
  rule72Title: "72 法则",
  rule72: (r72, exact, rate) =>
    `${rate}% 年化约 ${r72.toFixed(1)} 年翻倍（精确 ${exact.toFixed(1)} 年）。`,
  rule72None: "收益 ≤ 0 时本金不会翻倍。",
  disclaimer: "假设恒定年化收益、每月等额复利、忽略通胀与税费；真实结果受波动影响，不构成投资建议。",
  linkMonteCarlo: "蒙特卡洛",
  linkLearning: "学习路径",
  linkDrawdown: "回撤恢复",
};
const en = {
  title: "Compound Growth Planner",
  subtitle: "One-time principal + monthly contributions, compounded monthly: future value, interest earned, DCA vs lump sum, plus the rule of 72.",
  howToTitle: "How to use the compound growth planner",
  howTo: [
    "Enter the initial principal and the monthly contribution.",
    "Set the annual return % and the holding period.",
    "The calculator compounds monthly to get future value and interest earned.",
    "Compare DCA vs lump sum, and use the rule of 72 to estimate years to double.",
  ],
  principalLabel: "One-time principal",
  monthlyLabel: "Monthly contribution",
  rateLabel: "Annual return %",
  yearsLabel: "Years",
  invalid: "Please enter non-negative principal, contribution and years.",
  fvLabel: "Estimated future value",
  contributed: "Contributed",
  interest: "Interest",
  lumpLabel: "Lump sum",
  dcaLabel: "DCA (monthly)",
  edgeNote: (edge, edgePct) =>
    edge > 0
      ? `For the same total, lump sum beats DCA by ${fmt(edge)} (${(edgePct * 100).toFixed(1)}%) — money compounds earlier.`
      : `With zero return, both end equal.`,
  rule72Title: "Rule of 72",
  rule72: (r72, exact, rate) =>
    `At ${rate}% per year, it doubles in ~${r72.toFixed(1)} years (exact ${exact.toFixed(1)}).`,
  rule72None: "At return ≤ 0, the principal never doubles.",
  disclaimer: "Assumes a constant annual return, equal monthly compounding, and ignores inflation and taxes. Real results vary. Not investment advice.",
  linkMonteCarlo: "Monte Carlo",
  linkLearning: "Learning path",
  linkDrawdown: "Drawdown recovery",
};

