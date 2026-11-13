"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import Link from "next/link";
import {
  dragSummary, dragBand, VOL_DRAG_PRESETS,
} from "../lib/volDrag";

export const metadata = {
  title: "波动拖累 / 几何 vs 算术收益 — Weacond",
  description: "输入每期收益率，对比算术与几何（复合）收益，量化波动拖累与终值差异。教育性参考。",
  robots: { index: true, follow: true },
};

export default function VolDragPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [returnsStr, setReturnsStr] = useState("0.1, -0.2, 0.15, 0.08, -0.1");
  const [initial, setInitial] = useState(1000);

  const returns = useMemo(
    () => returnsStr.split(/[,\s]+/).map((s) => Number(s)).filter((v) => Number.isFinite(v)),
    [returnsStr],
  );

  const res = useMemo(() => dragSummary(returns, initial), [returnsStr, initial]);
  const band = useMemo(() => dragBand(returns), [returnsStr]);

  const applyPreset = (p) => {
    setReturnsStr(p.returns.join(", "));
    setInitial(p.initial);
  };

  const bandColor =
    band === "high" ? "text-red-600" :
    band === "moderate" ? "text-orange-600" :
    band === "invalid" ? "text-slate-400" : "text-emerald-600";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="vol-drag" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(VOL_DRAG_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block col-span-2">
              <span className="text-xs text-slate-500">{L.returnsLabel}</span>
              <input type="text" value={returnsStr}
                onChange={(e) => setReturnsStr(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.initialLabel}</span>
              <input type="number" value={initial} min={0} step={100}
                onChange={(e) => setInitial(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-4">
            {res.valid ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">{L.arithLabel}</div>
                    <div className="text-xl font-bold text-slate-800">{(res.arith * 100).toFixed(2)}%</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">{L.geomLabel}</div>
                    <div className={`text-xl font-bold ${res.geom < res.arith ? "text-orange-600" : "text-emerald-600"}`}>{(res.geom * 100).toFixed(2)}%</div>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <div className="text-xs text-slate-400 mb-1">{L.dragLabel}</div>
                  <div className={`text-3xl font-bold ${bandColor}`}>{(res.drag * 100).toFixed(2)}%</div>
                  <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm border-t border-slate-100 pt-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">{L.fvGeomLabel}</div>
                    <div className="font-mono font-semibold text-emerald-600">{res.fvGeom.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">{L.fvArithLabel}</div>
                    <div className="font-mono font-semibold text-red-500">{res.fvArith.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {L.insight}
                </p>
              </>
            ) : (
              <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
            )}
          </div>

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/compound" className="text-indigo-500 hover:underline">→ {L.linkCompound}</Link>
            {" · "}
            <Link href="/voltarget" className="text-indigo-500 hover:underline">→ {L.linkVolTarget}</Link>
            {" · "}
            <Link href="/montecarlo" className="text-indigo-500 hover:underline">→ {L.linkMonteCarlo}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "波动拖累 / 几何 vs 算术收益",
  subtitle: "输入每期收益率，对比算术与几何（复合）收益，量化波动拖累与终值差异。长期增长看几何均值。",
  returnsLabel: "每期收益率（逗号或空格分隔，如 0.1, -0.2, 0.15）",
  initialLabel: "初始本金",
  arithLabel: "算术均值",
  geomLabel: "几何（复合）",
  dragLabel: "波动拖累",
  fvGeomLabel: "真实终值（几何）",
  fvArithLabel: "虚高终值（算术）",
  invalid: "请输入至少一个有效收益率（> −100%）。",
  insight: "算术均值假设收益可线性叠加，会高估实际增长；几何（复合）均值才是真实长期增长率。二者之差即「波动拖累」——波动越大、拖累越大，终值缩水越明显。",
  disclaimer: "几何均值用 (∏(1+r))^(1/n)−1 计算；假设收益率可复合，不构成投资建议。",
  linkCompound: "复利计算",
  linkVolTarget: "波动目标",
  linkMonteCarlo: "蒙特卡洛",
  bandLabels: { low: "低拖累", moderate: "中拖累", high: "高拖累", invalid: "无效" },
  presetLabels: { steady: "稳健上涨", choppy: "高波动", crashRecover: "先崩后涨", real: "混合" },
};
const en = {
  title: "Volatility Drag / Geometric vs Arithmetic",
  subtitle: "Enter per-period returns to compare arithmetic and geometric (compounded) returns, and quantify volatility drag and terminal-value gap. Long-run growth is the geometric mean.",
  returnsLabel: "Per-period returns (comma or space separated, e.g. 0.1, -0.2, 0.15)",
  initialLabel: "Initial capital",
  arithLabel: "Arithmetic mean",
  geomLabel: "Geometric (compounded)",
  dragLabel: "Volatility drag",
  fvGeomLabel: "Real terminal (geometric)",
  fvArithLabel: "Inflated terminal (arith.)",
  invalid: "Enter at least one valid return (> −100%).",
  insight: "Arithmetic mean assumes returns add linearly and overstates growth; the geometric (compounded) mean is the true long-run rate. Their difference is the 'volatility drag' — more volatility, more drag, smaller terminal value.",
  disclaimer: "Geometric mean = (∏(1+r))^(1/n) − 1; assumes compounding. Not investment advice.",
  linkCompound: "Compound",
  linkVolTarget: "Volatility Target",
  linkMonteCarlo: "Monte Carlo",
  bandLabels: { low: "Low drag", moderate: "Moderate drag", high: "High drag", invalid: "Invalid" },
  presetLabels: { steady: "Steady", choppy: "Choppy", crashRecover: "Crash & recover", real: "Mixed" },
};
