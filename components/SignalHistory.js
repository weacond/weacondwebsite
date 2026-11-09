"use client";

import { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";

/**
 * 信号历史时间线 + 按标的筛选（client 组件）。
 * @param {Array} history  buildSignalHistory() 输出（新→旧）
 */
export default function SignalHistory({ history }) {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [filter, setFilter] = useState("ALL");

  const symbols = Array.from(new Set(history.map((h) => h.symbol))).sort();
  const filtered = filter === "ALL" ? history : history.filter((h) => h.symbol === filter);

  const wins = filtered.filter((h) => h.win).length;
  const hitRate = filtered.length ? wins / filtered.length : 0;
  const avgRet = filtered.length ? filtered.reduce((s, h) => s + h.ret, 0) / filtered.length : 0;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{L.title}</h2>
        {/* 按标的筛选 */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            aria-pressed={filter === "ALL"}
            onClick={() => setFilter("ALL")}
            className={`text-xs px-2.5 py-1 rounded-full ${filter === "ALL" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
          >
            {L.all}
          </button>
          {symbols.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={filter === s}
              onClick={() => setFilter(s)}
              className={`text-xs px-2.5 py-1 rounded-full ${filter === s ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 命中统计（随筛选变化） */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
          <div className="text-2xl font-bold">{filtered.length}</div>
          <div className="text-xs text-slate-400">{L.signals}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
          <div className="text-2xl font-bold text-green-600">{Math.round(hitRate * 100)}%</div>
          <div className="text-xs text-slate-400">{L.hitRate}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-100 text-center">
          <div className={"text-2xl font-bold " + (avgRet >= 0 ? "text-green-600" : "text-red-500")}>{avgRet.toFixed(1)}%</div>
          <div className="text-xs text-slate-400">{L.avgRet}</div>
        </div>
      </div>

      {/* 时间线 */}
      <div className="space-y-2">
        {filtered.map((h) => (
          <div key={h.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-100 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-xs w-14">{h.date.slice(5)}</span>
              <span className="font-semibold">{h.symbol}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{h.type}</span>
              <span className="text-xs text-slate-400">{h.strength} {L.score}</span>
            </div>
            <span className={"font-semibold " + (h.win ? "text-green-600" : "text-red-500")}>
              {h.win ? "+" : ""}{h.ret}%
            </span>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center text-slate-400 text-sm py-6">{L.empty}</div>}
      </div>

      <p className="text-xs text-slate-400 mt-3 text-center">{L.disclaimer}</p>
    </div>
  );
}

const zh = {
  title: "近 30 日信号历史",
  all: "全部",
  signals: "信号数",
  hitRate: "命中率",
  avgRet: "平均收益",
  score: "分",
  empty: "该标的近 30 日无信号",
  disclaimer: "事后收益为回测近似；演示数据，非投资建议。",
};
const en = {
  title: "Last 30 Days of Signals",
  all: "All",
  signals: "Signals",
  hitRate: "Hit Rate",
  avgRet: "Avg Return",
  score: "",
  empty: "No signals for this symbol in the last 30 days",
  disclaimer: "Returns are backtest approximations; demo data, not investment advice.",
};
