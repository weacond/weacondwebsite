"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  zView, ZSCORE_PRESETS,
} from "../lib/zscore";

export const metadata = {
  title: "Z 分数 / 标准化计算器 — Weacond",
  description: "输入数值、均值与标准差，算 Z 分数、正态百分位与分级。用于均值回归与异常检测，教育性参考。",
  robots: { index: true, follow: true },
};

export default function ZScorePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [x, setX] = useState(10);
  const [mean, setMean] = useState(20);
  const [std, setStd] = useState(2);

  const res = useMemo(() => zView(x, mean, std), [x, mean, std]);

  const applyPreset = (p) => {
    setX(p.x);
    setMean(p.mean);
    setStd(p.std);
  };

  const bandColor =
    res.band === "extreme" ? "text-red-600" :
    res.band === "rare" ? "text-orange-600" :
    res.band === "notable" ? "text-amber-600" :
    res.band === "invalid" ? "text-slate-400" : "text-emerald-600";

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
            {Object.values(ZSCORE_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.xLabel}</span>
              <input type="number" value={x} step={0.01}
                onChange={(e) => setX(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.meanLabel}</span>
              <input type="number" value={mean} step={0.01}
                onChange={(e) => setMean(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.stdLabel}</span>
              <input type="number" value={std} min={0} step={0.01}
                onChange={(e) => setStd(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-4">
            {res.valid ? (
              <>
                <div className="text-center mb-4">
                  <div className="text-xs text-slate-400 mb-1">{L.zLabel}</div>
                  <div className={`text-4xl font-bold ${bandColor}`}>{res.z.toFixed(2)}σ</div>
                  <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[res.band] : res.band}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">{L.pctileLabel}</div>
                    <div className="font-mono font-semibold text-slate-800">{res.pctile.toFixed(2)}%</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">{L.tailLabel}</div>
                    <div className="font-mono font-semibold text-slate-800">{(100 - res.pctile).toFixed(2)}%</div>
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
            <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
            {" · "}
            <Link href="/backtest" className="text-indigo-500 hover:underline">→ {L.linkBacktest}</Link>
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
  title: "Z 分数 / 标准化计算器",
  subtitle: "输入数值、均值与标准差，算 Z 分数、正态百分位与分级。用于均值回归信号与异常值检测。",
  xLabel: "数值 x",
  meanLabel: "均值 μ",
  stdLabel: "标准差 σ",
  zLabel: "Z 分数",
  pctileLabel: "百分位（P<Z）",
  tailLabel: "上尾（P>Z）",
  invalid: "标准差须为正数。",
  insight: "z = (x − μ) / σ 衡量 x 偏离均值几个标准差。|z|>2 约 5% 概率（罕见），|z|>3 约 0.3%（极端），常作均值回归/异常信号。",
  disclaimer: "正态 CDF 经 erf 近似（误差 < 1.5e-7）；假设数据近似正态，不构成投资建议。",
  linkRisk: "风险仪表盘",
  linkBacktest: "回测",
  linkMonteCarlo: "蒙特卡洛",
  bandLabels: { neutral: "中性 |z|<1", notable: "显著 1≤|z|<2", rare: "罕见 2≤|z|<3", extreme: "极端 |z|≥3", invalid: "无效" },
  presetLabels: { oversold: "超卖", neutral: "中性", outlier: "极端离群", return: "收益率离群" },
};
const en = {
  title: "Z-Score / Standardization",
  subtitle: "Enter a value, mean and standard deviation to get the Z-score, normal percentile and band. Used for mean-reversion signals & outlier detection.",
  xLabel: "Value x",
  meanLabel: "Mean μ",
  stdLabel: "Std σ",
  zLabel: "Z-score",
  pctileLabel: "Percentile (P<Z)",
  tailLabel: "Upper tail (P>Z)",
  invalid: "Standard deviation must be positive.",
  insight: "z = (x − μ) / σ measures how many std devs x is from the mean. |z|>2 ≈ 5% chance (rare), |z|>3 ≈ 0.3% (extreme) — common mean-reversion / outlier signals.",
  disclaimer: "Normal CDF via erf approximation (error < 1.5e-7); assumes roughly normal data. Not investment advice.",
  linkRisk: "Risk dashboard",
  linkBacktest: "Backtest",
  linkMonteCarlo: "Monte Carlo",
  bandLabels: { neutral: "Neutral |z|<1", notable: "Notable 1≤|z|<2", rare: "Rare 2≤|z|<3", extreme: "Extreme |z|≥3", invalid: "Invalid" },
  presetLabels: { oversold: "Oversold", neutral: "Neutral", outlier: "Outlier", return: "Return outlier" },
};
