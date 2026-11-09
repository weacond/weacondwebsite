// lib/watchlist.js — 本地收藏（watchlist）
// 纯前端、零密钥：用 localStorage 持久化用户收藏的标的。
// 提供 useWatchlist 钩子（useSyncExternalStore）让任意客户端组件响应式读写。
// SSR 安全：服务端 getServerSnapshot 返回 []，避免 hydration 不一致。

import React from "react";

const KEY = "weacond_watchlist";
const listeners = new Set();
let cache = null;

function read() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? [...new Set(arr.map((x) => String(x).toUpperCase()))] : [];
  } catch {
    return [];
  }
}

function write(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* 忽略存储异常（隐私模式等） */
  }
  cache = list;
  listeners.forEach((l) => l());
}

function getSnapshot() {
  if (typeof window === "undefined") {
    cache = [];
    return cache;
  }
  if (cache === null) cache = read();
  return cache;
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function toggle(ticker) {
  const t = String(ticker || "").toUpperCase().trim();
  if (!t) return getSnapshot();
  const cur = getSnapshot();
  const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
  write(next);
  return next;
}

// 跨标签页同步
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

/**
 * 响应式 watchlist 钩子
 * @returns {{ list: string[], has: (t:string)=>boolean, toggle: (t:string)=>void, count: number }}
 */
export function useWatchlist() {
  const list = React.useSyncExternalStore(subscribe, getSnapshot, () => []);
  const up = (t) => String(t || "").toUpperCase().trim();
  return {
    list,
    count: list.length,
    has: (t) => list.includes(up(t)),
    toggle: (t) => toggle(t),
  };
}
