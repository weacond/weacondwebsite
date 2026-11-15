"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CrossLinks from "../components/CrossLinks";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import Link from "next/link";
import {
  dcaVsLump,
  dcaMonteCarlo,
  dcaBand,
  DCA_PRESETS,
} from "../lib/dca";

export const metadata = {
  title: "定投 vs 一次性（DCA vs Lump Sum）— Weacond",
  description: "同样一笔钱，按月定投还是 t0 一次性投入？终值对比、优势分级与确定性蒙特卡洛胜率。教育性参考。",
  robots: { index: true, follow: true },
};

export default function DcaPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [monthly, setMonthly] = useState(1000);
  const [annualRate, setAnnualRate] = useState(8); // 百分比
  const [years, setYears] = useState(10);
  const [annualVol, setAnnualVol] = useState(15); // 百分比
  const [lump, setLump] = useState(0); // 0 = 同等总投入

  const args = useMemo(
    () => ({
      monthly,
      annualRate: annualRate / 100,
      years,
      lump,
    }),
    [monthly, annualRate, years, lump],
  );

  const res = useMemo(() => dcaVsLump(args), [args]);
  const mc = useMemo(
    () => dcaMonteCarlo({ monthly, annualRate: annualRate / 100, annualVol: annualVol / 100, years, seed: 12345, paths: 4000 }),
    [monthly, annualRate, annualVol, years],
  );

  const applyPreset = (p) => {
    setMonthly(p.monthly);
    setAnnualRate((p.annualRate || 0) * 100);
    setYears(p.years);
    setAnnualVol((p.annualVol || 0) * 100);
    setLump(0);
  };

  const band = dcaBand(res.winner);
  const bandColor =
    band === "lumpFavored" ? "text-indigo-600" :
    band === "dcaFavored" ? "text-amber-600" : "text-slate-400";

  const money = (n) => (n === null || !Number.isFinite(n) ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }));
  const pct = (n) => (n === null || !Number.isFinite(n) ? "—" : `${Number(n).toFixed(1)}%`);
  const inputCls = "w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="dca" />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/dca"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "DCA vs Lump Sum", href: "/dca" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(DCA_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels[p.id] ?? p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <label className="text-sm font-medium text-slate-600">{L.monthlyLabel}
              <input type="number" className={inputCls} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.annualRateLabel}
              <input type="number" className={inputCls} value={annualRate} onChange={(e) => setAnnualRate(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.yearsLabel}
              <input type="number" className={inputCls} value={years} onChange={(e) => setYears(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.annualVolLabel}
              <input type="number" className={inputCls} value={annualVol} onChange={(e) => setAnnualVol(Number(e.target.value))} /></label>
            <label className="text-sm font-medium text-slate-600">{L.lumpLabel}
              <input type="number" className={inputCls} value={lump} onChange={(e) => setLump(Number(e.target.value))} /></label>
          </div>

          {!res.valid && <p className="mt-3 text-xs text-amber-600">{L.invalid}</p>}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">{L.fvDcaLabel}</div>
              <div className="text-lg font-bold">{money(res.fvDca)}</div>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">{L.fvLumpLabel}</div>
              <div className="text-lg font-bold">{money(res.fvLump)}</div>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">{L.totalDcaLabel}</div>
              <div className="text-lg font-bold">{money(res.totalDca)}</div>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">{L.lumpEdgeLabel}</div>
              <div className="text-lg font-bold">{pct(res.lumpEdge * 100)}</div>
            </div>
            <div className={`col-span-2 text-center ${bandColor} font-bold`}>{L.winnerLabel}: {L.bandLabels[band]}</div>
          </div>

          <div className="mt-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500 mb-2">{L.mcLabel}</div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="text-xs text-indigo-600">{L.lumpWinRateLabel}</div>
                <div className="font-mono text-sm">{pct(mc.lumpWinRate * 100)}</div>
              </div>
              <div>
                <div className="text-xs text-amber-600">{L.dcaWinRateLabel}</div>
                <div className="font-mono text-sm">{pct(mc.dcaWinRate * 100)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">{L.expLumpLabel}</div>
                <div className="font-mono text-sm">{money(mc.expectedLumpFv)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">{L.expDcaLabel}</div>
                <div className="font-mono text-sm">{money(mc.expectedDcaFv)}</div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            <Link href="/ear" className="text-indigo-500 hover:underline">→ {L.linkEar}</Link>
            {" · "}
            <Link href="/annuity" className="text-indigo-500 hover:underline">→ {L.linkAnnuity}</Link>
            {" · "}
            <Link href="/fire" className="text-indigo-500 hover:underline">→ {L.linkFire}</Link>
          </p>
          <p className="mt-3 text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
      <CrossLinks slug="dca" />
      <Footer />
    </div>
  );
}

const zh = {
  title: "定投 vs 一次性",
  subtitle: "同样一笔钱，按月定投还是 t0 一次性投入？终值对比、优势分级与确定性蒙特卡洛胜率。教育性参考。",
  monthlyLabel: "每月定投",
  annualRateLabel: "预期年化 %",
  yearsLabel: "年限",
  annualVolLabel: "年化波动 %",
  lumpLabel: "一次性金额（0=等总投入）",
  bandLabels: { lumpFavored: "一次性胜出", dcaFavored: "定投胜出", balanced: "持平" },
  fvDcaLabel: "定投终值",
  fvLumpLabel: "一次性终值",
  totalDcaLabel: "定投总投入",
  lumpEdgeLabel: "一次性优势",
  winnerLabel: "胜者",
  mcLabel: "确定性蒙特卡洛（4000 路径）",
  lumpWinRateLabel: "一次性胜率",
  dcaWinRateLabel: "定投胜率",
  expLumpLabel: "一次性期望终值",
  expDcaLabel: "定投期望终值",
  invalid: "每月定投须 >0，年限须 >0。",
  disclaimer: "正收益时一次性更早投入、期望更优；负收益时定投更稳。蒙特卡洛用固定种子可复现，假设收益正态分布，非投资建议。",
  linkEar: "有效年利率",
  linkAnnuity: "年金现值",
  linkFire: "FIRE 财务自由",
  howToTitle: "如何使用定投 vs 一次性计算器",
  howTo: [
    "输入每月定投金额、预期年化收益与年限。",
    "一次性金额留 0 表示「同等总投入」（= 月投 × 12 × 年）。",
    "读取定投终值 vs 一次性终值，及一次性优势比例与胜者。",
    "填入年化波动，查看确定性蒙特卡洛的一次性/定投胜率。",
  ],
  presetLabels: { stocks10y: "股票 10 年", bonds10y: "债券 10 年", crypto5y: "加密 5 年", shortNeg: "短期负收益" },
};

const en = {
  title: "DCA vs Lump Sum",
  subtitle: "Same money, monthly DCA vs one-time at t0: terminal FV, advantage band & deterministic Monte-Carlo win-rate. For education.",
  monthlyLabel: "Monthly DCA",
  annualRateLabel: "Expected annual %",
  yearsLabel: "Years",
  annualVolLabel: "Annual vol %",
  lumpLabel: "Lump (0 = equal total)",
  bandLabels: { lumpFavored: "Lump wins", dcaFavored: "DCA wins", balanced: "Tie" },
  fvDcaLabel: "DCA Terminal FV",
  fvLumpLabel: "Lump Terminal FV",
  totalDcaLabel: "Total DCA",
  lumpEdgeLabel: "Lump Edge",
  winnerLabel: "Winner",
  mcLabel: "Deterministic Monte Carlo (4000 paths)",
  lumpWinRateLabel: "Lump Win Rate",
  dcaWinRateLabel: "DCA Win Rate",
  expLumpLabel: "Expected Lump FV",
  expDcaLabel: "Expected DCA FV",
  invalid: "Monthly DCA must be > 0 and years > 0.",
  disclaimer: "Positive drift favors lump (earlier money compounds longer); negative favors DCA. Monte Carlo uses a fixed seed (reproducible) with a normal-return assumption. Not investment advice.",
  linkEar: "Effective Annual Rate",
  linkAnnuity: "Annuity",
  linkFire: "FIRE / Financial Freedom",
  howToTitle: "How to use the DCA vs lump-sum calculator",
  howTo: [
    "Enter the monthly DCA amount, expected annual return, and the horizon in years.",
    "Leave lump at 0 to mean 'equal total capital' (= monthly × 12 × years).",
    "Read DCA terminal FV vs lump FV, the lump edge, and the winner.",
    "Enter annual volatility to see the deterministic Monte-Carlo win rates for each.",
  ],
  presetLabels: { stocks10y: "Equity 10y", bonds10y: "Bonds 10y", crypto5y: "Crypto 5y", shortNeg: "Short / Negative" },
};