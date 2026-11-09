"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import { usePaper } from "../lib/paper";
import Head from "next/head";
import Link from "next/link";

export const metadata = {
  title: "模拟交易 — Weacond",
  description: "零风险练习交易，模拟真实市场，验证策略有效性",
  robots: { index: false },
};

export default function PaperPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [tab, setTab] = useState("positions");
  const { positions, trades, openPosition, closePosition, realizedPnl, totalPnl } = usePaper();
  const [form, setForm] = useState({ ticker: "", name: "", qty: "1", entry: "" });

  const submitOrder = (e) => {
    e.preventDefault();
    openPosition({ ticker: form.ticker, name: form.name, qty: Number(form.qty), entry: Number(form.entry) });
    setForm({ ticker: "", name: "", qty: "1", entry: "" });
    setTab("positions");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{L.title}</h1>
              <p className="text-slate-500">{L.subtitle}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">{L.balance}</div>
              <div className="text-2xl font-bold text-green-600">$105,870</div>
              <div className={`text-xs mt-1 ${totalPnl >= 0 ? "text-green-600" : "text-red-500"}`}>{L.floatPnl} {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(0)}</div>
              <div className={`text-xs ${realizedPnl >= 0 ? "text-green-600" : "text-red-500"}`}>{L.realizedPnl} {realizedPnl >= 0 ? "+" : ""}${realizedPnl.toFixed(0)}</div>
            </div>
          </div>
          <div className="flex gap-4 mb-6 border-b">
            {[["positions", L.positions], ["history", L.history], ["watchlist", L.watchlist]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`pb-2 px-2 text-sm font-medium ${tab === key ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400 hover:text-slate-600"}`}>
                {label}
              </button>
            ))}
          </div>
          {tab === "positions" && (
            <div className="space-y-6">
              <form onSubmit={submitOrder} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{L.ticker}</label>
                  <input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                    placeholder="TSLA" required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{L.qty}</label>
                  <input value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })}
                    type="number" min="1" required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{L.entry}</label>
                  <input value={form.entry} onChange={(e) => setForm({ ...form, entry: e.target.value })}
                    type="number" step="0.01" min="0.01" placeholder="0.00" required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <button type="submit"
                  className="bg-indigo-600 text-white text-sm font-medium rounded-lg py-2 px-4 hover:bg-indigo-700 transition-colors">
                  {L.openPosition}
                </button>
              </form>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold mb-4">{L.currentPositions}</h3>
                {positions.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">{L.noPositions}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left border-b">
                        <th className="pb-2 pr-4 text-slate-400">{L.ticker}</th>
                        <th className="pb-2 pr-4 text-slate-400">{L.name}</th>
                        <th className="pb-2 pr-4 text-slate-400">{L.qty}</th>
                        <th className="pb-2 pr-4 text-slate-400">{L.entry}</th>
                        <th className="pb-2 pr-4 text-slate-400">{L.current}</th>
                        <th className="pb-2 pr-4 text-slate-400">{L.pnl}</th>
                        <th className="pb-2 pr-4 text-slate-400">{L.action}</th>
                      </tr></thead>
                      <tbody>
                        {positions.map((h) => {
                          const pnl = (h.current - h.entry) * h.qty;
                          const pnlPct = ((h.current - h.entry) / h.entry * 100).toFixed(2);
                          return (
                            <tr key={h.id} className="border-b border-slate-50">
                              <td className="py-2 pr-4 font-bold">{h.ticker}</td>
                              <td className="py-2 pr-4 text-slate-500">{h.name}</td>
                              <td className="py-2 pr-4">{h.qty}</td>
                              <td className="py-2 pr-4 font-mono">${h.entry}</td>
                              <td className="py-2 pr-4 font-mono">${h.current}</td>
                              <td className={`py-2 pr-4 font-mono font-semibold ${pnl > 0 ? "text-green-600" : "text-red-500"}`}>
                                {pnl > 0 ? "+" : ""}${pnl.toFixed(0)} ({pnlPct}%)
                              </td>
                              <td className="py-2 pr-4">
                                <button onClick={() => closePosition(h.id)}
                                  className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline">{L.sell}</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          {tab === "history" && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold mb-4">{L.closedTrades}</h3>
              {trades.length === 0 ? (
                <div className="text-center text-slate-400 py-8">{L.noHistory}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left border-b">
                      <th className="pb-2 pr-4 text-slate-400">{L.ticker}</th>
                      <th className="pb-2 pr-4 text-slate-400">{L.entry}</th>
                      <th className="pb-2 pr-4 text-slate-400">{L.exit}</th>
                      <th className="pb-2 pr-4 text-slate-400">{L.qty}</th>
                      <th className="pb-2 pr-4 text-slate-400">{L.pnl}</th>
                      <th className="pb-2 pr-4 text-slate-400">{L.closeDate}</th>
                    </tr></thead>
                    <tbody>
                      {trades.map((t) => (
                        <tr key={t.id} className="border-b border-slate-50">
                          <td className="py-2 pr-4 font-bold">{t.ticker}</td>
                          <td className="py-2 pr-4 font-mono">${t.entry}</td>
                          <td className="py-2 pr-4 font-mono">${t.exit}</td>
                          <td className="py-2 pr-4">{t.qty}</td>
                          <td className={`py-2 pr-4 font-mono font-semibold ${t.pnl > 0 ? "text-green-600" : "text-red-500"}`}>
                            {t.pnl > 0 ? "+" : ""}${t.pnl.toFixed(0)} ({t.pnlPct.toFixed(2)}%)
                          </td>
                          <td className="py-2 pr-4 text-slate-400">{t.closeDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {tab === "watchlist" && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold mb-4">{L.watchlist}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["SPY", "QQQ", "AAPL", "NVDA", "TSLA", "MSFT"].map((t) => (
                  <div key={t} className="p-3 bg-slate-50 rounded-lg text-center">
                    <div className="font-bold">{t}</div>
                    <div className="text-xs text-slate-400">{L.simulated}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="mt-6 text-center text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
    </div>
  );
}

const zh = {
  title: "模拟交易", subtitle: "零风险练习，验证策略前先在模拟盘验证",
  balance: "账户余额", floatPnl: "浮动盈亏", realizedPnl: "已实现盈亏",
  positions: "持仓", history: "历史", watchlist: "观察列表",
  currentPositions: "当前持仓", ticker: "代码", name: "名称", qty: "数量",
  entry: "成本价", current: "现价", exit: "卖出价", pnl: "盈亏", action: "操作",
  openPosition: "开仓", sell: "平仓", noPositions: "暂无持仓，可在上方开仓",
  closedTrades: "已平仓交易", noHistory: "暂无历史记录", closeDate: "平仓日",
  simulated: "模拟价格",
  disclaimer: "模拟交易不构成投资建议。实际交易结果可能与模拟不同。",
};
const en = {
  title: "Paper Trading", subtitle: "Practice with zero risk. Validate strategies before going live.",
  balance: "Account Balance", floatPnl: "Unrealized P&L", realizedPnl: "Realized P&L",
  positions: "Positions", history: "History", watchlist: "Watchlist",
  currentPositions: "Current Positions", ticker: "Ticker", name: "Name", qty: "Qty",
  entry: "Entry", current: "Current", exit: "Exit", pnl: "P&L", action: "Action",
  openPosition: "Open", sell: "Close", noPositions: "No open positions — place an order above",
  closedTrades: "Closed Trades", noHistory: "No history yet", closeDate: "Closed",
  simulated: "Simulated",
  disclaimer: "Paper trading does not constitute investment advice. Actual results may differ.",
};

