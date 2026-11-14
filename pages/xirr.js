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
import { irr, annualize, validCashflows, cashflowInsight } from "../lib/xirr";

export const metadata = {
  title: "IRR / XIRR 计算器 — Weacond",
  description: "输入现金流序列，反解内部收益率 IRR 与年化回报。真实不规则现金流的标准口径。教育性参考。",
  robots: { index: true, follow: true },
};

// 预设：负=投入，正=回收
const PRESETS = [
  { id: "single", label: "单笔回收", values: [-1000, 0, 0, 1331, 0, 0] },
  { id: "annuity", label: "年金回收", values: [-1000, 300, 300, 300, 300, 0] },
  { id: "dca", label: "定投", values: [-100, -100, -100, -100, 1000, 0] },
];

export default function XirrPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [cf, setCf] = useState([-1000, 0, 0, 1331, 0, 0]);

  const valid = validCashflows(cf);
  const info = useMemo(() => {
    if (!validCashflows(cf)) return null;
    return cashflowInsight(cf);
  }, [cf]);

  const applyPreset = (p) => setCf([...p.values]);
  const setCell = (i, v) => {
    setCf((prev) => prev.map((x, j) => (j === i ? v : x)));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="xirr" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/xirr"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "IRR / XIRR", href: "/xirr" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
            <div className="text-xs text-slate-400 mb-3">{L.cfTitle}</div>
            <div className="grid grid-cols-3 gap-2">
              {cf.map((v, i) => (
                <label key={i} className="block">
                  <span className="text-xs text-slate-400">{L.period(i)}</span>
                  <input type="number" value={v}
                    onChange={(e) => setCell(i, parseFloat(e.target.value) || 0)}
                    className={`w-full mt-1 px-2 py-2 rounded-lg border text-sm font-mono ${v < 0 ? "border-red-200 text-red-600" : "border-slate-200"}`} />
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">{L.cfNote}</p>
          </div>
          {!valid && <p className="text-xs text-red-500 mb-4">{L.invalid}</p>}

          {info && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 text-center">
              <div className="text-xs text-slate-400 mb-1">{L.irrLabel}</div>
              <div className={`text-4xl font-bold mb-1 ${info.irr >= 0 ? "text-green-600" : "text-red-600"}`}>
                {(info.irr * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-slate-500 mb-4">
                {L.annualLabel}:{" "}
                <span className="font-semibold">{info.annual != null ? (info.annual * 100).toFixed(1) + "%" : "—"}</span>
              </div>
              <p className="text-sm text-slate-500">{info.note}</p>
            </div>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/compound" className="text-indigo-500 hover:underline">→ {L.linkCompound}</Link>
            {" · "}
            <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
            {" · "}
            <Link href="/performance" className="text-indigo-500 hover:underline">→ {L.linkPerformance}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "IRR / XIRR 计算器",
  subtitle: "输入现金流序列，反解内部收益率 IRR 与年化回报——真实不规则现金流的标准口径。",
  howToTitle: "如何使用 IRR / XIRR 计算器",
  howTo: [
    "输入现金流序列（负号表示净流出，如初始 −100、后续 +120）。",
    "计算器反解内部收益率 IRR。",
    "查看年化回报，评估不规则现金流的真实收益。",
  ],
  cfTitle: "现金流序列（负=投入，正=回收）",
  cfNote: "第 0 期通常为初始投入；后续为正代表回收。至少需一项负、一项正。",
  invalid: "请至少填写一项投入(负)与一项回收(正)。",
  irrLabel: "内部收益率 IRR（每期）",
  annualLabel: "年化",
  disclaimer: "假设等间隔现金流、确定性折现；不处理日计数与多解情形，不构成投资建议。",
  linkCompound: "复利规划",
  linkRisk: "风险仪表盘",
  linkPerformance: "业绩复盘",
  period: (i) => `第 ${i} 期`,
  presetLabels: { single: "单笔回收", annuity: "年金回收", dca: "定投" },
};
const en = {
  title: "IRR / XIRR Calculator",
  subtitle: "Enter a cashflow series and solve the internal rate of return IRR and annualized return — the standard measure for irregular cashflows.",
  howToTitle: "How to use the IRR / XIRR calculator",
  howTo: [
    "Enter a cashflow series (a negative sign means net outflow, e.g. −100 initially, +120 later).",
    "The calculator solves the internal rate of return IRR.",
    "Read the annualized return to assess the real yield of irregular cashflows.",
  ],
  cfTitle: "Cashflow series (negative = outflow, positive = inflow)",
  cfNote: "Period 0 is usually the initial outflow; later positives are inflows. Needs at least one negative and one positive.",
  invalid: "Enter at least one outflow (negative) and one inflow (positive).",
  irrLabel: "Internal rate of return IRR (per period)",
  annualLabel: "Annualized",
  disclaimer: "Assumes equal-spaced, deterministic discounting; no day-count or multiple roots. Not investment advice.",
  linkCompound: "Compound",
  linkRisk: "Risk dashboard",
  linkPerformance: "Performance",
  period: (i) => `Period ${i}`,
  presetLabels: { single: "Single", annuity: "Annuity", dca: "DCA" },
};

