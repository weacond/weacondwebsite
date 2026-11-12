"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  fairValueSummary, FAIRVALUE_PRESETS,
} from "../lib/fairValue";

export const metadata = {
  title: "公允价值（Fair Value）计算器 — Weacond",
  description: "P/E 回归 + 戈登增长(DDM) + 格雷厄姆安全边际。教育性参考，不构成投资建议。",
  robots: { index: true, follow: true },
};

function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return Math.round(x).toLocaleString();
}

export default function FairValuePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [price, setPrice] = useState(60);
  const [eps, setEps] = useState(5);
  const [targetPE, setTargetPE] = useState(15);
  const [d0, setD0] = useState(2);
  const [g, setG] = useState(3); // 百分比
  const [r, setR] = useState(8); // 百分比

  const res = useMemo(
    () => fairValueSummary({ price, eps, targetPE, d0, g: g / 100, r: r / 100 }),
    [price, eps, targetPE, d0, g, r],
  );

  const applyPreset = (p) => {
    setPrice(p.price);
    setEps(p.eps);
    setTargetPE(p.targetPE);
    setD0(p.d0);
    setG(p.g * 100);
    setR(p.r * 100);
  };

  const band = res.band;
  const bandColor =
    band === "deep" ? "text-emerald-700" :
    band === "cheap" ? "text-emerald-600" :
    band === "fair" ? "text-amber-600" :
    band === "overvalued" ? "text-red-600" : "text-slate-400";

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
            {Object.values(FAIRVALUE_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.priceLabel}</span>
              <input type="number" value={price} min={0} step={1}
                onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.epsLabel}</span>
              <input type="number" value={eps} step={0.1}
                onChange={(e) => setEps(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.targetPELabel}</span>
              <input type="number" value={targetPE} min={0} step={1}
                onChange={(e) => setTargetPE(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.d0Label}</span>
              <input type="number" value={d0} min={0} step={0.1}
                onChange={(e) => setD0(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.gLabel}</span>
              <input type="number" value={g} min={0} max={40} step={0.5}
                onChange={(e) => setG(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rLabel}</span>
              <input type="number" value={r} min={0} max={40} step={0.5}
                onChange={(e) => setR(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.fvLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtMoney(res.fairValue)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.mosLabel}</div>
                  <div className={`text-xl font-bold ${res.marginOfSafety < 0 ? "text-red-600" : "text-emerald-600"}`}>{(res.marginOfSafety * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.upsideLabel}</div>
                  <div className={`text-xl font-bold ${res.upside < 0 ? "text-red-600" : "text-emerald-600"}`}>{(res.upside * 100).toFixed(1)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.ddmLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{fmtMoney(res.ddmFairValue)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.priceLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtMoney(price)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/options" className="text-indigo-500 hover:underline">→ {L.linkOptions}</Link>
            {" · "}
            <Link href="/macro" className="text-indigo-500 hover:underline">→ {L.linkMacro}</Link>
            {" · "}
            <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "公允价值（Fair Value）计算器",
  subtitle: "P/E 回归 + 戈登增长（DDM）+ 格雷厄姆安全边际。教育性参考。",
  priceLabel: "当前价格",
  epsLabel: "每股收益 EPS",
  targetPELabel: "目标 P/E",
  d0Label: "股利 D₀",
  gLabel: "增长率 g %",
  rLabel: "要求回报率 r %",
  fvLabel: "公允价值（P/E 回归）",
  mosLabel: "安全边际",
  upsideLabel: "上涨空间",
  ddmLabel: "DDM 公允价值",
  invalid: "价格须 >0，且 EPS×目标 P/E >0。",
  disclaimer: "估值为简化模型，未计现金流/折现细节，不构成投资建议。",
  linkOptions: "期权",
  linkMacro: "宏观",
  linkRisk: "风险度量",
  bandLabels: { deep: "深度价值 ≥50%", cheap: "低估 30–50%", fair: "合理 0–30%", overvalued: "高估 <0%", na: "无数据" },
  presetLabels: { deepValue: "深度价值", fair: "合理", overvalued: "高估", growth: "成长" },
};
const en = {
  title: "Fair Value Calculator",
  subtitle: "P/E reversion + Gordon growth (DDM) + Graham margin of safety. Educational reference.",
  priceLabel: "Current price",
  epsLabel: "Earnings EPS",
  targetPELabel: "Target P/E",
  d0Label: "Dividend D₀",
  gLabel: "Growth g %",
  rLabel: "Required return r %",
  fvLabel: "Fair value (P/E reversion)",
  mosLabel: "Margin of safety",
  upsideLabel: "Upside",
  ddmLabel: "DDM fair value",
  invalid: "Price must be > 0 and EPS × target P/E > 0.",
  disclaimer: "Simplified model; excludes detailed cash-flow/discounting. Not investment advice.",
  linkOptions: "Options",
  linkMacro: "Macro",
  linkRisk: "Risk metrics",
  bandLabels: { deep: "Deep value ≥50%", cheap: "Undervalued 30–50%", fair: "Fair 0–30%", overvalued: "Overvalued <0%", na: "No data" },
  presetLabels: { deepValue: "Deep value", fair: "Fair", overvalued: "Overvalued", growth: "Growth" },
};
