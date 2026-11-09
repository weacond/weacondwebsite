"use client";

// pages/watchlist.js — 收藏标的页
// 用 localStorage（lib/watchlist.js）持久化，响应式渲染；每个标的可一键跳转回测 / AI。

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import WatchlistButton from "../components/WatchlistButton";
import { useWatchlist } from "../lib/watchlist";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";

export default function WatchlistPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const { list, count, toggle } = useWatchlist();
  const sorted = [...list].sort();

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
            <span className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full">
              {count} {lang === "en" ? "watched" : "个标的"}
            </span>
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
            <div className="space-y-3">
              {sorted.map((t) => (
                <div
                  key={t}
                  className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-100 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">{t}</span>
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
  note: "Your watchlist is stored locally in your browser and never uploaded.",
};
