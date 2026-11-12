"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  ytmSummary, YTM_PRESETS,
} from "../lib/ytm";

export const metadata = {
  title: "到期收益率 YTM 计算器 — Weacond",
  description: "YTM=使债券价格=面值的折现率（二分法求解，年付息）。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};

export default function YtmPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [couponRate, setCouponRate] = useState(5); // 百分比
  const [price, setPrice] = useState(100);
  const [years, setYears] = useState(10);

  const res = useMemo(
    () => ytmSummary({ face: 100, couponRate: couponRate / 100, price, years }),
    [couponRate, price, years],
  );

  const applyPreset = (p) => {
    setCouponRate(p.couponRate * 100);
    setPrice(p.price);
    setYears(p.years);
  };

  const band = res.band;
  const ytmColor =
    band === "high" ? "text-emerald-600" :
    band === "moderate" ? "text-amber-600" :
    band === "low" ? "text-slate-500" :
    "text-rose-600";

  // 价格 vs 面值 → 平价/溢价/折价。
  const priceBand = res.valid ? (price > 100 ? L.premium : price < 100 ? L.discount : L.par) : "";

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
            {Object.values(YTM_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.couponLabel}</span>
              <input type="number" value={couponRate} min={0} max={30} step={0.5}
                onChange={(e) => setCouponRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.priceLabel}</span>
              <input type="number" value={price} min={0} step={1}
                onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.yearsLabel}</span>
              <input type="number" value={years} min={1} step={1}
                onChange={(e) => setYears(Math.max(1, Math.floor(parseFloat(e.target.value) || 1)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-sm text-slate-500">{L.ytm}</span>
              <span className={`text-4xl font-bold font-mono ${ytmColor}`}>
                {res.valid && res.ytm != null ? `${(res.ytm * 100).toFixed(2)}%` : L.na}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">{L.couponLabel}</div>
                <div className="text-lg font-mono">{res.valid ? `${couponRate.toFixed(1)}%` : L.na}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">{L.priceBandLabel}</div>
                <div className="text-lg font-mono">{res.valid ? priceBand : L.na}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">{L.yearsLabel}</div>
                <div className="text-lg font-mono">{res.valid ? `${years}` : L.na}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">{L.faceLabel}</div>
                <div className="text-lg font-mono">100</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/bond" className="text-xs text-indigo-500 hover:underline">
                → /bond {L.bond}
              </Link>
              <Link href="/fair-value" className="text-xs text-indigo-500 hover:underline">
                → /fair-value {L.fairValue}
              </Link>
              <Link href="/real-return" className="text-xs text-indigo-500 hover:underline">
                → /real-return {L.realReturn}
              </Link>
            </div>
          </div>

          <p className="text-xs text-slate-400">{L.note}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "到期收益率 YTM",
  subtitle: "YTM=使债券价格=面值的折现率（二分法求解，年付息）。教育性参考。",
  couponLabel: "票息率",
  priceLabel: "价格",
  yearsLabel: "年期",
  faceLabel: "面值",
  ytm: "到期收益率",
  priceBandLabel: "价格状态",
  par: "平价", premium: "溢价", discount: "折价",
  bond: "债券价格/久期",
  fairValue: "公允价值",
  realReturn: "实际收益率",
  note: "YTM 为债券持有至到期、且票息再投资收益率=YTM 时的内部收益率。教育性参考，非投资建议。",
  na: "—",
  presetLabels: { low: "低收益", par: "平价", premium: "溢价", discount: "折价", highYield: "高收益" },
};

const en = {
  title: "Yield to Maturity",
  subtitle: "YTM is the discount rate that makes bond price = face value (bisection, annual coupons). Educational reference.",
  couponLabel: "Coupon rate",
  priceLabel: "Price",
  yearsLabel: "Years",
  faceLabel: "Face",
  ytm: "Yield to Maturity",
  priceBandLabel: "Price status",
  par: "Par", premium: "Premium", discount: "Discount",
  bond: "Bond price / duration",
  fairValue: "Fair value",
  realReturn: "Real return",
  note: "YTM is the internal rate of return holding to maturity with coupon reinvested at the YTM. Educational reference, not investment advice.",
  na: "—",
  presetLabels: { low: "Low yield", par: "Par", premium: "Premium", discount: "Discount", highYield: "High yield" },
};
