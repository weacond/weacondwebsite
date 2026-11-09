"use client";

// components/WatchlistButton.js — 收藏/取消收藏标的的星标按钮
// 响应式（useWatchlist）+ 双语；点击切换 localStorage 中的 watchlist。

import { useLanguage } from "../contexts/LanguageContext";
import { useWatchlist } from "../lib/watchlist";

export default function WatchlistButton({ ticker, compact = false }) {
  const { lang } = useLanguage();
  const { has, toggle } = useWatchlist();
  const saved = has(ticker);

  const title = saved
    ? lang === "en"
      ? "Remove from watchlist"
      : "从收藏移除"
    : lang === "en"
    ? "Add to watchlist"
    : "加入收藏";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(ticker);
      }}
      title={title}
      aria-label={title}
      aria-pressed={saved}
      className={`transition-colors ${
        compact ? "text-sm" : "text-base"
      } ${saved ? "text-yellow-400 hover:text-yellow-500" : "text-slate-300 hover:text-slate-400"}`}
    >
      {saved ? "★" : "☆"}
      {!compact && (
        <span className="ml-1 text-xs font-normal text-slate-400">
          {lang === "en" ? "Watchlist" : "收藏"}
        </span>
      )}
    </button>
  );
}
