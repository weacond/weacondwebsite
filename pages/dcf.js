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
import {
  dcfSummary,
  dcfThreeScenarios,
  DCF_PRESETS,
} from "../lib/dcf";

export const metadata = {
  title: "DCF 估值（WACC 折现 + 终值）— Weacond",
  description: "WACC 折现自由现金流 + 戈登永续终值：内在价值、每股价、上行空间与三情景。教育性参考。",
  robots: { index: true, follow: true },
};

export default function DcfPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [fcf0, setFcf0] = useState(100e6);
  const [growth, setGrowth] = useState(10);
  const [years, setYears] = useState(10);
  const [terminalGrowth, setTerminalGrowth] = useState(3);
  const [wacc, setWacc] = useState(10);
  const [shares, setShares] = useState(100e6);
  const [price, setPrice] = useState(15);

  const args = useMemo(
    () => ({
      fcf0,
      growth: growth / 100,
      years,
      terminalGrowth: terminalGrowth / 100,
      wacc: wacc / 100,
      shares,
      price,
    }),
    [fcf0, growth, years, terminalGrowth, wacc, shares, price],
  );

  const res = useMemo(() => dcfSummary(args), [args]);
  const scen = useMemo(() => dcfThreeScenarios(args), [args]);

  const applyPreset = (p) => {
    setFcf0(p.fcf0);
    setGrowth((p.growth || 0) * 100);
    setYears(p.years);
    setTerminalGrowth((p.terminalGrowth || 0) * 100);
    setWacc(p.wacc * 100);
    setShares(p.shares || 0);
    setPrice(p.price || 0);
  };

  const band = res.band;
  const bandColor =
    band === "deepValue" ? "text-emerald-600" :
    band === "undervalued" ? "text-indigo-600" :
    band === "fair" ? "text-slate-600" :
    band === "overvalued" ? "text-red-600" : "text-slate-400";

  const money = (n) => (n === null || !Number.isFinite(n) ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }));
  const pct = (n) => (n === null || !Number.isFinite(n) ? "—" : `${Number(n).toFixed(1)}%`);
  const inputCls = "w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="dcf" />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/dcf"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "DCF Valuation", href: "/dcf" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(DCF_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels[p.id] ?? p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <label className="text-sm font-medium text-slate-600">{L.fcf0Label}
              <input type="number" className={inputCls} value={fcf0} onChange={(e) => setFcf0(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.growthLabel}
              <input type="number" className={inputCls} value={growth} onChange={(e) => setGrowth(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.yearsLabel}
              <input type="number" className={inputCls} value={years} onChange={(e) => setYears(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.terminalGrowthLabel}
              <input type="number" className={inputCls} value={terminalGrowth} onChange={(e) => setTerminalGrowth(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.waccLabel}
              <input type="number" className={inputCls} value={wacc} onChange={(e) => setWacc(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.sharesLabel}
              <input type="number" className={inputCls} value={shares} onChange={(e) => setShares(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.priceLabel}
              <input type="number" className={inputCls} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>
          </div>

          {!res.valid && <p className="mt-3 text-xs text-amber-600">{L.invalid}</p>}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">{L.intrinsicLabel}</div>
              <div className="text-lg font-bold">{money(res.intrinsicValue)}</div>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">{L.perShareLabel}</div>
              <div className="text-lg font-bold">{res.perShare === null ? "—" : Number(res.perShare).toFixed(2)}</div>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">{L.pvExplicitLabel}</div>
              <div className="text-lg font-bold">{money(res.pvExplicit)}</div>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">{L.tvShareLabel}</div>
              <div className="text-lg font-bold">{pct(res.tvShare * 100)}</div>
            </div>
            <div className={`col-span-2 text-center ${bandColor} font-bold`}>{L.upsideLabel}: {pct(res.upside * 100)} · {L.bandLabels[band]}</div>
          </div>

          <div className="mt-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500 mb-2">{L.scenariosLabel}</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-emerald-600">{L.optimistLabel}</div>
                <div className="font-mono text-sm">{money(scen.optimist.intrinsicValue)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">{L.baseLabel}</div>
                <div className="font-mono text-sm">{money(scen.base.intrinsicValue)}</div>
              </div>
              <div>
                <div className="text-xs text-red-600">{L.pessimistLabel}</div>
                <div className="font-mono text-sm">{money(scen.pessimist.intrinsicValue)}</div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            <Link href="/npv" className="text-indigo-500 hover:underline">→ {L.linkNpv}</Link>
            {" · "}
            <Link href="/fire" className="text-indigo-500 hover:underline">→ {L.linkFire}</Link>
            {" · "}
            <Link href="/twrr" className="text-indigo-500 hover:underline">→ {L.linkTwrr}</Link>
          </p>
          <p className="mt-3 text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "DCF 估值（WACC 折现 + 终值）",
  subtitle: "WACC 折现自由现金流 + 戈登永续终值：内在价值、每股价、上行空间与三情景。教育性参考。",
  fcf0Label: "基年自由现金流",
  growthLabel: "显性期增速 %",
  yearsLabel: "显性期年数",
  terminalGrowthLabel: "永续增速 %",
  waccLabel: "折现率 WACC %",
  sharesLabel: "总股本（每股）",
  priceLabel: "现价（上行）",
  bandLabels: { deepValue: "深度低估", undervalued: "低估", fair: "合理", overvalued: "高估", na: "无法计算" },
  intrinsicLabel: "内在价值",
  perShareLabel: "每股价值",
  pvExplicitLabel: "显性期现值",
  tvShareLabel: "终值占比",
  upsideLabel: "上行空间",
  scenariosLabel: "三情景（增速/终值/WACC 扰动）",
  optimistLabel: "乐观",
  baseLabel: "基准",
  pessimistLabel: "悲观",
  invalid: "基年现金流须 >0，折现率须 >0，且需至少一期现金流。",
  disclaimer: "简化模型：几何增速 + 戈登终值，忽略多阶段增长与资本结构变化。终值占比高时对假设敏感，非投资建议。",
  linkNpv: "净现值 NPV",
  linkFire: "FIRE 财务自由",
  linkTwrr: "时间加权收益",
  howToTitle: "如何使用 DCF 估值计算器",
  howTo: [
    "输入基年自由现金流 FCF0、显性期增速与年数，及永续增速 g 与折现率 WACC。",
    "永续增速 g 必须小于 WACC，否则终值发散（显示「无法计算」）。",
    "读取内在价值 = 显性期现值 + 终值现值，以及终值占比。",
    "填入总股本与现价，得到每股价值与相对现价的行空间。",
  ],
  presetLabels: { growth: "成长股", stable: "稳健价值", distressed: "困境下行" },
};

const en = {
  title: "DCF Valuation (WACC + Terminal Value)",
  subtitle: "WACC-discounted FCFs + Gordon terminal value: intrinsic, per-share, upside & 3 scenarios. For education.",
  fcf0Label: "Base-year FCF",
  growthLabel: "Explicit growth %",
  yearsLabel: "Explicit years",
  terminalGrowthLabel: "Terminal growth %",
  waccLabel: "Discount rate WACC %",
  sharesLabel: "Shares (per-share)",
  priceLabel: "Price (upside)",
  bandLabels: { deepValue: "Deep Value", undervalued: "Undervalued", fair: "Fair", overvalued: "Overvalued", na: "N/A" },
  intrinsicLabel: "Intrinsic Value",
  perShareLabel: "Per-Share Value",
  pvExplicitLabel: "Explicit-PV",
  tvShareLabel: "Terminal-Value Share",
  upsideLabel: "Upside",
  scenariosLabel: "3 scenarios (growth/terminal/WACC perturbation)",
  optimistLabel: "Optimist",
  baseLabel: "Base",
  pessimistLabel: "Pessimist",
  invalid: "Base FCF must be > 0, discount rate > 0, and at least one period of cash flow.",
  disclaimer: "Simplified model: geometric growth + Gordon terminal value; ignores multi-stage growth & capital-structure changes. High terminal-value share is assumption-sensitive. Not investment advice.",
  linkNpv: "Net Present Value",
  linkFire: "FIRE / Financial Freedom",
  linkTwrr: "Time-Weighted Return",
  howToTitle: "How to use the DCF valuation calculator",
  howTo: [
    "Enter base-year free cash flow (FCF0), explicit-period growth & years, terminal growth g, and discount rate WACC.",
    "Terminal growth g must stay below WACC, or the terminal value diverges (shown as 'N/A').",
    "Read intrinsic value = explicit-period PV + terminal-value PV, plus the terminal-value share.",
    "Enter total shares and price to get per-share value and upside vs the market price.",
  ],
  presetLabels: { growth: "Growth Co", stable: "Stable Value", distressed: "Distressed" },
};