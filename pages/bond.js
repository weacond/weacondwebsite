"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  bondSummary, BOND_PRESETS,
} from "../lib/bond";

export const metadata = {
  title: "债券价格 / 久期计算器 — Weacond",
  description: "平价/溢价/折价、当前收益率、麦凯与修正久期（年付息）。教育性参考。",
  robots: { index: true, follow: true },
};

export default function BondPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [couponRate, setCouponRate] = useState(5); // 百分比
  const [years, setYears] = useState(5);
  const [yieldRate, setYieldRate] = useState(5); // 百分比

  const res = useMemo(
    () => bondSummary({ face: 100, couponRate: couponRate / 100, years, yieldRate: yieldRate / 100 }),
    [couponRate, years, yieldRate],
  );

  const applyPreset = (p) => {
    setCouponRate(p.couponRate * 100);
    setYears(p.years);
    setYieldRate(p.yieldRate * 100);
  };

  const band = res.band;
  const bandColor =
    band === "premium" ? "text-amber-600" :
    band === "discount" ? "text-emerald-600" :
    band === "par" ? "text-indigo-600" : "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(BOND_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.couponLabel}</span>
              <input type="number" value={couponRate} min={0} max={30} step={0.1}
                onChange={(e) => setCouponRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={1} max={50} step={1}
                onChange={(e) => setYears(Math.max(1, Math.floor(parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yieldLabel}</span>
              <input type="number" value={yieldRate} min={-1} max={30} step={0.1}
                onChange={(e) => setYieldRate(Math.max(-1, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.priceLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{res.price.toFixed(2)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.cyLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{(res.currentYield * 100).toFixed(2)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.macLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{res.macaulayDuration.toFixed(2)} {L.yearUnit}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.modLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.modifiedDuration.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.couponLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{couponRate.toFixed(1)}%</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/real-return" className="text-indigo-500 hover:underline">→ {L.linkRealReturn}</Link>
            {" · "}
            <Link href="/compound" className="text-indigo-500 hover:underline">→ {L.linkCompound}</Link>
            {" · "}
            <Link href="/fair-value" className="text-indigo-500 hover:underline">→ {L.linkFairValue}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "债券价格 / 久期",
  subtitle: "平价/溢价/折价、当前收益率、麦凯与修正久期（年付息，面值 100）。教育性参考。",
  couponLabel: "票面利率 %",
  yearsLabel: "到期年数",
  yieldLabel: "到期收益率 %",
  priceLabel: "债券价格",
  cyLabel: "当前收益率",
  macLabel: "麦凯久期",
  modLabel: "修正久期",
  yearUnit: "年",
  invalid: "年数须 ≥1，收益率 >−1。",
  disclaimer: "按年付息、面值 100 的简化模型，忽略付息频率与信用利差，非投资建议。",
  linkRealReturn: "实际回报",
  linkCompound: "复利",
  linkFairValue: "公允价值",
  bandLabels: { premium: "溢价", discount: "折价", par: "平价", na: "无数据" },
  presetLabels: { par: "平价 5%", premium: "溢价 8%", discount: "折价 3%", zero: "零息 10Y", longTerm: "长久期 20Y" },
};
const en = {
  title: "Bond Price / Duration",
  subtitle: "Premium/discount/par, current yield, Macaulay & modified duration (annual coupons, face 100).",
  couponLabel: "Coupon %",
  yearsLabel: "Years to maturity",
  yieldLabel: "Yield %",
  priceLabel: "Bond price",
  cyLabel: "Current yield",
  macLabel: "Macaulay duration",
  modLabel: "Modified duration",
  yearUnit: "yr",
  invalid: "Years must be ≥ 1, yield > −1.",
  disclaimer: "Simplified annual-coupon model, face 100; ignores frequency and credit spread. Not investment advice.",
  linkRealReturn: "Real Return",
  linkCompound: "Compound",
  linkFairValue: "Fair Value",
  bandLabels: { premium: "Premium", discount: "Discount", par: "Par", na: "No data" },
  presetLabels: { par: "Par 5%", premium: "Premium 8%", discount: "Discount 3%", zero: "Zero 10Y", longTerm: "Long 20Y" },
};

