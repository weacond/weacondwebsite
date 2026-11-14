"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import { CORR_PRESETS, diversifyPlan } from "../lib/correlationLab";

export const metadata = {
  title: "相关性 & 分散化 — Weacond",
  description: "给定资产篮子（相关矩阵 + 波动率），等权 vs 逆波动配权下读取分散化比率 DR、HHI、逐对相关强度与相关性热力图。教育性工具，非投资建议。",
  robots: { index: true, follow: true },
};

function corrColor(rho) {
  const a = Math.min(1, Math.abs(rho));
  const t = a >= 0.55;
  const bg = rho >= 0 ? `rgba(79,70,229,${(0.1 + 0.85 * a).toFixed(3)})` : `rgba(244,63,94,${(0.1 + 0.85 * a).toFixed(3)})`;
  return { bg, fg: t ? "#fff" : "#334155" };
}

// 方向 → 徽标配色
const DIR_CLS = {
  positive: "bg-emerald-100 text-emerald-700",
  negative: "bg-rose-100 text-rose-700",
  none: "bg-slate-100 text-slate-500",
};

export default function CorrelationPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [presetId, setPresetId] = useState("equityBonds");
  const [mode, setMode] = useState("equal");

  const plan = diversifyPlan(presetId, mode);
  const num = (v) => (Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="correlation" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/correlation"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Correlation & Diversification", href: "/correlation" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>

          {/* 预设 + 配权模式 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-3">{L.preset}</h2>
            <div className="flex flex-wrap gap-2">
              {Object.values(CORR_PRESETS).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPresetId(p.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    presetId === p.id ? "bg-indigo-600 text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lang === "en" ? p.nameEn : p.name}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-3">{lang === "en" ? plan.descEn : plan.desc}</p>

            <div className="flex gap-2 mt-4">
              <span className="text-sm text-slate-500 self-center">{L.mode}:</span>
              {["equal", "invVol"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    mode === m ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {m === "equal" ? L.equalWeight : L.invVolWeight}
                </button>
              ))}
            </div>
          </div>

          {/* 概览指标 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-4">{L.summary}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Metric label={L.dr} value={num(plan.dr)} accent="text-indigo-600" />
              <Metric label={L.hhi} value={num(plan.hhi)} />
              <Metric label={L.portVol} value={`${num(plan.portVol)}%`} />
              <Metric label={L.pairs} value={num(plan.nPairs)} />
            </div>
            <p className="text-xs text-slate-400 mt-3">{L.drHint}</p>
          </div>
          {/* 权重条形 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-3">{L.weights}</h2>
            <div className="space-y-2">
              {plan.assets.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-20 shrink-0">{lang === "en" ? a.nameEn : a.name}</span>
                  <span className="text-[10px] text-slate-400 w-14">σ {num(plan.vols[i])}%</span>
                  <div className="flex-1 bg-slate-100 rounded h-3 overflow-hidden">
                    <div className="h-full bg-indigo-400" style={{ width: `${Math.min(100, plan.weights[i] * 100)}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 w-12 text-right">{num(plan.weights[i] * 100)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 相关性热力图 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-1">{L.heatmap}</h2>
            <p className="text-xs text-slate-400 mb-3">{L.heatmapHint}</p>
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs mx-auto">
                <thead>
                  <tr>
                    <th className="p-1" />
                    {plan.assets.map((a, i) => (
                      <th key={i} className="p-1 text-slate-400 font-normal whitespace-nowrap">
                        {lang === "en" ? a.nameEn : a.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.matrix.map((row, i) => (
                    <tr key={i}>
                      <td className="p-1 text-slate-400 font-normal whitespace-nowrap">{lang === "en" ? plan.assets[i].nameEn : plan.assets[i].name}</td>
                      {row.map((rho, j) => {
                        const { bg, fg } = corrColor(rho);
                        return (
                          <td
                            key={j}
                            className="p-1 text-center font-mono w-14 h-10"
                            style={{ background: bg, color: fg }}
                            title={`${plan.assets[i].name} × ${plan.assets[j].name}: ρ=${rho}`}
                          >
                            {rho.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 逐对相关强度 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-3">{L.pairsTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {plan.pairs.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-3 py-2">
                  <span className="text-slate-600">
                    {lang === "en"
                      ? `${plan.assets[p.i].nameEn} × ${plan.assets[p.j].nameEn}`
                      : `${plan.assets[p.i].name} × ${plan.assets[p.j].name}`}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-slate-700">ρ {p.rho.toFixed(2)}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DIR_CLS[p.dir]}`}>
                      {p.rho > 0.001 ? "▲" : p.rho < -0.001 ? "▼" : "·"} {L.strengthLabel[p.strength]}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div>
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className={`text-sm font-mono font-semibold ${accent || "text-slate-700"}`}>{value}</div>
    </div>
  );
}


const zh = {
  title: "相关性 & 分散化",
  subtitle: "给定资产篮子（相关矩阵 + 波动率），对比等权 vs 逆波动配权下的分散化比率 DR、HHI、逐对相关强度与热力图。教育性工具，非投资建议。",
  howToTitle: "如何使用相关性/分散化计算器",
  howTo: [
    "输入资产篮子的相关矩阵与波动率。",
    "计算器对比等权 vs 逆波动配权的分散化比率 DR、HHI 与逐对相关强度。",
    "查看热力图，找出分散化最佳资产组合。",
  ],
  preset: "选择资产篮子",
  mode: "配权",
  equalWeight: "等权",
  invVolWeight: "逆波动",
  summary: "概览",
  dr: "分散化比率 DR",
  hhi: "HHI",
  portVol: "组合波动",
  pairs: "逐对数",
  drHint: "DR=1 表示完全正相关（无分散化收益）；DR 越大，分散化越有效。HHI 越小越分散。",
  weights: "配权",
  heatmap: "相关性热力图",
  heatmapHint: "蓝色=正相关，红色=负相关，颜色越深相关越强。",
  pairsTitle: "逐对相关强度",
  strengthLabel: { none: "无关", weak: "弱", moderate: "中等", strong: "强", veryStrong: "极强" },
  disclaimer: "相关矩阵与波动为示意性历史估计，相关性会随时间漂移；本工具用于教学演示，不构成投资建议。",
};
const en = {
  title: "Correlation & Diversification",
  subtitle: "Given a basket (correlation matrix + vols), compare equal vs inverse-vol weighting on diversification ratio DR, HHI, per-pair strength, and a heatmap. Educational tool, not investment advice.",
  howToTitle: "How to use the correlation & diversification calculator",
  howTo: [
    "Enter the basket's correlation matrix and volatilities.",
    "The calculator compares equal vs inverse-vol weighting on DR, HHI and per-pair strength.",
    "Read the heatmap to find the most diversifying mix.",
  ],
  preset: "Choose asset basket",
  mode: "Weighting",
  equalWeight: "Equal",
  invVolWeight: "Inverse-Vol",
  summary: "Overview",
  dr: "Diversification Ratio",
  hhi: "HHI",
  portVol: "Portfolio Vol",
  pairs: "Pairs",
  drHint: "DR=1 means fully correlated (no diversification); higher DR = better diversification. Lower HHI = more diversified.",
  weights: "Weights",
  heatmap: "Correlation Heatmap",
  heatmapHint: "Blue = positive, red = negative; darker = stronger.",
  pairsTitle: "Per-Pair Strength",
  strengthLabel: { none: "none", weak: "weak", moderate: "moderate", strong: "strong", veryStrong: "very strong" },
  disclaimer: "Correlation matrices and vols are illustrative historical estimates; correlations drift over time. For education only, not investment advice.",
};

