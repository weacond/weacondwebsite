"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FundamentalsTag from "../components/FundamentalsTag";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { STRATEGY_REGISTRY, histogram } from "../lib/backtest";
import { PRESET_MARKETS, generateMockCandles, runFullBacktest } from "../lib/marketdata";
import { riskProfileFromEquity, kellyFraction, fractionalKelly, riskBudget } from "../lib/risk.js";

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
  { key: "payoffRatio", label: "盈亏Payoff", labelEn: "Payoff", fmt: (v) => v.toFixed(2), good: (v) => v > 1 },
  { key: "numTrades", label: "交易次数", labelEn: "Trades", fmt: (v) => v.toString(), good: () => true },
  { key: "exposure", label: "持仓暴露", labelEn: "Exposure", fmt: (v) => `${v.toFixed(0)}%`, good: () => true },
  { key: "calmar", label: "卡玛比率", labelEn: "Calmar", fmt: (v) => v.toFixed(2), good: (v) => v > 1 },
  { key: "volatility", label: "年化波动", labelEn: "Volatility", fmt: (v) => `${v.toFixed(1)}%`, good: () => true },
  { key: "ulcerIndex", label: "溃疡指数", labelEn: "Ulcer", fmt: (v) => `${(v * 100).toFixed(1)}%`, good: () => true },
  { key: "omegaRatio", label: "欧米伽", labelEn: "Omega", fmt: (v) => v.toFixed(2), good: (v) => v > 1 },
  { key: "tailRatio", label: "尾部比率", labelEn: "Tail Ratio", fmt: (v) => v.toFixed(2), good: (v) => v > 1 },
];

// 全策略对比的排序选项标签
const SORT_LABELS = {
  zh: { sharpe: "夏普比率", cagr: "年化收益", sortino: "索提诺", maxDrawdown: "最大回撤", winRate: "胜率", profitFactor: "盈亏比", calmar: "卡玛比率" },
  en: { sharpe: "Sharpe", cagr: "CAGR", sortino: "Sortino", maxDrawdown: "Max DD", winRate: "Win Rate", profitFactor: "Profit Factor", calmar: "Calmar" },
};

export default function BacktestPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const router = useRouter();
  const symbolFromQuery = router?.query?.symbol ? String(router.query.symbol).toUpperCase() : "";
  const [strategyKey, setStrategyKey] = useState("ma_cross");
  const [preset, setPreset] = useState("SPY_2023");
  const [realSymbol, setRealSymbol] = useState(symbolFromQuery || "SPY");
  const [params, setParams] = useState({});
  const [config, setConfig] = useState({ initialCapital: 100000, commission: 0.001, slippage: 0.0005, maxPositionPct: 0.25 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTrades, setShowTrades] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [compareSort, setCompareSort] = useState("sharpe");
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareInfo, setCompareInfo] = useState(null);
  const chartRef = useRef(null);
  const strategies = useMemo(() => Object.entries(STRATEGY_REGISTRY), []);

  const handleParamChange = (key, val) => setParams((p) => ({ ...p, [key]: Number(val) }));

  const runTest = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      if (preset === "REAL") {
        const sym = (realSymbol || "SPY").toUpperCase().trim();
        if (!sym) throw new Error(lang === "en" ? "Enter a ticker first" : "请先输入股票代码");
        const res = await fetch(`/api/marketdata?symbol=${encodeURIComponent(sym)}`);
        if (!res.ok) throw new Error(`${lang === "en" ? "Market API returned" : "行情接口返回"} ${res.status}`);
        const data = await res.json();
        const candles = data.candles || [];
        if (!candles.length) throw new Error(lang === "en" ? "No K-line data returned" : "未获取到 K 线数据");
        setResult(runFullBacktest({ strategy: strategyKey, params, config, preset: "REAL", candles, dataSource: data.live ? "live" : "demo" }));
        return;
      }
      setResult(runFullBacktest({ strategy: strategyKey, params, config, preset }));
    } catch (e) {
      setError(e.message || "Backtest failed");
    } finally {
      setLoading(false);
    }
  };

  // 取行情：REAL 走 /api/marketdata，preset 生成模拟（只取一次，供对比复用）
  const getMarketCandles = async () => {
    if (preset === "REAL") {
      const sym = (realSymbol || "SPY").toUpperCase().trim();
      if (!sym) throw new Error(lang === "en" ? "Enter a ticker first" : "请先输入股票代码");
      const res = await fetch(`/api/marketdata?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error(`${lang === "en" ? "Market API returned" : "行情接口返回"} ${res.status}`);
      const data = await res.json();
      const candles = data.candles || [];
      if (!candles.length) throw new Error(lang === "en" ? "No K-line data returned" : "未获取到 K 线数据");
      return { candles, dataSource: data.live ? "live" : "demo" };
    }
    const presetConfig = PRESET_MARKETS[preset]?.config || PRESET_MARKETS.SPY_2023.config;
    return { candles: generateMockCandles(presetConfig), dataSource: "demo" };
  };

  // 同一市场跑全部策略，按所选指标排行
  const runComparison = async () => {
    setLoadingCompare(true); setComparison(null); setCompareInfo(null);
    try {
      const { candles, dataSource } = await getMarketCandles();
      const rows = strategies.map(([key, def]) => {
        const p = {};
        def.params?.forEach((pp) => { p[pp.key] = pp.default; });
        const r = runFullBacktest({ strategy: key, params: p, config, candles, dataSource });
        return {
          key,
          name: lang === "en" ? def.nameEn : def.name,
          totalReturn: r.totalReturn, cagr: r.cagr, sharpe: r.sharpe, sortino: r.sortino,
          maxDrawdown: r.maxDrawdown, winRate: r.winRate, profitFactor: r.profitFactor,
          numTrades: r.numTrades, calmar: r.calmar, volatility: r.volatility,
        };
      });
      setComparison(rows);
      setCompareInfo({ dataSource, count: candles.length, label: PRESET_MARKETS[preset]?.label || "Real data" });
    } catch (e) {
      setError(e.message || (lang === "en" ? "Comparison failed" : "对比失败"));
    } finally {
      setLoadingCompare(false);
    }
  };

  // 排行：多数指标越高越好，回撤/波动越低越好
  const sortedComparison = comparison
    ? [...comparison].sort((a, b) => {
        const higherBetter = { sharpe: 1, cagr: 1, sortino: 1, winRate: 1, profitFactor: 1, calmar: 1, totalReturn: 1 };
        return higherBetter[compareSort] ? b[compareSort] - a[compareSort] : a[compareSort] - b[compareSort];
      })
    : null;

  // 部署到模拟盘的目标标的：REAL 用输入 ticker，preset 取前缀（SPY_2023 → SPY）
  const deployTicker = preset === "REAL" ? (realSymbol || "SPY").toUpperCase() : (preset.split("_")[0] || "SPY");

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
          {symbolFromQuery && (
            <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-800">
              {lang === "en" ? "Backtesting for " : "为 "}
              <b>{symbolFromQuery}</b>
              {lang === "en" ? " · demo data (from signal)" : " · 来自信号页的示例回测"}
            </div>
          )}
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
                <option value="REAL">{lang === "en" ? "Real data (Alpha Vantage)" : "真实行情（Alpha Vantage）"}</option>
                {Object.entries(PRESET_MARKETS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
              </select>
              {preset === "REAL" && (
                <div className="mb-4">
                  <label htmlFor="bt-realticker" className="text-xs text-slate-500">{lang === "en" ? "Ticker" : "股票代码"}</label>
                  <input
                    id="bt-realticker"
                    value={realSymbol}
                    onChange={(e) => setRealSymbol(e.target.value.toUpperCase())}
                    placeholder="SPY"
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono mt-1"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === "en"
                      ? "Live when API key is configured, otherwise demo data. No key = illustrative prices."
                      : "配置 API key 时为实时行情，否则为演示数据（无 key 即示意价格）。"}
                  </p>
                </div>
              )}
              {preset === "REAL" && <FundamentalsTag symbol={realSymbol} />}
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-slate-400">{L.params}</h3>
              <div className="space-y-3">
                {STRATEGY_REGISTRY[strategyKey]?.params?.map((p) => (
                  <div key={p.key}>
                    <label htmlFor={`bt-param-${p.key}`} className="flex justify-between text-sm mb-1">
                      <span>{p.label}</span>
                      <span className="text-indigo-600 font-mono">{params[p.key] ?? p.default}</span>
                    </label>
                    <input id={`bt-param-${p.key}`} type="range" min={p.min} max={p.max} step={p.step || 1} value={params[p.key] ?? p.default}
                      onChange={(e) => handleParamChange(p.key, e.target.value)} className="w-full accent-indigo-600" />
                  </div>
                ))}
              </div>
              <h3 className="font-semibold mt-4 mb-3 text-sm uppercase tracking-wider text-slate-400">{L.riskParams}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="bt-capital" className="text-xs text-slate-500">{L.capital}</label>
                  <input id="bt-capital" type="number" value={config.initialCapital} onChange={(e) => setConfig((c) => ({ ...c, initialCapital: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-sm" /></div>
                <div><label htmlFor="bt-commission" className="text-xs text-slate-500">{L.commission}</label>
                  <input id="bt-commission" type="number" step="0.0001" value={config.commission} onChange={(e) => setConfig((c) => ({ ...c, commission: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-sm" /></div>
                <div><label htmlFor="bt-slippage" className="text-xs text-slate-500">{L.slippage}</label>
                  <input id="bt-slippage" type="number" step="0.0001" value={config.slippage} onChange={(e) => setConfig((c) => ({ ...c, slippage: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-sm" /></div>
                <div><label htmlFor="bt-positionpct" className="text-xs text-slate-500">{L.positionPct}</label>
                  <input id="bt-positionpct" type="number" step="0.05" value={config.maxPositionPct} onChange={(e) => setConfig((c) => ({ ...c, maxPositionPct: Number(e.target.value) }))} className="w-full px-2 py-1.5 border rounded text-sm" /></div>
              </div>
              <button onClick={runTest} disabled={loading} className="mt-6 w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50">
                {loading ? L.running : L.run}
              </button>
              <button onClick={runComparison} disabled={loadingCompare} className="mt-2 w-full bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50">
                {loadingCompare ? L.comparing : L.compareAll}
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
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-red-400"></span>
                  {L.drawdownOverlay}
                </span>
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
          {result?.monteCarlo &&
            (() => {
              const mc = result.monteCarlo;
              const dist = Array.isArray(mc.distribution) ? mc.distribution : [];
              const h = histogram(dist, 20);
              const W = 600;
              const H = 140;
              const pad = 4;
              const hasBars = h.bins.length > 0 && h.maxCount > 0;
              const bw = hasBars ? W / h.bins.length : 0;
              // 中位数在 x 轴上的位置（分布值小数 → 百分比，再映射到 [0,W]）
              const medianPct = (mc.median || 0);
              const rangeMin = h.min * 100;
              const rangeMax = h.max * 100;
              const medianX =
                hasBars && rangeMax > rangeMin
                  ? ((medianPct - rangeMin) / (rangeMax - rangeMin)) * W
                  : W / 2;
              return (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
                  <h3 className="font-semibold mb-4">{L.monteCarlo}</h3>
                  <div className="grid grid-cols-5 gap-4">
                    {[[L.p5, mc.p5], [L.p1, mc.p1], [L.median, mc.median], [L.p95, mc.p95], [L.p99, mc.p99]].map(([label, value]) => (
                      <div key={label} className="text-center">
                        <div className="text-xs text-slate-400">{label}</div>
                        <div className={`font-bold text-lg ${value > 0 ? "text-green-600" : "text-red-500"}`}>
                          {value > 0 ? "+" : ""}{value}%
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasBars ? (
                    <>
                      <div className="text-xs text-slate-400 mt-4 mb-1">{L.distTitle}</div>
                      <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="w-full"
                        preserveAspectRatio="none"
                        role="img"
                        aria-label="Monte Carlo distribution histogram"
                        style={{ height: H }}
                      >
                        {h.bins.map((b, i) => {
                          const bh = (b.count / h.maxCount) * (H - pad * 2);
                          const x = i * bw;
                          const y = H - pad - bh;
                          const neg = b.lo < 0;
                          return (
                            <rect
                              key={i}
                              x={x + 0.5}
                              y={y}
                              width={Math.max(0.5, bw - 1)}
                              height={bh}
                              fill={neg ? "#ef4444" : "#10b981"}
                              opacity={0.75}
                            />
                          );
                        })}
                        {/* 中位数标记线 */}
                        <line
                          x1={medianX}
                          y1={pad}
                          x2={medianX}
                          y2={H - pad}
                          stroke="#64748b"
                          strokeWidth={1}
                          strokeDasharray="4 3"
                        />
                      </svg>
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>{rangeMin.toFixed(1)}%</span>
                        <span>
                          {L.medianLine} {medianPct > 0 ? "+" : ""}{medianPct}%
                        </span>
                        <span>{rangeMax.toFixed(1)}%</span>
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })()}
          {/* 风险剖面（VaR / CVaR / 最大回撤，由权益曲线日收益计算） */}
          {result?.equityCurve &&
            (() => {
              const rp = riskProfileFromEquity(result.equityCurve);
              if (!rp) return null;
              const recovery = result.metrics?.recoveryPeriods;
              const maxStreak = result.metrics?.maxLosingStreak ?? 0;
              const maxWin = result.metrics?.maxWinStreak ?? 0;
              return (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
                  <h3 className="font-semibold mb-4">{L.riskProfile}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-8 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-slate-400">{L.var95}</div>
                      <div className="font-bold text-lg text-red-500">−{(rp.var * 100).toFixed(2)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">{L.cvar95}</div>
                      <div className="font-bold text-lg text-red-500">−{(rp.cvar * 100).toFixed(2)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">{L.mdd}</div>
                      <div className="font-bold text-lg text-red-500">−{(rp.mdd * 100).toFixed(2)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">{L.recoveryDays}</div>
                      <div className="font-bold text-lg">{recovery != null ? recovery : L.notRecovered}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">{L.streaks}</div>
                      <div className="font-bold text-lg">
                        <span className="text-green-600">{maxWin}</span>
                        <span className="text-slate-300"> / </span>
                        <span className="text-red-500">{maxStreak}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">{L.obsPeriods}</div>
                      <div className="font-bold text-lg">{rp.n}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">{L.kurtosis}</div>
                      <div className="font-bold text-lg">{rp.kurtosis.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">{L.skewness}</div>
                      <div className="font-bold text-lg">{rp.skewness.toFixed(2)}</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">{L.riskProfileHint}</p>
                </div>
              );
            })()}

          {/* 仓位建议 (Kelly 最优 / 半凯利) */}
          {result?.metrics && result.metrics.trades > 0 && result.metrics.avgWin > 0 && result.metrics.avgLoss > 0 &&
            (() => {
              const m = result.metrics;
              const full = kellyFraction(m.winRate / 100, m.avgWin, m.avgLoss);
              const half = fractionalKelly(m.winRate / 100, 0.5, m.avgWin, m.avgLoss);
              // VaR 风险预算：以组合 95% 日 VaR 作每单位 VaR，1% 日亏上限下的名义仓位
              const varBudget = m.var95 ? Math.min(1, riskBudget(Math.abs(m.var95), 0.01)) : 0;
              return (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
                  <h3 className="font-semibold mb-4">{L.kellyTitle}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-slate-400">{L.kellyFull}</div>
                      <div className="font-bold text-lg text-indigo-600">{(full * 100).toFixed(1)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">{L.kellyHalf}</div>
                      <div className="font-bold text-lg text-indigo-600">{(half * 100).toFixed(1)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">{L.varBudget}</div>
                      <div className="font-bold text-lg text-indigo-600">{(varBudget * 100).toFixed(1)}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">{L.winLossRatio}</div>
                      <div className="font-bold text-lg">{(m.avgWin / m.avgLoss).toFixed(2)}</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">{L.kellyHint}</p>
                </div>
              );
            })()}

          {/* 全策略对比 */}
          {sortedComparison && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-semibold">{L.comparison}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{L.sortBy}</span>
                  <select value={compareSort} onChange={(e) => setCompareSort(e.target.value)} className="px-2 py-1 border rounded text-xs">
                    {["sharpe", "cagr", "sortino", "maxDrawdown", "winRate", "profitFactor", "calmar"].map((k) => (
                      <option key={k} value={k}>{SORT_LABELS[lang][k]}</option>
                    ))}
                  </select>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${compareInfo?.dataSource === "live" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {compareInfo?.dataSource === "live" ? (lang === "en" ? "Live" : "实时") : (lang === "en" ? "Demo" : "演示")} · {compareInfo?.count} {L.candles}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b text-slate-400">
                      <th className="pb-2 pr-3 font-medium">{lang === "en" ? "# / Strategy" : "# / 策略"}</th>
                      <th className="pb-2 pr-3 font-medium">{SORT_LABELS[lang].cagr}</th>
                      <th className="pb-2 pr-3 font-medium">{SORT_LABELS[lang].sharpe}</th>
                      <th className="pb-2 pr-3 font-medium">{SORT_LABELS[lang].maxDrawdown}</th>
                      <th className="pb-2 pr-3 font-medium">{SORT_LABELS[lang].winRate}</th>
                      <th className="pb-2 pr-3 font-medium">{SORT_LABELS[lang].profitFactor}</th>
                      <th className="pb-2 pr-3 font-medium">{lang === "en" ? "Trades" : "交易"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedComparison.map((row, i) => (
                      <tr key={row.key} className={`border-b border-slate-50 ${i === 0 ? "bg-green-50 font-semibold" : "hover:bg-slate-50"}`}>
                        <td className="py-2 pr-3">{i + 1}. {row.name}{i === 0 && " 🏆"}</td>
                        <td className="py-2 pr-3 font-mono">{row.cagr > 0 ? "+" : ""}{row.cagr.toFixed(1)}%</td>
                        <td className="py-2 pr-3 font-mono">{row.sharpe.toFixed(2)}</td>
                        <td className="py-2 pr-3 font-mono text-red-500">-{row.maxDrawdown.toFixed(1)}%</td>
                        <td className="py-2 pr-3 font-mono">{row.winRate.toFixed(0)}%</td>
                        <td className="py-2 pr-3 font-mono">{row.profitFactor.toFixed(2)}</td>
                        <td className="py-2 pr-3 font-mono text-slate-500">{row.numTrades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-3">{L.comNote}</p>
            </div>
          )}
          {/* 部署到模拟盘（回测→纸面闭环） */}
          {result && (
            <div className="flex items-center justify-between flex-wrap gap-3 bg-indigo-50 rounded-xl p-4 border border-indigo-100 mb-8">
              <div className="text-sm text-indigo-800">
                {lang === "en" ? "Validate on paper first:" : "先在模拟盘验证："} <b>{deployTicker}</b> · {L.deployNote}
              </div>
              <Link href={`/paper?symbol=${encodeURIComponent(deployTicker)}`}
                className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 whitespace-nowrap">
                {L.deployToPaper} →
              </Link>
            </div>
          )}
          {/* 假设披露（合规） */}
          {result && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-sm text-amber-800">
              <p className="font-semibold mb-1">{L.assumptions}</p>
              <p className="mb-1">
                <b>{result.dataSource === "live"
                  ? (lang === "en" ? "Data source: LIVE (Alpha Vantage)" : "数据来源：实时行情（Alpha Vantage）")
                  : (lang === "en" ? "Data source: DEMO / illustrative" : "数据来源：演示 / 示意数据")}</b>
                · {result.marketLabel}
              </p>
              <p>{L.commission}: {(config.commission * 100).toFixed(3)}% | {L.slippage}: {(config.slippage * 100).toFixed(3)}% | {L.capital}: ${config.initialCapital.toLocaleString()}</p>
              <p className="mt-2 text-xs text-amber-600 italic">{L.disclaimer}</p>
            </div>
          )}
          {error && (<div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm">{error}</div>)}
        </div>
      </section>
      <Footer />
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
  // 回撤叠加：运行峰值线 + 曲线与峰值之间的"水下"红色填充
  let peak = -Infinity;
  const peakPoints = curve.map((c, i) => {
    if (c.value > peak) peak = c.value;
    const x = pad + (i / (curve.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((peak - min) / range) * (h - 2 * pad);
    return `${x},${y}`;
  });
  const underwater = `${peakPoints.join(" ")} ${[...points].reverse().join(" ")}`;
  const peakLine = peakPoints.join(" ");
  svgEl.innerHTML = `<defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgb(99,102,241)" stop-opacity="0.3"/><stop offset="100%" stop-color="rgb(99,102,241)" stop-opacity="0.02"/></linearGradient></defs>
    <line x1="${pad}" y1="${baseY}" x2="${w - pad}" y2="${baseY}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4,4"/>
    <text x="${pad + 4}" y="${baseY - 6}" fill="#94a3b8" font-size="10">${initialCapital.toLocaleString()}</text>
    <polygon points="${areaPath}" fill="url(#eqGrad)"/>
    <polygon points="${underwater}" fill="rgb(239,68,68)" fill-opacity="0.12"/>
    <polyline points="${peakLine}" fill="none" stroke="rgb(239,68,68)" stroke-width="1" stroke-dasharray="3,3" stroke-opacity="0.5"/>
    <polyline points="${linePath}" fill="none" stroke="#6366f1" stroke-width="2" stroke-linejoin="round"/>`;
}

const zh = {
  title: "策略回测", subtitle: "选择策略、配置参数、运行回测、查看绩效指标与权益曲线",
  strategy: "选择策略", market: "市场数据", params: "策略参数", riskParams: "风控参数",
  capital: "初始资金", commission: "佣金率", slippage: "滑点率", positionPct: "最大仓位%",
  run: "运行回测", running: "运行中...", compareAll: "对比全部策略", comparing: "对比中...",
  comparison: "全策略对比", sortBy: "排序", comNote: "按所选指标排行；🏆 为该项最优。模拟数据，仅供参考，不构成投资建议。",
  metrics: "绩效指标", noResult: "选择策略并点击「运行回测」",
  equityCurve: "权益曲线", showTrades: "查看交易明细", hideTrades: "隐藏交易明细",
  tradeLog: "交易记录", entryDate: "入场日", exitDate: "出场日", entryPrice: "入场价", exitPrice: "出场价",
  pnl: "盈亏", holdDays: "持仓天数", moreTrades: "更多交易未显示",
  monteCarlo: "蒙特卡洛模拟 (500次)", p5: "5%分位", p1: "1%分位", median: "中位数", p95: "95%分位", p99: "99%分位",
  distTitle: "收益分布直方图", medianLine: "中位",
  riskProfile: "风险剖面", var95: "95% VaR", cvar95: "95% CVaR", mdd: "最大回撤", streaks: "连盈/连亏", maxStreak: "最长连亏", obsPeriods: "观测期数", kurtosis: "超额峰度", skewness: "偏度",
  recoveryDays: "回撤恢复(期)", notRecovered: "未恢复", drawdownOverlay: "回撤(水下)",
  riskProfileHint: "VaR/CVaR 由权益曲线日收益的历史分位估计；CVaR 为超过 VaR 的尾部平均损失。非实时，非投资建议。",
  kellyTitle: "仓位建议 (Kelly)", kellyFull: "凯利最优", kellyHalf: "半凯利", winLossRatio: "盈亏比", varBudget: "VaR 风险预算",
  kellyHint: "基于本策略回测的胜率与盈亏比：f* = 胜率 −(1−胜率)×(亏/盈)。满凯利风险大，半凯利更稳健。非投资建议。",
  assumptions: "回测假设", startDate: "起始", endDate: "结束", candles: "K线数",
  deployToPaper: "部署到模拟盘", deployNote: "用 0 风险先验证策略",
  disclaimer: "回测结果不代表未来表现。模拟数据用于演示，不构成投资建议。",
};
const en = {
  title: "Strategy Backtest", subtitle: "Select strategy, configure parameters, run backtest, view metrics",
  strategy: "Strategy", market: "Market Data", params: "Parameters", riskParams: "Risk Parameters",
  capital: "Initial Capital", commission: "Commission", slippage: "Slippage", positionPct: "Max Position %",
  run: "Run Backtest", running: "Running...", compareAll: "Compare all strategies", comparing: "Comparing...",
  comparison: "Strategy Comparison", sortBy: "Sort by", comNote: "Ranked by selected metric; 🏆 is best on that metric. Simulated data, for reference only. Not investment advice.",
  metrics: "Performance", noResult: "Select strategy and click Run",
  equityCurve: "Equity Curve", showTrades: "Show Trades", hideTrades: "Hide Trades",
  tradeLog: "Trade Log", entryDate: "Entry", exitDate: "Exit", entryPrice: "Entry", exitPrice: "Exit",
  pnl: "P&L", holdDays: "Days", moreTrades: "more trades hidden",
  monteCarlo: "Monte Carlo (500 runs)", p5: "5th Pct", p1: "1st Pct", median: "Median", p95: "95th Pct", p99: "99th Pct",
  distTitle: "Return Distribution", medianLine: "Median",
  riskProfile: "Risk Profile", var95: "95% VaR", cvar95: "95% CVaR", mdd: "Max Drawdown", streaks: "Win/Loss Streak", maxStreak: "Max Loss Streak", obsPeriods: "Obs.", kurtosis: "Excess Kurtosis", skewness: "Skewness",
  recoveryDays: "DD Recovery", notRecovered: "not rec.", drawdownOverlay: "Drawdown",
  riskProfileHint: "VaR/CVaR estimated from historical daily-return percentiles of the equity curve; CVaR is the average tail loss beyond VaR. Not live, not advice.",
  kellyTitle: "Position Sizing (Kelly)", kellyFull: "Full Kelly", kellyHalf: "Half Kelly", winLossRatio: "Win/Loss", varBudget: "VaR Budget",
  kellyHint: "From backtest win rate & payoff ratio: f* = p − (1−p)×(loss/win). Full Kelly is aggressive; half Kelly is safer. Not advice.",
  assumptions: "Assumptions", startDate: "Start", endDate: "End", candles: "Candles",
  deployToPaper: "Deploy to Paper", deployNote: "validate the strategy risk-free",
  disclaimer: "Past performance does not guarantee future results. Simulated data for demo only. Not investment advice.",
};

