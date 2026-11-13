"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import Link from "next/link";
import {
  harvestSummary, HARVEST_PRESETS,
} from "../lib/taxLoss";

export const metadata = {
  title: "税务亏损收割计算器 — Weacond",
  description: "当年税收节省=min(亏损,抵免上限)×税率，超限结转。教育性参考，非税务建议。",
  robots: { index: true, follow: true },
};

function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}

export default function TaxLossPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [loss, setLoss] = useState(10000);
  const [taxRate, setTaxRate] = useState(30); // 百分比
  const [cap, setCap] = useState(3000); // 抵免上限（0=无限）

  const res = useMemo(
    () => harvestSummary({ loss, taxRate: taxRate / 100, cap }),
    [loss, taxRate, cap],
  );

  const applyPreset = (p) => {
    setLoss(p.loss);
    setTaxRate(p.taxRate * 100);
    setCap(p.cap);
  };

  const band = res.band;
  const bandColor =
    band === "high" ? "text-emerald-700" :
    band === "moderate" ? "text-emerald-600" :
    band === "low" ? "text-amber-600" :
    band === "none" ? "text-slate-400" : "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="tax-loss" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(HARVEST_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.lossLabel}</span>
              <input type="number" value={loss} min={0} step={100}
                onChange={(e) => setLoss(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.capLabel}</span>
              <input type="number" value={cap} min={0} step={100}
                onChange={(e) => setCap(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-slate-500">{L.taxRateLabel}</span>
              <input type="number" value={taxRate} min={0} max={100} step={1}
                onChange={(e) => setTaxRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.savingsLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtMoney(res.taxSavings)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.afterTaxLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.afterTaxCost)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.carryLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{res.carryforwardYears} {L.yearUnit}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.offsetLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.effectiveOffset)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.lossLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(res.loss)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/xirr" className="text-indigo-500 hover:underline">→ {L.linkXirr}</Link>
            {" · "}
            <Link href="/compound" className="text-indigo-500 hover:underline">→ {L.linkCompound}</Link>
            {" · "}
            <Link href="/real-return" className="text-indigo-500 hover:underline">→ {L.linkRealReturn}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "税务亏损收割计算器",
  subtitle: "当年税收节省 = min(亏损, 抵免上限) × 税率，超限结转。教育性参考。",
  lossLabel: "实现亏损",
  capLabel: "抵免上限（0=无限）",
  taxRateLabel: "税率 %",
  savingsLabel: "当年税收节省",
  afterTaxLabel: "税后净成本",
  carryLabel: "结转年数",
  yearUnit: "年",
  offsetLabel: "当年可抵免",
  invalid: "亏损须 >0。",
  disclaimer: "简化模型，未计资本利得税级距与地域差异，非税务建议。",
  linkXirr: "XIRR",
  linkCompound: "复利",
  linkRealReturn: "实际回报",
  bandLabels: { none: "无节省", low: "偏低 <15%", moderate: "中等 15–30%", high: "较高 ≥30%", na: "无数据" },
  presetLabels: { smallLoss: "小额亏损", capped: "受限抵免", unlimited: "无限抵免", noTax: "免税", bigCapped: "大额受限" },
};
const en = {
  title: "Tax-Loss Harvesting",
  subtitle: "Year-1 tax saving = min(loss, offset cap) × rate; excess carried forward. Educational.",
  lossLabel: "Realized loss",
  capLabel: "Offset cap (0 = unlimited)",
  taxRateLabel: "Tax rate %",
  savingsLabel: "Year-1 tax saving",
  afterTaxLabel: "After-tax cost",
  carryLabel: "Carryforward years",
  yearUnit: "yr",
  offsetLabel: "Deductible this year",
  invalid: "Loss must be > 0.",
  disclaimer: "Simplified model; ignores capital-gains brackets and jurisdiction. Not tax advice.",
  linkXirr: "XIRR",
  linkCompound: "Compound",
  linkRealReturn: "Real Return",
  bandLabels: { none: "None", low: "Low <15%", moderate: "Moderate 15–30%", high: "High ≥30%", na: "No data" },
  presetLabels: { smallLoss: "Small loss", capped: "Capped", unlimited: "Unlimited", noTax: "No tax", bigCapped: "Large capped" },
};
