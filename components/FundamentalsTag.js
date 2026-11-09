// components/FundamentalsTag.js — 基本面快照标签（客户端，带缓存去重 + 诚实标注）
// 调用 /api/marketdata?symbol=X&includeFundamentals=true，展示 PE/PB/ROE/市值/股息率。
// 仿 PriceTag：模块级缓存、live=false 时显式标「演示」、绝不捏造——数据缺失即隐藏。
"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { summarizeFundamentals } from "../lib/fundamentals";

// 模块级缓存：同一 symbol 只请求一次，避免重复打 API
const cache = new Map();

export default function FundamentalsTag({ symbol }) {
  const { lang } = useLanguage();
  const [fund, setFund] = useState(() => (symbol && cache.get(symbol)) || null);

  useEffect(() => {
    if (!symbol || symbol === "—" || cache.get(symbol)) {
      setFund(cache.get(symbol) || null);
      return;
    }
    let cancelled = false;
    fetch(`/api/marketdata?symbol=${encodeURIComponent(symbol)}&includeFundamentals=true`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        const entry = data && data.fundamentals ? data.fundamentals : null;
        if (entry) cache.set(symbol, entry);
        if (!cancelled) setFund(entry);
      })
      .catch(() => {
        if (!cancelled) setFund(null);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const L = lang === "en" ? en : zh;
  const summary = summarizeFundamentals(fund, lang);
  // 数据缺失（未返回 / 全空）即隐藏，绝不展示空壳
  if (!summary) return null;

  return (
    <div
      className="mt-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
      aria-label={`${L.title} ${summary.symbol}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">{summary.symbol}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] ${summary.live ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
          title={summary.live ? L.liveTitle : L.demoTitle}
        >
          {summary.live ? L.live : L.demo}
        </span>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
        {summary.items.map((it) => (
          <div key={it.label} className="flex justify-between">
            <dt className="text-slate-500">{it.label}</dt>
            <dd className="font-mono text-slate-800">{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const zh = {
  title: "基本面",
  live: "实时",
  demo: "演示",
  liveTitle: "实时基本面（Alpha Vantage OVERVIEW）",
  demoTitle: "演示数据：未配置 API key，仅供示意",
};
const en = {
  title: "Fundamentals",
  live: "Live",
  demo: "Demo",
  liveTitle: "Live fundamentals (Alpha Vantage OVERVIEW)",
  demoTitle: "Demo data: no API key configured, illustrative only",
};
