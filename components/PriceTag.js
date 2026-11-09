// components/PriceTag.js — 现价标签（客户端，带缓存去重 + 诚实标注）
// 调用 /api/marketdata 取最新收盘价；无真实行情源时优雅降级为演示并明确标注「演示」。
// 绝不捏造：live=false 时显式显示「演示」，让访客知道这是演示数据。
"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";

// 模块级缓存：同一 symbol 只请求一次，避免信号页多卡片重复打 API
const cache = new Map();

export default function PriceTag({ symbol }) {
  const { lang } = useLanguage();
  const [state, setState] = useState(() => (symbol && cache.get(symbol)) || null);

  useEffect(() => {
    if (!symbol || symbol === "—" || cache.get(symbol)) {
      setState(cache.get(symbol) || null);
      return;
    }
    let cancelled = false;
    fetch(`/api/marketdata?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        const candles = data.candles || [];
        const last = candles[candles.length - 1];
        const price = last ? last.close : null;
        const entry = { price, live: Boolean(data.live) };
        if (price != null) cache.set(symbol, entry);
        if (!cancelled) setState(entry);
      })
      .catch(() => {
        if (!cancelled) setState({ price: null, live: false, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (!state || state.error || state.price == null || Number.isNaN(state.price)) return null;

  const L = lang === "en" ? en : zh;
  const isLive = state.live;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${isLive ? "text-green-600" : "text-slate-400"}`}
      title={isLive ? L.liveTitle : L.demoTitle}
    >
      <span className="font-mono">${Number(state.price).toFixed(2)}</span>
      <span className={`px-1 py-0.5 rounded text-[10px] ${isLive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
        {isLive ? L.live : L.demo}
      </span>
    </span>
  );
}

const zh = {
  live: "实时",
  demo: "演示",
  liveTitle: "实时行情（Alpha Vantage）",
  demoTitle: "演示数据：未接真实行情源，价格仅供示意",
};
const en = {
  live: "Live",
  demo: "Demo",
  liveTitle: "Live market data (Alpha Vantage)",
  demoTitle: "Demo data: no live source connected, price is illustrative",
};