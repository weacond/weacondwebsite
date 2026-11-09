// lib/paper.js — 本地模拟交易（paper trading）
// 纯前端、零密钥：用 localStorage 持久化持仓 + 已平仓交易。
// 提供 usePaper 钩子（useSyncExternalStore），让任意客户端组件响应式读写。
// SSR 安全：服务端 getServerSnapshot 返回默认演示持仓 / 空历史，避免 hydration 不一致。

import React from "react";

const POS_KEY = "weacond_paper_positions";
const TRADES_KEY = "weacond_paper_trades";
const listeners = new Set();
let posCache = null;
let tradesCache = null;

// 默认演示持仓（首次使用、localStorage 为空时；保证 SSR 与首次 CSR 一致）
const DEFAULT_POSITIONS = [
  { id: "demo-nvda", ticker: "NVDA", name: "NVIDIA", qty: 10, entry: 128.5, current: 142.3, date: "2024-11-01" },
  { id: "demo-aapl", ticker: "AAPL", name: "Apple", qty: 5, entry: 195.2, current: 201.8, date: "2024-11-05" },
];

function readPositions() {
  if (typeof window === "undefined") return DEFAULT_POSITIONS;
  try {
    const raw = window.localStorage.getItem(POS_KEY);
    if (!raw) return DEFAULT_POSITIONS; // 首次使用 → 演示持仓
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : DEFAULT_POSITIONS;
  } catch {
    return DEFAULT_POSITIONS;
  }
}

function readTrades() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRADES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function writePositions(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(POS_KEY, JSON.stringify(list));
  } catch {
    /* 忽略存储异常（隐私模式等） */
  }
  posCache = list;
  notify();
}

function writeTrades(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRADES_KEY, JSON.stringify(list));
  } catch {
    /* 忽略存储异常（隐私模式等） */
  }
  tradesCache = list;
  notify();
}

function getPosSnapshot() {
  if (typeof window === "undefined") return DEFAULT_POSITIONS;
  if (posCache === null) posCache = readPositions();
  return posCache;
}

function getTradesSnapshot() {
  if (typeof window === "undefined") return [];
  if (tradesCache === null) tradesCache = readTrades();
  return tradesCache;
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// 开仓
export function openPosition({ ticker, name, qty, entry, current }) {
  const t = String(ticker || "").toUpperCase().trim();
  const q = Number(qty);
  const e = Number(entry);
  if (!t || !q || q <= 0 || !e || e <= 0) return;
  const cur = readPositions();
  const id = "p-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
  const next = [
    ...cur,
    { id, ticker: t, name: name || t, qty: q, entry: e, current: Number(current) || e, date: new Date().toISOString().slice(0, 10) },
  ];
  writePositions(next);
}

// 平仓（卖出某笔持仓 → 记入已平仓交易，含实现盈亏）
export function closePosition(id) {
  const cur = readPositions();
  const pos = cur.find((p) => p.id === id);
  if (!pos) return;
  const next = cur.filter((p) => p.id !== id);
  writePositions(next);
  const pnl = (pos.current - pos.entry) * pos.qty;
  const pnlPct = ((pos.current - pos.entry) / pos.entry) * 100;
  const trades = readTrades();
  const closed = {
    id: "t-" + Date.now(),
    ticker: pos.ticker,
    name: pos.name,
    qty: pos.qty,
    entry: pos.entry,
    exit: pos.current,
    pnl,
    pnlPct,
    openDate: pos.date,
    closeDate: new Date().toISOString().slice(0, 10),
    win: pnl > 0,
  };
  writeTrades([closed, ...trades]);
}

// 盯市：用最新价（来自 /api/marketdata）更新各持仓现价，使浮动盈亏真实化
export function markPositions(priceMap = {}) {
  if (typeof window === "undefined") return;
  const cur = readPositions();
  if (!cur.length) return;
  const next = cur.map((p) => (priceMap[p.ticker] != null ? { ...p, current: Number(priceMap[p.ticker]) } : p));
  const changed = next.some((p, i) => p.current !== cur[i].current);
  if (changed) writePositions(next);
}

// 跨标签页同步
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === POS_KEY) posCache = null;
    if (e.key === TRADES_KEY) tradesCache = null;
    notify();
  });
}

/**
 * 响应式模拟盘钩子。
 * @returns {{ positions:Array, trades:Array, openPosition:Function, closePosition:Function, realizedPnl:number, totalPnl:number }}
 */
export function usePaper() {
  const positions = React.useSyncExternalStore(subscribe, getPosSnapshot, () => DEFAULT_POSITIONS);
  const trades = React.useSyncExternalStore(subscribe, getTradesSnapshot, () => []);
  const realizedPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const totalPnl = positions.reduce((s, p) => s + (p.current - p.entry) * p.qty, 0);
  return { positions, trades, openPosition, closePosition, realizedPnl, totalPnl };
}
