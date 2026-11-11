"use client";

// pages/compare.js — 多策略对比 UI
// 在同一市场预设下，用默认参数同时跑 STRATEGY_REGISTRY 里所有策略，
// 横向对比核心绩效指标，并按指标高亮最优者。复用 lib/backtest + lib/marketdata。

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import { useState } from "react";
import { STRATEGY_REGISTRY } from "../lib/backtest";
import { PRESET_MARKETS, runFullBacktest } from "../lib/marketdata";
import { correlationMatrix, diversificationRatio } from "../lib/correlation";
import { portfolioSharpe, portfolioVolatility, inverseVolWeights, riskContribution, riskParityWeights, maxSharpeWeights, minimumVarianceWeights, herfindahlIndex, effectiveNumAssets, riskRewardPoints, efficientFrontier, volTargetScale } from "../lib/portfolio";

// 对比用指标（higher=true 表示越大越好；maxDrawdown 越小越好）
const CMP_METRICS = [
  { key: "totalReturn", label: "总收益", labelEn: "Total Return", fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`, higher: true },
  { key: "cagr", label: "年化", labelEn: "CAGR", fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`, higher: true },
  { key: "sharpe", label: "夏普", labelEn: "Sharpe", fmt: (v) => v.toFixed(2), higher: true },
  { key: "sortino", label: "索提诺", labelEn: "Sortino", fmt: (v) => v.toFixed(2), higher: true },
  { key: "martin", label: "马丁", labelEn: "Martin", fmt: (v) => v.toFixed(2), higher: true },
  { key: "maxDrawdown", label: "最大回撤", labelEn: "Max DD", fmt: (v) => `-${v.toFixed(1)}%`, higher: false },
  { key: "winRate", label: "胜率", labelEn: "Win Rate", fmt: (v) => `${v.toFixed(0)}%`, higher: true },
  { key: "profitFactor", label: "盈亏比", labelEn: "Profit Factor", fmt: (v) => v.toFixed(2), higher: true },
  { key: "payoffRatio", label: "Payoff", labelEn: "Payoff", fmt: (v) => v.toFixed(2), higher: true },
  { key: "omegaRatio", label: "欧米伽", labelEn: "Omega", fmt: (v) => v.toFixed(2), higher: true },
  { key: "tailRatio", label: "尾部比率", labelEn: "Tail Ratio", fmt: (v) => v.toFixed(2), higher: true },
  { key: "sterlingRatio", label: "斯特林", labelEn: "Sterling", fmt: (v) => v.toFixed(2), higher: true },
  { key: "maxDrawdownDuration", label: "回撤周期", labelEn: "DD Duration", fmt: (v) => `${v} 根`, higher: false },
  { key: "downsideDeviation", label: "下行波动", labelEn: "Downside σ", fmt: (v) => `${(v * 100).toFixed(2)}%`, higher: false },
  { key: "probRuin", label: "破产概率", labelEn: "Prob. Ruin", fmt: (v) => `${(v * 100).toFixed(1)}%`, higher: false },
  { key: "calmar", label: "卡玛", labelEn: "Calmar", fmt: (v) => v.toFixed(2), higher: true },
  { key: "ulcerIndex", label: "溃疡指数", labelEn: "Ulcer", fmt: (v) => `${(v * 100).toFixed(1)}%`, higher: false },
  { key: "maxLosingStreak", label: "最长连亏", labelEn: "Max Loss Streak", fmt: (v) => v.toString(), higher: false },
  { key: "maxWinStreak", label: "最长连盈", labelEn: "Max Win Streak", fmt: (v) => v.toString(), higher: true },
  { key: "numTrades", label: "交易数", labelEn: "Trades", fmt: (v) => v.toString(), higher: false },
  { key: "informationRatio", label: "信息比率", labelEn: "Info Ratio", fmt: (v) => v.toFixed(2), higher: true },
  { key: "upCapture", label: "上行捕获", labelEn: "Up Capture", fmt: (v) => `${(v * 100).toFixed(0)}%`, higher: true },
  { key: "downCapture", label: "下行捕获", labelEn: "Down Capture", fmt: (v) => `${(v * 100).toFixed(0)}%`, higher: false },
  { key: "trackingError", label: "跟踪误差", labelEn: "Tracking Err.", fmt: (v) => `${(v * 100).toFixed(2)}%`, higher: false },
  { key: "alpha", label: "阿尔法", labelEn: "Alpha", fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`, higher: true },
  { key: "beta", label: "β 系数", labelEn: "Beta", fmt: (v) => v.toFixed(2), neutral: true },
  { key: "treynor", label: "特雷诺", labelEn: "Treynor", fmt: (v) => v.toFixed(2), higher: true },
  { key: "expectancy", label: "每笔期望", labelEn: "Expectancy", fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}`, higher: true },
  { key: "avgDrawdown", label: "平均回撤", labelEn: "Avg DD", fmt: (v) => `-${v.toFixed(2)}%`, higher: false },
  { key: "longestUnderwater", label: "最长水下", labelEn: "Underwater", fmt: (v) => `${v} 根`, higher: false },
  { key: "underwaterPct", label: "水下占比", labelEn: "% Underwater", fmt: (v) => `${v.toFixed(1)}%`, higher: false },
];

const DEFAULT_CONFIG = { initialCapital: 100000, commission: 0.001, slippage: 0.0005, maxPositionPct: 0.25 };

export default function ComparePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [preset, setPreset] = useState("SPY_2023");
  const [results, setResults] = useState(null);
  // 波动率目标：将风险平价组合缩放到目标年化波动（%），用于展示波动率目标化后的夏普
  const [targetVol, setTargetVol] = useState(15);
  const [running, setRunning] = useState(false);

  const strategies = Object.entries(STRATEGY_REGISTRY);

  const runCompare = () => {
    setRunning(true);
    try {
      const rows = strategies.map(([key, def]) => {
        const params = {};
        (def.params || []).forEach((p) => (params[p.key] = p.default));
        let result;
        try {
          result = runFullBacktest({ strategy: key, params, config: DEFAULT_CONFIG, preset });
        } catch (e) {
          result = { error: e.message };
        }
        return { key, name: lang === "en" ? def.nameEn : def.name, result };
      });
      setResults(rows);
    } finally {
      setRunning(false);
    }
  };

  // 某指标下最优策略的 key（用于高亮）
  const bestOf = (metric) => {
    if (!results) return null;
    if (metric.neutral) return null; // 无"优劣"方向（如 beta）：不标最优
    let best = null;
    let bestKey = null;
    for (const r of results) {
      const v = r.result?.metrics?.[metric.key];
      if (typeof v !== "number") continue;
      if (best === null || (metric.higher ? v > best : v < best)) {
        best = v;
        bestKey = r.key;
      }
    }
    return bestKey;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{L.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{L.subtitle}</p>
          </div>

          {/* 控制条 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-6 flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="compare-market" className="block text-xs text-slate-500 mb-1">{L.market}</label>
              <select id="compare-market" value={preset} onChange={(e) => setPreset(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                {Object.entries(PRESET_MARKETS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={runCompare}
              disabled={running}
              className="bg-indigo-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {running ? L.running : L.run}
            </button>
            <span className="text-xs text-slate-400">{L.hint}</span>
          </div>

          {/* 结果 */}
          {!results ? (
            <div className="bg-white rounded-xl p-10 text-center border border-slate-100 text-slate-500">
              {L.start}
            </div>
          ) : (
            <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-500">{L.metric}</th>
                    {results.map((r) => (
                      <th key={r.key} className="px-4 py-3 text-left font-semibold">{r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CMP_METRICS.map((m) => {
                    const bestKey = bestOf(m);
                    return (
                      <tr key={m.key} className="border-b border-slate-50">
                        <td className="px-4 py-3 text-slate-500">{lang === "en" ? m.labelEn : m.label}</td>
                        {results.map((r) => {
                          const v = r.result?.metrics?.[m.key];
                          const isBest = bestKey === r.key && typeof v === "number";
                          const cell = r.result?.error ? "—" : typeof v === "number" ? m.fmt(v) : "—";
                          return (
                            <td key={r.key} className={`px-4 py-3 font-mono ${isBest ? "text-green-600 font-bold" : "text-slate-700"}`}>
                              {cell}
                              {isBest && <span className="ml-1 text-xs">★</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 px-4 py-3">{L.note}</p>
            </div>
            {/* 相关性热力图（基于各策略权益曲线的日收益，衡量分散化） */}
            {results.length > 1 &&
              (() => {
                const items = results
                  .filter((r) => r.result?.equityCurve?.length > 1 && !r.result?.error)
                  .map((r) => ({ name: r.name, equity: r.result.equityCurve }));
                if (items.length < 2) return null;
                const returnsList = items.map((it) => {
                  const vals = it.equity.map((p) => p.value);
                  const rets = [];
                  for (let i = 1; i < vals.length; i++) {
                    const prev = vals[i - 1];
                    if (prev) rets.push((vals[i] - prev) / prev);
                  }
                  return rets;
                });
                const M = correlationMatrix(returnsList);
                // 分散化比率 DR = Σwᵢσᵢ / σ_portfolio（等权）：=1 无分散化收益，>1 越大越分散
                const std = (r) => {
                  const n = r.length;
                  if (n < 2) return 0;
                  const m = r.reduce((a, b) => a + b, 0) / n;
                  const varr = r.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
                  return Math.sqrt(varr);
                };
                const vols = returnsList.map((r) => std(r) * Math.sqrt(252));
                const dr = diversificationRatio(M, vols);
                // 等权组合夏普 / 组合年化波动（复用同一 returnsList/vols/相关矩阵）
                const portSharpe = portfolioSharpe(returnsList, vols, M);
                const portVol = portfolioVolatility(vols, M) * 100;
                // 逆波动加权夏普（风险平价近似，常优于等权）
                const ivWeights = inverseVolWeights(vols);
                const ivSharpe = portfolioSharpe(returnsList, vols, M, ivWeights);
                // 各资产风险贡献（逆波动加权下）：RC_i / ΣRC，和=100%
                const rc = riskContribution(vols, M, ivWeights);
                const rcTotal = rc.reduce((a, b) => a + b, 0);
                // 风险平价权重（各资产风险贡献相等）及其组合夏普
                const rpWeights = riskParityWeights(vols, M);
                const rpSharpe = portfolioSharpe(returnsList, vols, M, rpWeights);
                // 最优（切点）组合权重：long-only 搜索使组合夏普最大（有效前沿切点）及其夏普
                const optWeights = maxSharpeWeights(returnsList, vols, M, { grid: 40 });
                const optSharpe = portfolioSharpe(returnsList, vols, M, optWeights);
                // 最小方差组合权重（纯粹追求波动最小）及其夏普
                const mvWeights = minimumVarianceWeights(vols, M, { grid: 40 });
                const mvSharpe = portfolioSharpe(returnsList, vols, M, mvWeights);
                // 波动率目标化：把风险平价权重按 scale = 目标σ / 当前σ 缩放，使组合年化波动≈目标，再算其夏普
                const vtTarget = (Number(targetVol) || 0) / 100;
                const vtScale = volTargetScale(vols, M, rpWeights, vtTarget);
                const vtWeights =
                  Array.isArray(rpWeights) && rpWeights.length > 0
                    ? rpWeights.map((w) => w * vtScale)
                    : [];
                const vtVol = vtWeights.length > 0 ? portfolioVolatility(vols, M, vtWeights) * 100 : 0;
                const vtSharpe = vtWeights.length > 0 ? portfolioSharpe(returnsList, vols, M, vtWeights) : NaN;
                const corrBg = (c) => {
                  if (c >= 0.95) return "rgba(239,68,68,0.85)"; // 完全相关（分散差）
                  if (c > 0) return `rgba(239,68,68,${(c * 0.5).toFixed(2)})`; // 正相关 → 红
                  if (c < 0) return `rgba(34,197,94,${(Math.abs(c) * 0.5).toFixed(2)})`; // 负相关 → 绿（分散好）
                  return "rgba(148,163,184,0.15)"; // 近 0 → 灰
                };
                return (
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mt-6">
                    <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                      <h3 className="font-semibold">{L.corrTitle}</h3>
                      <div className="text-xs text-slate-500">
                        {L.drLabel} <span className="font-bold text-slate-800">{dr.toFixed(2)}×</span>
                        <span className="text-slate-400 ml-1">（{L.drHint}）</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {L.portSharpeLabel} <span className="font-bold text-slate-800">{portSharpe.toFixed(2)}</span>
                        <span className="text-slate-400 ml-1">· {L.portVolLabel} {portVol.toFixed(1)}%</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {L.ivSharpeLabel} <span className="font-bold text-slate-800">{ivSharpe.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {L.rpSharpeLabel} <span className="font-bold text-slate-800">{rpSharpe.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {L.optSharpeLabel} <span className="font-bold text-slate-800">{optSharpe.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {L.mvSharpeLabel} <span className="font-bold text-slate-800">{mvSharpe.toFixed(2)}</span>
                      </div>
                    </div>
                    {/* 波动率目标化：把风险平价组合缩放到目标年化波动，展示缩放后波动 + 夏普 */}
                    <div className="mt-3 flex items-center gap-3 flex-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="text-xs font-medium text-slate-500 shrink-0">{L.vtLabel}</div>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        step="1"
                        value={targetVol}
                        onChange={(e) => setTargetVol(Number(e.target.value))}
                        className="flex-1 min-w-[120px] accent-indigo-500"
                        aria-label="target annualized volatility percent"
                      />
                      <div className="text-xs text-slate-500 whitespace-nowrap">
                        {Number.isFinite(vtSharpe) ? (
                          <span>
                            {L.vtResult} <span className="font-bold text-slate-800">{vtVol.toFixed(1)}%</span>
                            <span className="text-slate-400 mx-1">·</span>
                            {L.vtSharpe} <span className="font-bold text-slate-800">{vtSharpe.toFixed(2)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">{L.vtNa}</span>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="px-2 py-1"></th>
                            {items.map((it) => (
                              <th key={it.name} className="px-2 py-1 text-slate-500 font-medium">{it.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {M.map((row, i) => (
                            <tr key={items[i].name}>
                              <td className="px-2 py-1 font-medium text-slate-600 whitespace-nowrap">{items[i].name}</td>
                              {row.map((c, j) => (
                                <td
                                  key={j}
                                  className="px-2 py-1 text-center font-mono"
                                  style={{ backgroundColor: corrBg(c), color: Math.abs(c) > 0.6 ? "#fff" : "#334155" }}
                                >
                                  {c.toFixed(2)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="text-xs font-medium text-slate-500">{L.rcTitle}</div>
                      {items.map((it, i) => {
                        const pct = rcTotal > 0 ? (rc[i] / rcTotal) * 100 : 0;
                        return (
                          <div key={it.name} className="flex items-center gap-2 text-xs">
                            <span className="w-20 shrink-0 truncate text-slate-600">{it.name}</span>
                            <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                              <div className="h-full bg-indigo-400" style={{ width: `${Math.max(0, pct).toFixed(1)}%` }} />
                            </div>
                            <span className="w-12 shrink-0 text-right font-mono text-slate-700">{pct.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{L.corrNote}</p>
                    <div className="mt-3 space-y-1.5">
                      <div className="text-xs font-medium text-slate-500">{L.rpTitle}</div>
                      {items.map((it, i) => {
                        const pct = rpWeights[i] != null && Number.isFinite(rpWeights[i]) ? rpWeights[i] * 100 : 0;
                        return (
                          <div key={it.name} className="flex items-center gap-2 text-xs">
                            <span className="w-20 shrink-0 truncate text-slate-600">{it.name}</span>
                            <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, pct)).toFixed(1)}%` }} />
                            </div>
                            <span className="w-12 shrink-0 text-right font-mono text-slate-700">{pct.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="text-xs font-medium text-slate-500">{L.optTitle}</div>
                      {items.map((it, i) => {
                        const pct = optWeights[i] != null && Number.isFinite(optWeights[i]) ? optWeights[i] * 100 : 0;
                        return (
                          <div key={it.name} className="flex items-center gap-2 text-xs">
                            <span className="w-20 shrink-0 truncate text-slate-600">{it.name}</span>
                            <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${Math.max(0, Math.min(100, pct)).toFixed(1)}%` }} />
                            </div>
                            <span className="w-12 shrink-0 text-right font-mono text-slate-700">{pct.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="text-xs font-medium text-slate-500">{L.mvTitle}</div>
                      {items.map((it, i) => {
                        const pct = mvWeights[i] != null && Number.isFinite(mvWeights[i]) ? mvWeights[i] * 100 : 0;
                        return (
                          <div key={it.name} className="flex items-center gap-2 text-xs">
                            <span className="w-20 shrink-0 truncate text-slate-600">{it.name}</span>
                            <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                              <div className="h-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, pct)).toFixed(1)}%` }} />
                            </div>
                            <span className="w-12 shrink-0 text-right font-mono text-slate-700">{pct.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* 集中度对比：HHI / 等效资产数，衡量各权重方案的分散程度 */}
                    <div className="mt-3 space-y-1.5">
                      <div className="text-xs font-medium text-slate-500">{L.hhiTitle}</div>
                      {[
                        { label: L.hhiEqual, w: Array.from({ length: items.length }, () => 1 / items.length) },
                        { label: L.ivSharpeLabel, w: ivWeights },
                        { label: L.rpSharpeLabel, w: rpWeights },
                        { label: L.optSharpeLabel, w: optWeights },
                        { label: L.mvSharpeLabel, w: mvWeights },
                      ].map((row) => {
                        const w = Array.isArray(row.w) ? row.w : [];
                        const hhi = herfindahlIndex(w);
                        const ena = effectiveNumAssets(w);
                        const n = items.length;
                        // HHI∈[1/n,1]：越接近 1 越集中；映射到条宽（越长越集中）
                        const width = n > 1 ? ((hhi - 1 / n) / (1 - 1 / n)) * 100 : 0;
                        return (
                          <div key={row.label} className="flex items-center gap-2 text-xs">
                            <span className="w-28 shrink-0 truncate text-slate-600">{row.label}</span>
                            <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                              <div className="h-full bg-rose-400" style={{ width: `${Math.max(0, Math.min(100, width)).toFixed(1)}%` }} />
                            </div>
                            <span className="w-32 shrink-0 text-right font-mono text-slate-700">
                              {hhi.toFixed(3)} · {ena.toFixed(1)}
                              {L.hhiUnit}
                            </span>
                          </div>
                        );
                      })}
                      <p className="text-xs text-slate-400 mt-1">{L.hhiHint}</p>
                    </div>
                    {/* 风险-收益散点：各权重方案 (年化波动率, 组合夏普)，虚线示有效前沿 */}
                    <div className="mt-3">
                      <div className="text-xs font-medium text-slate-500">{L.rrTitle}</div>
                      {(() => {
                        const schemes = [
                          { label: L.hhiEqual, w: Array.from({ length: items.length }, () => 1 / items.length), color: "#64748b" },
                          { label: L.ivSharpeLabel, w: ivWeights, color: "#10b981" },
                          { label: L.rpSharpeLabel, w: rpWeights, color: "#0ea5e9" },
                          { label: L.optSharpeLabel, w: optWeights, color: "#6366f1" },
                          { label: L.mvSharpeLabel, w: mvWeights, color: "#f59e0b" },
                        ].filter((s) => Array.isArray(s.w) && s.w.length > 0);
                        const pts = riskRewardPoints(returnsList, vols, M, schemes);
                        if (pts.length === 0) return <p className="text-xs text-slate-400">{L.rrEmpty}</p>;
                        // 有效前沿：在「最小方差↔最大夏普」之间插值，取非支配点画实线
                        const frontier = efficientFrontier(returnsList, vols, M, { nPoints: 15 });
                        const frontierPts = frontier.points.filter((p) => p.efficient);
                        const allPts = [...pts, ...frontierPts];
                        const W = 560, H = 260, padL = 44, padR = 16, padT = 16, padB = 36;
                        const pw = W - padL - padR, ph = H - padT - padB;
                        const maxVol = Math.max(...allPts.map((p) => p.vol)) * 1.1 || 1;
                        const shs = allPts.map((p) => p.sharpe);
                        const minSh = Math.min(...shs), maxSh = Math.max(...shs);
                        const shRange = maxSh - minSh;
                        const yPad = shRange > 0 ? shRange * 0.15 : Math.max(Math.abs(maxSh) * 0.15, 0.1);
                        const yMin = minSh - yPad, yMax = maxSh + yPad;
                        const xOf = (v) => padL + (v / maxVol) * pw;
                        const yOf = (s) => padT + ph - ((s - yMin) / (yMax - yMin || 1)) * ph;
                        const frLine = [...frontierPts].sort((a, b) => a.vol - b.vol).map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.vol).toFixed(1)},${yOf(p.sharpe).toFixed(1)}`).join(" ");
                        const gridY = [0, 0.5, 1].map((t) => yMin + t * (yMax - yMin));
                        return (
                          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxWidth: 560 }}>
                            {gridY.map((gy, i) => (
                              <g key={i}>
                                <line x1={padL} y1={yOf(gy)} x2={W - padR} y2={yOf(gy)} stroke="#e2e8f0" strokeWidth={1} />
                                <text x={padL - 4} y={yOf(gy) + 3} textAnchor="end" fill="#94a3b8" style={{ fontSize: 9 }}>{gy.toFixed(1)}</text>
                              </g>
                            ))}
                            <line x1={padL} y1={padT} x2={padL} y2={padT + ph} stroke="#cbd5e1" strokeWidth={1} />
                            <line x1={padL} y1={padT + ph} x2={W - padR} y2={padT + ph} stroke="#cbd5e1" strokeWidth={1} />
                            {frontierPts.length > 1 && (
                              <g>
                                <path d={frLine} fill="none" stroke="#10b981" strokeWidth={2} />
                                <text x={W - padR} y={padT + 2} textAnchor="end" fill="#10b981" style={{ fontSize: 9 }}>{L.rrFrontier}</text>
                              </g>
                            )}
                            {pts.map((p, i) => (
                              <g key={i}>
                                <circle cx={xOf(p.vol)} cy={yOf(p.sharpe)} r={5} fill={schemes[i].color} stroke="#fff" strokeWidth={1.5} />
                                <text x={xOf(p.vol) + 8} y={yOf(p.sharpe) + 3} fill="#475569" style={{ fontSize: 9 }}>{schemes[i].label}</text>
                              </g>
                            ))}
                            <text x={padL + pw / 2} y={H - 4} textAnchor="middle" fill="#94a3b8" style={{ fontSize: 9 }}>{L.rrVol}</text>
                            <text x={12} y={padT + ph / 2} textAnchor="middle" transform={`rotate(-90 12 ${padT + ph / 2})`} fill="#94a3b8" style={{ fontSize: 9 }}>{L.rrSharpe}</text>
                          </svg>
                        );
                      })()}
                      <p className="text-xs text-slate-400 mt-1">{L.rrHint}</p>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "多策略对比",
  subtitle: "同一市场 · 默认参数 · 横向对比所有策略",
  market: "市场",
  run: "开始对比",
  running: "计算中…",
  hint: "用默认参数，同一市场预设下比较",
  start: "点击“开始对比”查看各策略绩效对比",
  metric: "指标",
  corrTitle: "相关性热力图",
  corrNote: "各策略权益曲线日收益的两两相关系数（+1 完全正相关=分散差；−1 完全负相关=分散好；近 0=独立）。示例数据，非投资建议。",
  drLabel: "分散化比率",
  drHint: "=1 完全相关(无收益)，>1 越大越分散",
  portSharpeLabel: "等权组合夏普",
  portVolLabel: "波动",
  ivSharpeLabel: "逆波动夏普",
  rpSharpeLabel: "风险平价夏普",
  rpTitle: "风险平价权重",
  optSharpeLabel: "最优夏普",
  optTitle: "最优权重（切点组合）",
  mvSharpeLabel: "最小方差夏普",
  vtLabel: "波动率目标化（缩放风险平价）",
  vtResult: "目标化后 →",
  vtSharpe: "夏普",
  vtNa: "需 ≥2 个策略且有有效风险平价权重",
  mvTitle: "最小方差权重",
  rcTitle: "各资产风险贡献（逆波动加权）",
  hhiTitle: "集中度（HHI · 等效资产数）",
  hhiEqual: "等权",
  hhiUnit: " 个",
  hhiHint: "HHI = Σwᵢ²，越大越集中；等效资产数 = 1/HHI，越接近资产总数越分散。",
  rrTitle: "风险-收益散点（波动率 vs 夏普）",
  rrFrontier: "有效前沿",
  rrVol: "年化波动率 σ (%)",
  rrSharpe: "组合夏普",
  rrHint: "越靠左上越优（低波动、高夏普）；绿色实线为有效前沿（最小方差↔最大夏普间的非支配点），圆点为各权重方案。",
  rrEmpty: "数据不足，无法绘图",
  note: "★ 为该指标最优策略。示例数据，结果不代表未来表现。",
};
const en = {
  title: "Strategy Comparison",
  subtitle: "Same market · default params · compare all strategies",
  market: "Market",
  run: "Compare",
  running: "Running…",
  hint: "Default params, same market preset",
  start: "Click “Compare” to compare strategy performance",
  metric: "Metric",
  corrTitle: "Correlation Heatmap",
  corrNote: "Pairwise correlation of strategies' daily returns (+1 fully correlated = poor diversification; −1 fully anti-correlated = good diversification; ~0 independent). Demo data, not investment advice.",
  drLabel: "Diversification Ratio",
  drHint: "=1 fully correlated (no benefit); higher = more diversified",
  portSharpeLabel: "Equal-weight Sharpe",
  portVolLabel: "Vol",
  ivSharpeLabel: "Inv-Vol Sharpe",
  rpSharpeLabel: "Risk-Parity Sharpe",
  rpTitle: "Risk-Parity Weights",
  optSharpeLabel: "Optimal Sharpe",
  optTitle: "Optimal Weights (Tangency Portfolio)",
  mvSharpeLabel: "Min-Variance Sharpe",
  vtLabel: "Vol Targeting (scale risk-parity)",
  vtResult: "Targeted →",
  vtSharpe: "Sharpe",
  vtNa: "needs ≥2 strategies with valid risk-parity weights",
  mvTitle: "Min-Variance Weights",
  rcTitle: "Risk Contribution (inv-vol weighted)",
  hhiTitle: "Concentration (HHI · eff. assets)",
  hhiEqual: "Equal",
  hhiUnit: "",
  hhiHint: "HHI = Σwᵢ², higher = more concentrated; eff. assets = 1/HHI, closer to N = more diversified.",
  rrTitle: "Risk-Reward scatter (vol vs Sharpe)",
  rrFrontier: "Efficient frontier",
  rrVol: "Annualized vol σ (%)",
  rrSharpe: "Portfolio Sharpe",
  rrHint: "Top-left is best (low vol, high Sharpe); the green line is the efficient frontier (non-dominated points between min-variance and max-Sharpe); dots are the weight schemes.",
  rrEmpty: "Not enough data",
  note: "★ = best strategy for this metric. Demo data; results don't imply future performance.",
};

