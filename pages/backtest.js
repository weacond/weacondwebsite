"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { STRATEGY_REGISTRY } from "../lib/backtest";
import { PRESET_MARKETS, generateMockCandles, runFullBacktest } from "../lib/marketdata";

export const metadata = {
  title: "策略回测 — Weacond",
  description: "策略回测引擎，支持多策略、蒙特卡洛模拟、完整绩效指标",
  robots: { index: true, follow: true },
};

const METRIC_KEYS = [
  { key: "totalReturn", label: "总收益", labelEn: "Total Return", fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%`, good: (v) => v > 0 },
  { key: "cagr", label: "年化收益", labelEn: "CAGR", fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`, good: (v) => v > 0 },
  { key: "sharpe", label: "夏普比率", labelEn: "Sharpe", fmt: (v) => v.toFixed(2), good: (v) => v > 1 },
  { key: "sortino", label: "索提诺", labelEn: "Sortino", fmt: (v) => v.toFixed(2), good: (v) => v > 1 },
  { key: "maxDrawdown", label: "最大回撤", labelEn: "Max DD", fmt: (v) => `-${v.toFixed(1)}%`, good: (v) => v < 20 },
  { key: "winRate", label: "胜率", labelEn: "Win Rate", fmt: (v) => `${v.toFixed(1)}%`, good: (v) => v > 50 },
  { key: "profitFactor", label: "盈亏比", labelEn: "Profit Factor", fmt: (v) => v.toFixed(2), good: (v) => v > 1 },
  { key: "numTrades", label: "交易次数", labelEn: "Trades", fmt: (v) => v.toString(), good: () => true },
  { key: "exposure", label: "持仓暴露", labelEn: "Exposure", fmt: (v) => `${v.toFixed(0)}%`, good: () => true },
  { key: "calmar", label: "卡玛比率", labelEn: "Calmar", fmt: (v) => v.toFixed(2), good: (v) => v > 1 },
  { key: "volatility", label: "年化波动", labelEn: "Volatility", fmt: (v) => `${v.toFixed(1)}%`, good: () => true },
];

export default function BacktestPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [strategyKey, setStrategyKey] = useState("ma_cross");
  const [preset, setPreset] = useState("SPY_2023");
  const [params, setParams] = useState({});
  const [config, setConfig] = useState({ initialCapital: 100000, commission: 0.001, slippage: 0.0005, maxPositionPct: 0.25 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTrades, setShowTrades] = useState(false);
  const chartRef = useRef(null);
  const strategies = useMemo(() => Object.entries(STRATEGY_REGISTRY), []);

  const handleParamChange = (key, val) => setParams((p) => ({ ...p, [key]: Number(val) }));

  const runTest = () => {
    setLoading(true); setError(""); setResult(null);
    try { setResult(runFullBacktest({ strategy: strategyKey, params, config, preset })); }
    catch (e) { setError(e.message || "Backtest failed"); }
    setLoading(false);
  };

  useEffect(() => {
    if (!result?.equityCurve || !chartRef.current) return;
    drawEquityCurve(result.equityCurve, chartRef.current, config.initialCapital);
  }, [result, config.initialCapital]);
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* 策略选择 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 md:col-span-1">
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-400">{L.strategy}</h3>
              <div className="space-y-2">
                {strategies.map(([key, def]) => (
                  <button key={key} onClick={() => { setStrategyKey(key); const d = {}; def.params?.forEach((p) => (d[p.key] = p.default)); setParams(d); setPreset("SPY_2023"); }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${strategyKey === key ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 hover:border-indigo-200"}`}>
                    <div className="font-medium text-sm">{lang === "en" ? def.nameEn : def.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{lang === "en" ? def.descriptionEn : def.description}</div>
                  </button>
                ))}
              </div>
            </div>
            {/* 市场+参数 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 md:col-span-1">
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-400">{L.market}</h3>
              <select value={preset} onChange={(e) => setPreset(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mb-4">
                {Object.entries(PRESET_MARKETS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
              </select>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-400">{L.params}</h3>
              <div className="space-y-3">
                {STRATEGY_REGISTRY[strategyKey]?.params?.map((p) => (
                  <div key={p.key}>
                    <label className="flex justify-between text-sm mb-1">
                      <span>{p.label}</span>
                      <span className="text-indigo-600 font-mono">{params[p.key] ?? p.default}</span>
                    </label>
                    <input type="range" min={p.min} max={p.max} step={p.step || 1} value={params[p.key] ?? p.default}
                      onChange={(e) => handleParamChange(p.key, e.target.value)} className="w-full accent-indigo-600" />
                  </div>
                ))}
              </div>
              <h3 className="font-semibold mt-4 mb-3 text-sm uppercase tracking-wider text-slate-400">{L.riskParams}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-500">{L.capital}</label>
                  <input type="number" value={config.initialCapital} onChange={(e) => setConfig((c) => ({ ...c, initialCapital: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-sm" /></div>
                <div><label className="text-xs text-slate-500">{L.commission}</label>
                  <input type="number" step="0.0001" value={config.commission} onChange={(e) => setConfig((c) => ({ ...c, commission: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-sm" /></div>
                <div><label className="text-xs text-slate-500">{L.slippage}</label>
                  <input type="number" step="0.0001" value={config.slippage} onChange={(e) => setConfig((c) => ({ ...c, slippage: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-sm" /></div>
                <div><label className="text-xs text-slate-500">{L.positionPct}</label>
                  <input type="number" step="0.05" value={config.maxPositionPct} onChange={(e) => setConfig((c) => ({ ...c, maxPositionPct: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-sm" /></div>
              </div>
              <button onClick={runTest} disabled={loading} className="mt-6 w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50">
                {loading ? L.running : L.run}
              </button>
            </div>
            {/* 指标 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 md:col-span-1">
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-400">{L.metrics}</h3>
              {result ? (
                <div className="grid grid-cols-2 gap-3">
                  {METRIC_KEYS.map((m) => (
                    <div key={m.key} className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-400">{lang === "en" ? m.labelEn : m.label}</div>
                      <div className={`font-bold text-lg mt-0.5 ${m.good(result.metrics[m.key]) ? "text-green-600" : "text-red-500"}`}>
                        {m.fmt(result.metrics[m.key])}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (<p className="text-slate-400 text-sm">{L.noResult}</p>)}
            </div>
          </div>

          {/* 权益曲线 */}
          {result && result.equityCurve.length > 1 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{L.equityCurve}</h3>
                <button onClick={() => setShowTrades(!showTrades)} className="text-sm text-indigo-600 hover:underline">
                  {showTrades ? L.hideTrades : L.showTrades}
                </button>
              </div>
              <svg ref={chartRef} className="w-full h-64" viewBox="0 0 800 256" preserveAspectRatio="none" />
              <div className="flex gap-6 mt-3 text-xs text-slate-400">
                <span>{L.startDate}: {result.candles.startDate}</span>
                <span>{L.endDate}: {result.candles.endDate}</span>
                <span>{L.candles}: {result.candles.count}</span>
                <span>{L.strategy}: {result.strategyName}</span>
              </div>
            </div>
          )}
          {/* 交易明细 */}
          {result && showTrades && result.trades.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
              <h3 className="font-semibold mb-4">{L.tradeLog}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left border-b">
                    <th className="pb-2 pr-4 text-slate-400 font-medium">#</th>
                    <th className="pb-2 pr-4 text-slate-400 font-medium">{L.entryDate}</th>
                    <th className="pb-2 pr-4 text-slate-400 font-medium">{L.exitDate}</th>
                    <th className="pb-2 pr-4 text-slate-400 font-medium">{L.entryPrice}</th>
                    <th className="pb-2 pr-4 text-slate-400 font-medium">{L.exitPrice}</th>
                    <th className="pb-2 pr-4 text-slate-400 font-medium">{L.pnl}</th>
                    <th className="pb-2 pr-4 text-slate-400 font-medium">{L.holdDays}</th>
                  </tr></thead>
                  <tbody>
                    {result.trades.slice(0, 30).map((t, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 pr-4 text-slate-400">{i + 1}</td>
                        <td className="py-2 pr-4">{t.entryDate?.slice(0, 10)}</td>
                        <td className="py-2 pr-4">{t.exitDate?.slice(0, 10)}</td>
                        <td className="py-2 pr-4 font-mono">{t.entryPrice?.toFixed(2)}</td>
                        <td className="py-2 pr-4 font-mono">{t.exitPrice?.toFixed(2)}</td>
                        <td className={`py-2 pr-4 font-mono font-semibold ${t.pnl > 0 ? "text-green-600" : "text-red-500"}`}>
                          {t.pnl > 0 ? "+" : ""}{t.pnl.toFixed(0)}
                        </td>
                        <td className="py-2 pr-4 text-slate-500">{t.holdDays}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.trades.length > 30 && (
                  <p className="text-xs text-slate-400 mt-3">...{result.trades.length - 30} {L.moreTrades}</p>
                )}
              </div>
            </div>
          )}
          {/* 蒙特卡洛 */}
          {result?.monteCarlo && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
              <h3 className="font-semibold mb-4">{L.monteCarlo}</h3>
              <div className="grid grid-cols-5 gap-4">
                {[[L.p5, result.monteCarlo.p5], [L.p1, result.monteCarlo.p1], [L.median, result.monteCarlo.median], [L.p95, result.monteCarlo.p95], [L.p99, result.monteCarlo.p99]].map(([label, value]) => (
                  <div key={label} className="text-center">
                    <div className="text-xs text-slate-400">{label}</div>
                    <div className={`font-bold text-lg ${value > 0 ? "text-green-600" : "text-red-500"}`}>
                      {value > 0 ? "+" : ""}{value}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 假设披露（合规） */}
          {result && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-sm text-amber-800">
              <p className="font-semibold mb-1">{L.assumptions}</p>
              <p>{L.commission}: {(config.commission * 100).toFixed(3)}% | {L.slippage}: {(config.slippage * 100).toFixed(3)}% | {L.capital}: ${config.initialCapital.toLocaleString()}</p>
              <p className="mt-2 text-xs text-amber-600 italic">{L.disclaimer}</p>
            </div>
          )}
          {error && (<div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm">{error}</div>)}
        </div>
      </section>
    </div>
  );
}

/** 纯 SVG 绘制权益曲线 */
function drawEquityCurve(curve, svgEl, initialCapital) {
  if (!svgEl) return;
  const w = 800, h = 256, pad = 30;
  const values = curve.map((c) => c.value);
  const min = Math.min(...values, initialCapital);
  const max = Math.max(...values, initialCapital);
  const range = max - min || 1;
  const points = curve.map((c, i) => {
    const x = pad + (i / (curve.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((c.value - min) / range) * (h - 2 * pad);
    return `${x},${y}`;
  });
  const baseY = h - pad - ((initialCapital - min) / range) * (h - 2 * pad);
  const linePath = points.join(" ");
  const areaPath = `${pad},${h - pad} ${linePath} ${w - pad},${h - pad}`;
  svgEl.innerHTML = `<defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgb(99,102,241)" stop-opacity="0.3"/><stop offset="100%" stop-color="rgb(99,102,241)" stop-opacity="0.02"/></linearGradient></defs>
    <line x1="${pad}" y1="${baseY}" x2="${w - pad}" y2="${baseY}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4,4"/>
    <text x="${pad + 4}" y="${baseY - 6}" fill="#94a3b8" font-size="10">${initialCapital.toLocaleString()}</text>
    <polygon points="${areaPath}" fill="url(#eqGrad)"/>
    <polyline points="${linePath}" fill="none" stroke="#6366f1" stroke-width="2" stroke-linejoin="round"/>`;
}

const zh = {
  title: "策略回测", subtitle: "选择策略、配置参数、运行回测、查看绩效指标与权益曲线",
  strategy: "选择策略", market: "市场数据", params: "策略参数", riskParams: "风控参数",
  capital: "初始资金", commission: "佣金率", slippage: "滑点率", positionPct: "最大仓位%",
  run: "运行回测", running: "运行中...", metrics: "绩效指标", noResult: "选择策略并点击「运行回测」",
  equityCurve: "权益曲线", showTrades: "查看交易明细", hideTrades: "隐藏交易明细",
  tradeLog: "交易记录", entryDate: "入场日", exitDate: "出场日", entryPrice: "入场价", exitPrice: "出场价",
  pnl: "盈亏", holdDays: "持仓天数", moreTrades: "更多交易未显示",
  monteCarlo: "蒙特卡洛模拟 (500次)", p5: "5%分位", p1: "1%分位", median: "中位数", p95: "95%分位", p99: "99%分位",
  assumptions: "回测假设", startDate: "起始", endDate: "结束", candles: "K线数",
  disclaimer: "回测结果不代表未来表现。模拟数据用于演示，不构成投资建议。",
};
const en = {
  title: "Strategy Backtest", subtitle: "Select strategy, configure parameters, run backtest, view metrics",
  strategy: "Strategy", market: "Market Data", params: "Parameters", riskParams: "Risk Parameters",
  capital: "Initial Capital", commission: "Commission", slippage: "Slippage", positionPct: "Max Position %",
  run: "Run Backtest", running: "Running...", metrics: "Performance", noResult: "Select strategy and click Run",
  equityCurve: "Equity Curve", showTrades: "Show Trades", hideTrades: "Hide Trades",
  tradeLog: "Trade Log", entryDate: "Entry", exitDate: "Exit", entryPrice: "Entry", exitPrice: "Exit",
  pnl: "P&L", holdDays: "Days", moreTrades: "more trades hidden",
  monteCarlo: "Monte Carlo (500 runs)", p5: "5th Pct", p1: "1st Pct", median: "Median", p95: "95th Pct", p99: "99th Pct",
  assumptions: "Assumptions", startDate: "Start", endDate: "End", candles: "Candles",
  disclaimer: "Past performance does not guarantee future results. Simulated data for demo only. Not investment advice.",
};

