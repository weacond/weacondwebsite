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

// 对比用指标（higher=true 表示越大越好；maxDrawdown 越小越好）
const CMP_METRICS = [
  { key: "totalReturn", label: "总收益", labelEn: "Total Return", fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`, higher: true },
  { key: "cagr", label: "年化", labelEn: "CAGR", fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`, higher: true },
  { key: "sharpe", label: "夏普", labelEn: "Sharpe", fmt: (v) => v.toFixed(2), higher: true },
  { key: "sortino", label: "索提诺", labelEn: "Sortino", fmt: (v) => v.toFixed(2), higher: true },
  { key: "maxDrawdown", label: "最大回撤", labelEn: "Max DD", fmt: (v) => `-${v.toFixed(1)}%`, higher: false },
  { key: "winRate", label: "胜率", labelEn: "Win Rate", fmt: (v) => `${v.toFixed(0)}%`, higher: true },
  { key: "profitFactor", label: "盈亏比", labelEn: "Profit Factor", fmt: (v) => v.toFixed(2), higher: true },
  { key: "calmar", label: "卡玛", labelEn: "Calmar", fmt: (v) => v.toFixed(2), higher: true },
  { key: "numTrades", label: "交易数", labelEn: "Trades", fmt: (v) => v.toString(), higher: false },
];

const DEFAULT_CONFIG = { initialCapital: 100000, commission: 0.001, slippage: 0.0005, maxPositionPct: 0.25 };

export default function ComparePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [preset, setPreset] = useState("SPY_2023");
  const [results, setResults] = useState(null);
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
    let best = null;
    let bestKey = null;
    for (const r of results) {
      const v = r.result?.[metric.key];
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
              <label className="block text-xs text-slate-500 mb-1">{L.market}</label>
              <select value={preset} onChange={(e) => setPreset(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
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
                          const v = r.result?.[m.key];
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
  note: "★ = best strategy for this metric. Demo data; results don't imply future performance.",
};

