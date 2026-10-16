"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";

export const metadata = {
  title: "模拟交易 — Weacond",
  description: "零风险练习交易，模拟真实市场，验证策略有效性",
  robots: { index: false },
};

const DEMO_HOLDINGS = [
  { ticker: "NVDA", name: "NVIDIA", qty: 10, entry: 128.5, current: 142.3, date: "2024-11-01" },
  { ticker: "AAPL", name: "Apple", qty: 5, entry: 195.2, current: 201.8, date: "2024-11-05" },
];

export default function PaperPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [tab, setTab] = useState("positions");

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
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold mb-4">{L.currentPositions}</h3>
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
                    {DEMO_HOLDINGS.map((h) => {
                      const pnl = (h.current - h.entry) * h.qty;
                      const pnlPct = ((h.current - h.entry) / h.entry * 100).toFixed(2);
                      return (
                        <tr key={h.ticker} className="border-b border-slate-50">
                          <td className="py-2 pr-4 font-bold">{h.ticker}</td>
                          <td className="py-2 pr-4 text-slate-500">{h.name}</td>
                          <td className="py-2 pr-4">{h.qty}</td>
                          <td className="py-2 pr-4 font-mono">${h.entry}</td>
                          <td className="py-2 pr-4 font-mono">${h.current}</td>
                          <td className={`py-2 pr-4 font-mono font-semibold ${pnl > 0 ? "text-green-600" : "text-red-500"}`}>
                            {pnl > 0 ? "+" : ""}${pnl.toFixed(0)} ({pnlPct}%)
                          </td>
                          <td className="py-2 pr-4"><button className="text-xs text-red-500 hover:text-red-700">{L.sell}</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab === "history" && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold mb-4">{L.closedTrades}</h3>
              <div className="text-center text-slate-400 py-8">{L.noHistory}</div>
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
  balance: "账户余额", positions: "持仓", history: "历史", watchlist: "观察列表",
  currentPositions: "当前持仓", ticker: "代码", name: "名称", qty: "数量",
  entry: "成本价", current: "现价", pnl: "盈亏", action: "操作",
  sell: "卖出", closedTrades: "已平仓交易", noHistory: "暂无历史记录",
  simulated: "模拟价格",
  disclaimer: "模拟交易不构成投资建议。实际交易结果可能与模拟不同。",
};
const en = {
  title: "Paper Trading", subtitle: "Practice with zero risk. Validate strategies before going live.",
  balance: "Account Balance", positions: "Positions", history: "History", watchlist: "Watchlist",
  currentPositions: "Current Positions", ticker: "Ticker", name: "Name", qty: "Qty",
  entry: "Entry", current: "Current", pnl: "P&L", action: "Action",
  sell: "Sell", closedTrades: "Closed Trades", noHistory: "No history yet",
  simulated: "Simulated",
  disclaimer: "Paper trading does not constitute investment advice. Actual results may differ.",
};

