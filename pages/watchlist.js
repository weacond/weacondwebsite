"use client";

// pages/watchlist.js — 收藏标的页
// 用 localStorage（lib/watchlist.js）持久化，响应式渲染；每个标的可一键跳转回测 / AI。

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import WatchlistButton from "../components/WatchlistButton";
import { useWatchlist } from "../lib/watchlist";
import { useLanguage } from "../contexts/LanguageContext";
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";

export default function WatchlistPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const { list, count, toggle } = useWatchlist();
  const sorted = [...list].sort();
  const [prices, setPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [pricesLive, setPricesLive] = useState(null);
  const [loadError, setLoadError] = useState(false);

  // 为每个收藏标的拉最新行情（/api/marketdata）；无 key 时接口返回演示数据并标 live:false
  const loadPrices = async () => {
    if (!sorted.length) return;
    setLoadingPrices(true);
    setLoadError(false);
    try {
      const results = await Promise.all(sorted.map(async (sym) => {
        try {
          const res = await fetch(`/api/marketdata?symbol=${encodeURIComponent(sym)}&interval=Daily&months=1`);
          if (!res.ok) return null;
          const data = await res.json();
          const c = data.candles || [];
          const last = c[c.length - 1];
          const prev = c[c.length - 2];
          if (!last || !last.close) return null;
          const price = Number(last.close);
          const change = prev ? ((price - Number(prev.close)) / Number(prev.close)) * 100 : 0;
          return { symbol: sym, price, change, live: !!data.live };
        } catch {
          return null;
        }
      }));
      const map = {};
      let anyLive = false;
      results.filter(Boolean).forEach((r) => { map[r.symbol] = r; if (r.live) anyLive = true; });
      setPrices(map);
      setPricesLive(anyLive);
      if (results.every((r) => r === null)) setLoadError(true); // 全部失败 → 触发重试提示
    } catch {
      setLoadError(true);
    } finally {
      setLoadingPrices(false);
    }
  };

  useEffect(() => {
    loadPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.join(",")]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
        {/* 个人化收藏页（localStorage），不应被搜索引擎收录 */}
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">{L.title}</h1>
              <p className="text-slate-500 text-sm mt-1">{L.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadPrices}
                disabled={loadingPrices}
                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loadingPrices ? "…" : L.refresh}
              </button>
              <span className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full">
                {count} {lang === "en" ? "watched" : "个标的"}
              </span>
            </div>
          </div>

          {count === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center border border-slate-100">
              <p className="text-slate-500 mb-4">{L.empty}</p>
              <Link
                href="/signals"
                className="inline-block bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-500 transition-colors"
              >
                {L.goSignals}
              </Link>
            </div>
          ) : (
            <>
              {loadError && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
                  <span className="text-sm text-amber-700">{L.loadError}</span>
                  <button type="button" onClick={loadPrices}
                    className="text-xs bg-amber-600 text-white px-3 py-1 rounded-full hover:bg-amber-700 transition-colors">{L.retry}</button>
                </div>
              )}
              {loadingPrices && Object.keys(prices).length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: sorted.length }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-5 bg-slate-200 rounded animate-pulse" />
                        <div className="w-20 h-4 bg-slate-100 rounded animate-pulse" />
                      </div>
                      <div className="flex gap-2">
                        <div className="w-12 h-6 bg-slate-100 rounded animate-pulse" />
                        <div className="w-12 h-6 bg-slate-100 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {sorted.map((t) => (
                <div
                  key={t}
                  className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-100 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">{t}</span>
                    {prices[t] && (
                      <span className="text-sm font-mono text-slate-500">
                        ${prices[t].price.toFixed(2)}
                        <span className={`ml-1 ${prices[t].change >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {prices[t].change >= 0 ? "+" : ""}{prices[t].change.toFixed(2)}%
                        </span>
                      </span>
                    )}
                    <WatchlistButton ticker={t} compact />
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Link
                      href={`/backtest?symbol=${encodeURIComponent(t)}`}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      {L.backtest}
                    </Link>
                    <Link
                      href="/ai"
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                    >
                      {L.ai}
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggle(t)}
                      className="px-3 py-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      title={L.remove}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                  ))}
                </div>
              )}
            </>
          )}

          {count > 0 && pricesLive !== null && (
            <p className={`text-xs mt-4 text-center ${pricesLive ? "text-green-600" : "text-amber-600"}`}>
              {pricesLive ? L.liveNote : L.demoNote}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-6 text-center">{L.note}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "我的收藏",
  subtitle: "你标记的标的 · 本地存储 · 一键回测 / AI 解读",
  empty: "还没有收藏。去信号页点 ☆ 添加感兴趣的标的。",
  goSignals: "去信号页",
  backtest: "回测",
  ai: "AI 解读",
  remove: "移除",
  refresh: "刷新行情",
  liveNote: "现价为实时行情（Alpha Vantage）",
  demoNote: "现价为演示数据（未配置 API key）",
  loadError: "行情加载失败，请重试",
  retry: "重试",
  note: "收藏保存在你的浏览器本地，不会上传服务器。",
};
const en = {
  title: "My Watchlist",
  subtitle: "Your starred symbols · stored locally · one-click backtest / AI",
  empty: "Nothing saved yet. Go to Signals and tap ☆ to add symbols.",
  goSignals: "Go to Signals",
  backtest: "Backtest",
  ai: "AI",
  remove: "Remove",
  refresh: "Refresh",
  liveNote: "Prices are live (Alpha Vantage)",
  demoNote: "Prices are demo data (no API key configured)",
  loadError: "Failed to load prices, please retry",
  retry: "Retry",
  note: "Your watchlist is stored locally in your browser and never uploaded.",
};
