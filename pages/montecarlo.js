"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import { MC_PRESETS, runSimulation } from "../lib/monteCarlo";

export const metadata = {
  title: "蒙特卡洛风险模拟器 — Weacond",
  description: "给定资产的日度 μ/σ，模拟 N 条财富路径，读出终端财富分布、腰斩/归零概率、回撤分位与扇形图。教育性工具，非投资建议。",
  robots: { index: true, follow: true },
};

export default function MonteCarloPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [presetId, setPresetId] = useState("equity");
  const [horizonYears, setHorizonYears] = useState(5);
  const [nPaths, setNPaths] = useState(1000);
  const [seed, setSeed] = useState(1);

  const sim = runSimulation(presetId, { horizonYears, nPaths, seed, paths: 12 });
  const pct = (v) => (Number.isFinite(v) ? (v * 100).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "%" : "—");
  const mult = (v) => (Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) + "×" : "—");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="montecarlo" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>

          {/* 预设 + 参数 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-3">{L.preset}</h2>
            <div className="flex flex-wrap gap-2">
              {Object.values(MC_PRESETS).map((p) => (
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
            <p className="text-sm text-slate-500 mt-3">{lang === "en" ? sim.preset.descEn : sim.preset.desc}</p>
            <p className="text-xs text-slate-400 mt-1">μ {sim.mu}% / σ {sim.sigma}%（日度）</p>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <label className="text-sm">
                <span className="text-slate-500">{L.horizon}</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  step="1"
                  value={horizonYears}
                  onChange={(e) => setHorizonYears(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 w-full px-2 py-1 border border-slate-200 rounded text-sm font-mono"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-500">{L.paths}</span>
                <select
                  value={nPaths}
                  onChange={(e) => setNPaths(parseInt(e.target.value))}
                  className="mt-1 w-full px-2 py-1 border border-slate-200 rounded text-sm font-mono bg-white"
                >
                  {[500, 1000, 3000, 5000].map((n) => (
                    <option key={n} value={n}>
                      {n.toLocaleString()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-slate-500">{L.seed}</span>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value) || 1)}
                  className="mt-1 w-full px-2 py-1 border border-slate-200 rounded text-sm font-mono"
                />
              </label>
            </div>
          </div>
          {/* 终端财富分布 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-1">{L.terminalTitle}</h2>
            <p className="text-xs text-slate-400 mb-4">{L.terminalHint}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Metric label="P10" value={mult(sim.terminal.p10)} />
              <Metric label="P50" value={mult(sim.terminal.p50)} accent="text-indigo-600" />
              <Metric label="P90" value={mult(sim.terminal.p90)} />
              <Metric label={L.mean} value={mult(sim.terminal.mean)} />
            </div>
          </div>

          {/* 概率 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-4">{L.probTitle}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Metric label={L.probGain} value={pct(sim.probGain)} accent="text-emerald-600" />
              <Metric label={L.probLoss} value={pct(sim.probLoss)} accent="text-rose-600" />
              <Metric label={L.probHalved} value={pct(sim.probHalved)} accent="text-rose-600" />
              <Metric label={L.probRuin} value={pct(sim.probRuin)} accent="text-rose-700" />
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2 text-center">
              {sim.ddDist.map((d) => (
                <div key={d.label} className="bg-slate-50 rounded-lg p-2">
                  <div className="text-[10px] text-slate-400">{d.label}</div>
                  <div className="text-xs font-mono font-semibold text-slate-700">{pct(d.value)}</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 text-center">{L.ddHint}</p>
          </div>

          {/* 扇形图 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-1">{L.fanTitle}</h2>
            <p className="text-xs text-slate-400 mb-3">{L.fanHint}</p>
            <FanChart sim={sim} L={L} />
            <div className="flex gap-4 text-xs text-slate-500 mt-2">
              <span><span className="inline-block w-3 h-1 bg-indigo-400 mr-1" />{L.median}</span>
              <span><span className="inline-block w-3 h-2 bg-indigo-100 border border-indigo-200 mr-1" />{L.band}</span>
              <span><span className="inline-block w-3 h-0.5 bg-slate-300 mr-1" />{L.samplePaths}</span>
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


// 扇形图：p5–p95 阴影带 + p50 中位线 + 抽样路径（对数纵轴）
function FanChart({ sim, L }) {
  const { band, samplePaths, horizon } = sim;
  if (!band || band.p50.length < 2) return null;
  const W = 560;
  const H = 260;
  const pad = 10;
  const T = band.p50.length; // horizon+1
  // 子采样到 ~120 个时间点
  const step = Math.max(1, Math.floor(T / 120));
  const idx = [];
  for (let t = 0; t < T; t += step) idx.push(t);
  if (idx[idx.length - 1] !== T - 1) idx.push(T - 1);
  // 对数纵轴范围（clip 掉 0 财富）
  let lo = Infinity;
  let hi = -Infinity;
  for (const t of idx) {
    lo = Math.min(lo, band.p5[t], band.p50[t], band.p95[t]);
    hi = Math.max(hi, band.p5[t], band.p50[t], band.p95[t]);
  }
  lo = Math.max(0.01, lo);
  const lgLo = Math.log10(lo);
  const lgHi = Math.log10(hi);
  const sx = (t) => pad + (t / (T - 1)) * (W - 2 * pad);
  const sy = (w) => {
    const lg = Math.log10(Math.max(0.01, w));
    return pad + ((lgHi - lg) / (lgHi - lgLo || 1)) * (H - 2 * pad);
  };
  const line = (arr) => idx.map((t) => `${sx(t)},${sy(arr[t])}`).join(" L ");
  const bandTop = idx.map((t) => `${sx(t)},${sy(band.p95[t])}`).join(" L ");
  const bandBot = idx.map((t) => `${sx(T - 1 - t)},${sy(band.p5[T - 1 - t])}`).join(" L ");
  const bandArea = "M " + bandTop + " L " + bandBot + " Z";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
      {/* 阴影带 p5–p95 */}
      <path d={bandArea} fill="#e0e7ff" stroke="none" />
      {/* 抽样路径 */}
      {samplePaths.map((p, i) => (
        <polyline key={i} points={line(p)} fill="none" stroke="#cbd5e1" strokeWidth={0.6} opacity={0.6} />
      ))}
      {/* 中位线 p50 */}
      <polyline points={line(band.p50)} fill="none" stroke="#6366f1" strokeWidth={1.8} />
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#e2e8f0" />
      <text x={W - pad} y={H - pad + 14} textAnchor="end" fill="#94a3b8" style={{ fontSize: 10 }}>
        {L.timeYears} → {sim.horizonYears}y
      </text>
      <text x={pad} y={pad + 2} fill="#94a3b8" style={{ fontSize: 10 }}>
        {L.wealthMult}
      </text>
    </svg>
  );
}

const zh = {
  title: "蒙特卡洛风险模拟器",
  subtitle: "给定资产日度 μ/σ，模拟 N 条财富路径，读出终端财富分布、腰斩/归零概率、回撤分位与扇形图。教育性工具，非投资建议。",
  preset: "选择资产",
  horizon: "投资年限",
  paths: "路径数 N",
  seed: "随机种子",
  terminalTitle: "终端财富分布",
  terminalHint: "N 条路径走完年限后的最终倍数（1× = 本金）。",
  mean: "均值",
  probTitle: "概率与回撤分位",
  probGain: "盈利概率",
  probLoss: "亏损概率",
  probHalved: "财富腰斩",
  probRuin: "几乎归零",
  ddHint: "上：终端财富概率；下：最大回撤分位（越靠右越极端）。",
  fanTitle: "财富扇形图",
  fanHint: "灰带为 p5–p95 区间，蓝线为中位数，细线为抽样路径（对数纵轴）。",
  median: "中位数 P50",
  band: "P5–P95",
  samplePaths: "抽样路径",
  timeYears: "时间",
  wealthMult: "财富倍数",
  disclaimer: "μ/σ 为示意性历史估计，正态假设低估尾部风险；本工具仅用于演示蒙特卡洛方法，不构成投资建议。",
};
const en = {
  title: "Monte Carlo Risk Simulator",
  subtitle: "Given an asset's daily μ/σ, simulate N wealth paths to read terminal-wealth distribution, halving/ruin probabilities, drawdown percentiles, and a fan chart. Educational tool, not investment advice.",
  preset: "Choose asset",
  horizon: "Horizon (yrs)",
  paths: "Paths N",
  seed: "Random seed",
  terminalTitle: "Terminal Wealth",
  terminalHint: "Final multiple after the horizon across N paths (1× = principal).",
  mean: "Mean",
  probTitle: "Probabilities & Drawdown",
  probGain: "Prob. Gain",
  probLoss: "Prob. Loss",
  probHalved: "Halved",
  probRuin: "Near ruin",
  ddHint: "Top: terminal-wealth probabilities; bottom: max-drawdown percentiles (righter = more extreme).",
  fanTitle: "Wealth Fan Chart",
  fanHint: "Shaded band = P5–P95, blue line = median, thin lines = sample paths (log y-axis).",
  median: "Median P50",
  band: "P5–P95",
  samplePaths: "Sample paths",
  timeYears: "Time",
  wealthMult: "Wealth ×",
  disclaimer: "μ/σ are illustrative historical estimates; a normal assumption underestimates tail risk. For demonstrating the Monte Carlo method only, not investment advice.",
};

