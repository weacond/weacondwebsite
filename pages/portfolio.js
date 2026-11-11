"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import Head from "next/head";
import { planForPreset, PRESETS } from "../lib/portfolioPresets";

export const metadata = {
  title: "组合优化器 — Weacond",
  description: "给定一篮子资产（收益/波动/相关），对比等权/逆波动/风险平价/最大夏普/最小方差五种配权，给出夏普、波动、HHI、等效资产数、分散化比率与有效前沿。教育性工具，非投资建议。",
  robots: { index: true, follow: true },
};

const PLAN_CLS = {
  equal: "border-slate-200",
  inverseVol: "border-sky-200",
  riskParity: "border-indigo-200",
  maxSharpe: "border-emerald-300",
  minVariance: "border-amber-200",
};

export default function PortfolioPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [presetId, setPresetId] = useState("global_macro");

  const plan = planForPreset(presetId, { grid: 40, frontierPoints: 21 });
  const assets = plan.assets;
  const bestKey = plan.best.key;
  const frontier = plan.frontier;

  const num = (v) => (Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>

          {/* 预设选择 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-3">{L.preset}</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPresetId(p.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    presetId === p.id
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {lang === "en" ? p.nameEn : p.name}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-3">{lang === "en" ? plan.descEn : plan.desc}</p>
          </div>

          {/* 资产表 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">{L.assets}</h2>
              <span className="text-xs text-slate-400">
                {L.rf}: {plan.rf}%
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs">
                  <th className="text-left font-medium pb-2">{L.asset}</th>
                  <th className="text-right font-medium pb-2">{L.mu}</th>
                  <th className="text-right font-medium pb-2">{L.vol}</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5 text-slate-700">{lang === "en" ? a.nameEn : a.name}</td>
                    <td className="py-1.5 text-right font-mono text-slate-600">{num(a.mu)}%</td>
                    <td className="py-1.5 text-right font-mono text-slate-600">{num(a.vol)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 五种配权方案 */}
          <h2 className="text-lg font-bold mb-3">{L.plans}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {plan.plans.map((pl) => (
              <div
                key={pl.key}
                className={`rounded-xl p-4 bg-white shadow-sm border-2 ${PLAN_CLS[pl.key] || "border-slate-200"} ${
                  pl.key === bestKey ? "ring-2 ring-emerald-400" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{lang === "en" ? pl.labelEn : pl.label}</span>
                  {pl.key === bestKey && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {L.best}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-indigo-600">{num(pl.sharpe)}</span>
                  <span className="text-xs text-slate-400">{L.sharpe}</span>
                </div>
                <div className="space-y-1 mb-2">
                  {pl.weights.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-10 shrink-0">{assets[i]?.name}</span>
                      <div className="flex-1 bg-slate-100 rounded h-2 overflow-hidden">
                        <div className="h-full bg-indigo-400" style={{ width: `${Math.min(100, w)}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 w-9 text-right">{num(w)}%</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1 text-center border-t border-slate-100 pt-2">
                  <Metric label={L.vol} value={`${num(pl.vol)}%`} />
                  <Metric label={L.ret} value={`${num(pl.ret)}%`} />
                  <Metric label="DR" value={num(pl.dr)} />
                </div>
                <div className="grid grid-cols-2 gap-1 text-center mt-1">
                  <Metric label="HHI" value={num(pl.hhi)} />
                  <Metric label={L.ena} value={num(pl.ena)} />
                </div>
              </div>
            ))}
          </div>

          {/* 风险贡献（风险平价） */}
          <RiskContrib plan={plan} L={L} />

          {/* 有效前沿 */}
          {frontier && frontier.points.length > 1 && <FrontierChart frontier={frontier} L={L} />}

          <p className="mt-8 text-center text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-xs font-mono font-semibold text-slate-700">{value}</div>
    </div>
  );
}

function RiskContrib({ plan, L }) {
  const n = plan.nAssets;
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
      <h2 className="text-lg font-bold mb-1">{L.riskContrib}</h2>
      <p className="text-xs text-slate-400 mb-3">{L.riskContribHint}</p>
      <div className="space-y-2">
        {plan.riskContribution.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-12 shrink-0">{plan.assets[i]?.name}</span>
            <div className="flex-1 bg-slate-100 rounded h-4 overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (c / 100) * n * 100)}%` }} />
            </div>
            <span className="text-xs font-mono text-slate-600 w-12 text-right">{c}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}


// 有效前沿散点：x=组合年化波动率(%), y=夏普。有效点高亮，标注最小方差与最大夏普锚点。
function FrontierChart({ frontier, L }) {
  const pts = frontier.points;
  const W = 560;
  const H = 300;
  const pad = 40;
  const xs = pts.map((p) => p.vol);
  const ys = pts.map((p) => p.sharpe);
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(...ys, 0);
  const ymax = Math.max(...ys);
  const sx = (x) => pad + ((x - xmin) / ((xmax - xmin) || 1)) * (W - 2 * pad);
  const sy = (y) => H - pad - ((y - ymin) / ((ymax - ymin) || 1)) * (H - 2 * pad);
  const line = pts.map((p) => `${sx(p.vol)},${sy(p.sharpe)}`).join(" ");

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
      <h2 className="text-lg font-bold mb-1">{L.frontier}</h2>
      <p className="text-xs text-slate-400 mb-3">{L.frontierHint}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 320 }}>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#e2e8f0" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#e2e8f0" />
        <polyline points={line} fill="none" stroke="#c7d2fe" strokeWidth={2} />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={sx(p.vol)}
            cy={sy(p.sharpe)}
            r={p.efficient ? 4 : 2.5}
            fill={p.efficient ? "#6366f1" : "#cbd5e1"}
          />
        ))}
        <circle cx={sx(frontier.minVariance.vol)} cy={sy(frontier.minVariance.sharpe)} r={5} fill="#f59e0b" />
        <circle cx={sx(frontier.maxSharpe.vol)} cy={sy(frontier.maxSharpe.sharpe)} r={5} fill="#10b981" />
        <text x={W - pad} y={H - pad + 16} textAnchor="end" fill="#94a3b8" style={{ fontSize: 10 }}>
          {L.frontierX}
        </text>
        <text x={pad} y={pad - 8} fill="#94a3b8" style={{ fontSize: 10 }}>
          {L.frontierY}
        </text>
      </svg>
      <div className="flex gap-4 text-xs text-slate-500 mt-2">
        <span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" />
          {L.maxSharpe}
        </span>
        <span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1" />
          {L.minVariance}
        </span>
        <span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 mr-1" />
          {L.efficient}
        </span>
      </div>
    </div>
  );
}

const zh = {
  title: "组合优化器",
  subtitle: "给定一篮子资产（预期收益 / 波动 / 相关），对比 5 种配权方案的夏普、波动与分散度。教育性工具，非投资建议。",
  preset: "选择资产篮子",
  assets: "资产",
  asset: "标的",
  mu: "预期收益 μ",
  vol: "波动率 σ",
  rf: "无风险利率",
  plans: "配权方案对比",
  best: "夏普最优",
  sharpe: "夏普",
  ret: "预期收益",
  ena: "等效资产数",
  riskContrib: "风险平价风险贡献",
  riskContribHint: "风险平价下各资产承担的风险占比（应趋近相等）。",
  frontier: "有效前沿",
  frontierHint: "横轴组合波动率、纵轴夏普；蓝线为前沿，绿/橙为最大夏普/最小方差锚点。",
  frontierX: "波动率 σ (%)",
  frontierY: "夏普",
  maxSharpe: "最大夏普",
  minVariance: "最小方差",
  efficient: "有效点",
  disclaimer: "预设参数为示意性历史估计，本工具用于教学演示，不构成投资建议。",
};
const en = {
  title: "Portfolio Optimizer",
  subtitle: "Given a basket of assets (expected return / vol / correlation), compare 5 weighting schemes by Sharpe, vol, and diversification. Educational tool, not investment advice.",
  preset: "Choose asset basket",
  assets: "Assets",
  asset: "Asset",
  mu: "Return μ",
  vol: "Vol σ",
  rf: "Risk-free",
  plans: "Weighting Schemes",
  best: "Best Sharpe",
  sharpe: "Sharpe",
  ret: "Return",
  ena: "Eff. #Assets",
  riskContrib: "Risk-Parity Risk Contribution",
  riskContribHint: "Each asset's share of portfolio risk under risk parity (should approach equal).",
  frontier: "Efficient Frontier",
  frontierHint: "X = portfolio vol, Y = Sharpe; blue line is the frontier, green/orange mark max-Sharpe / min-variance.",
  frontierX: "Vol σ (%)",
  frontierY: "Sharpe",
  maxSharpe: "Max Sharpe",
  minVariance: "Min Variance",
  efficient: "Efficient",
  disclaimer: "Preset parameters are illustrative historical estimates; this tool is for education only, not investment advice.",
};
