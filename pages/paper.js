"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import { usePaper, markPositions } from "../lib/paper";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

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
  const router = useRouter();
  const [marking, setMarking] = useState(false);
  const [markLive, setMarkLive] = useState(null);
  const [wlPrices, setWlPrices] = useState({});
  const [wlLive, setWlLive] = useState(null);
  const [lastMarked, setLastMarked] = useState(null);

  // 盯市：用 /api/marketdata 最新价更新各持仓现价，浮动盈亏随之真实化（无 key 时为演示价）
  const refreshPrices = async () => {
    const tickers = [...new Set(positions.map((p) => p.ticker))];
    if (!tickers.length) return;
    setMarking(true);
    try {
      const results = await Promise.all(tickers.map(async (t) => {
        try {
          const res = await fetch(`/api/marketdata?symbol=${encodeURIComponent(t)}&interval=Daily&months=1`);
          if (!res.ok) return null;
          const data = await res.json();
          const c = data.candles || [];
          const last = c[c.length - 1];
          if (!last || !last.close) return null;
          return { ticker: t, price: Number(last.close), live: !!data.live };
        } catch {
          return null;
        }
      }));
      const map = {};
      let anyLive = false;
      results.filter(Boolean).forEach((r) => { map[r.ticker] = r.price; if (r.live) anyLive = true; });
      markPositions(map);
      setMarkLive(anyLive);
      if (Object.keys(map).length > 0) setLastMarked(new Date().toLocaleTimeString());
    } finally {
      setMarking(false);
    }
  };

  // 落地即盯市：进入 /paper 自动用最新价更新持仓，浮动盈亏即时真实化
  useEffect(() => { refreshPrices(); }, []);

  // 观察列表实时/演示价（无 key 时演示兜底）
  const WL = ["SPY", "QQQ", "AAPL", "NVDA", "TSLA", "MSFT"];
  const loadWatchlist = async () => {
    try {
      const results = await Promise.all(WL.map(async (t) => {
        try {
          const res = await fetch(`/api/marketdata?symbol=${encodeURIComponent(t)}&interval=Daily&months=1`);
          if (!res.ok) return null;
          const data = await res.json();
          const c = data.candles || [];
          const last = c[c.length - 1];
          if (!last || !last.close) return null;
          const first = c[0];
          const change = first && first.close ? ((last.close - first.close) / first.close) * 100 : null;
          return { ticker: t, price: Number(last.close), change, live: !!data.live };
        } catch {
          return null;
        }
      }));
      const map = {};
      let anyLive = false;
      results.filter(Boolean).forEach((r) => { map[r.ticker] = r; if (r.live) anyLive = true; });
      setWlPrices(map);
      setWlLive(anyLive);
    } catch {
      /* 静默，网格保留占位 */
    }
  };

  useEffect(() => {
    if (tab === "watchlist" && Object.keys(wlPrices).length === 0) loadWatchlist();
  }, [tab]);

  // 交易绩效分析：从已平仓交易算胜率 / 利润因子 / 平均盈亏 / 期望值 / 最佳最差
  const analytics = useMemo(() => {
    const closed = trades;
    const n = closed.length;
    if (n === 0) return null;
    const wins = closed.filter((t) => t.win);
    const losses = closed.filter((t) => !t.win);
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
    const best = closed.reduce((m, t) => (t.pnl > m.pnl ? t : m), closed[0]);
    const worst = closed.reduce((m, t) => (t.pnl < m.pnl ? t : m), closed[0]);
    return {
      n,
      winRate: (wins.length / n) * 100,
      profitFactor,
      avgWin: wins.length ? grossProfit / wins.length : 0,
      avgLoss: losses.length ? grossLoss / losses.length : 0,
      expectancy: (grossProfit - grossLoss) / n,
      best,
      worst,
      realized: grossProfit - grossLoss,
    };
  }, [trades]);

  // 从信号/收藏页跳转：?symbol=NVDA 预填开仓表单的标的
  useEffect(() => {
    if (router.isReady && router.query.symbol) {
      setForm((f) => ({ ...f, ticker: String(router.query.symbol).toUpperCase() }));
      setTab("positions");
    }
  }, [router.isReady, router.query.symbol]);

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
            {[["positions", L.positions], ["history", L.history], ["performance", L.performance], ["watchlist", L.watchlist]].map(([key, label]) => (
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{L.currentPositions}</h3>
                  <div className="flex items-center gap-3">
                    {lastMarked && <span className="text-xs text-slate-400">{L.lastUpdated} {lastMarked}</span>}
                    <button type="button" onClick={refreshPrices} disabled={marking}
                      className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full hover:bg-slate-200 disabled:opacity-50 transition-colors">
                      {marking ? L.marking : L.refreshPrice}
                    </button>
                  </div>
                </div>
                {markLive !== null && positions.length > 0 && (
                  <p className={`text-xs mb-3 ${markLive ? "text-green-600" : "text-amber-600"}`}>
                    {markLive ? L.markLiveNote : L.markDemoNote}
                  </p>
                )}
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{L.watchlist}</h3>
                <button type="button" onClick={loadWatchlist}
                  className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full hover:bg-slate-200 transition-colors">{L.refreshPrice}</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {WL.map((t) => {
                  const p = wlPrices[t];
                  return (
                    <div key={t} className="p-3 bg-slate-50 rounded-lg text-center">
                      <div className="font-bold">{t}</div>
                      {p ? (
                        <>
                          <div className="font-mono text-sm my-1">${Number(p.price).toFixed(2)}</div>
                          {p.change != null ? (
                            <div className={`text-xs ${p.change >= 0 ? "text-green-600" : "text-red-500"}`}>{p.change >= 0 ? "+" : ""}{Number(p.change).toFixed(2)}%</div>
                          ) : <div className="text-xs text-slate-400 mt-1">—</div>}
                        </>
                      ) : (
                        <div className="text-xs text-slate-400 mt-1">{L.simulated}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {wlLive !== null && (
                <p className={`text-xs mt-3 ${wlLive ? "text-green-600" : "text-amber-600"}`}>
                  {wlLive ? L.markLiveNote : L.markDemoNote}
                </p>
              )}
            </div>
          )}
          {tab === "performance" && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold mb-4">{L.performance}</h3>
              {analytics ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <div className="text-xs text-slate-400">{L.winRate}</div>
                      <div className="text-2xl font-bold">{analytics.winRate.toFixed(1)}%</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <div className="text-xs text-slate-400">{L.profitFactor}</div>
                      <div className="text-2xl font-bold">{analytics.profitFactor === Infinity ? "∞" : analytics.profitFactor.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <div className="text-xs text-slate-400">{L.avgWin}</div>
                      <div className="text-2xl font-bold text-green-600">+${analytics.avgWin.toFixed(0)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <div className="text-xs text-slate-400">{L.avgLoss}</div>
                      <div className="text-2xl font-bold text-red-500">-${analytics.avgLoss.toFixed(0)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <div className="text-xs text-slate-400">{L.expectancy}</div>
                      <div className={`text-2xl font-bold ${analytics.expectancy >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {analytics.expectancy >= 0 ? "+" : ""}${analytics.expectancy.toFixed(0)}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <div className="text-xs text-slate-400">{L.realized}</div>
                      <div className={`text-2xl font-bold ${analytics.realized >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {analytics.realized >= 0 ? "+" : ""}${analytics.realized.toFixed(0)}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <div className="text-xs text-slate-400">{L.bestTrade}</div>
                      <div className="text-lg font-bold text-green-600">+${analytics.best.pnl.toFixed(0)}</div>
                      <div className="text-xs text-slate-400">{analytics.best.ticker}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                      <div className="text-xs text-slate-400">{L.worstTrade}</div>
                      <div className="text-lg font-bold text-red-500">${analytics.worst.pnl.toFixed(0)}</div>
                      <div className="text-xs text-slate-400">{analytics.worst.ticker}</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-4">{L.tradesCount} {analytics.n}</p>
                </>
              ) : (
                <div className="text-center text-slate-400 py-8">{L.noPerformance}</div>
              )}
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
  refreshPrice: "刷新现价", marking: "盯市中...", markLiveNote: "现价已用实时行情（Alpha Vantage）更新", markDemoNote: "现价为演示数据（未配置 API key）", lastUpdated: "更新于 ",
  entry: "成本价", current: "现价", exit: "卖出价", pnl: "盈亏", action: "操作",
  openPosition: "开仓", sell: "平仓", noPositions: "暂无持仓，可在上方开仓",
  closedTrades: "已平仓交易", noHistory: "暂无历史记录", closeDate: "平仓日",
  performance: "绩效", winRate: "胜率", profitFactor: "利润因子", avgWin: "平均盈利", avgLoss: "平均亏损",
  expectancy: "期望值", realized: "已实现", bestTrade: "最佳交易", worstTrade: "最差交易",
  tradesCount: "共 ", noPerformance: "暂无已平仓交易，平仓后此处显示绩效分析",
  simulated: "模拟价格",
  disclaimer: "模拟交易不构成投资建议。实际交易结果可能与模拟不同。",
};
const en = {
  title: "Paper Trading", subtitle: "Practice with zero risk. Validate strategies before going live.",
  balance: "Account Balance", floatPnl: "Unrealized P&L", realizedPnl: "Realized P&L",
  positions: "Positions", history: "History", watchlist: "Watchlist",
  currentPositions: "Current Positions", ticker: "Ticker", name: "Name", qty: "Qty",
  refreshPrice: "Refresh prices", marking: "Marking...", markLiveNote: "Prices updated from live data (Alpha Vantage)", markDemoNote: "Prices are demo data (no API key configured)", lastUpdated: "Updated ",
  entry: "Entry", current: "Current", exit: "Exit", pnl: "P&L", action: "Action",
  openPosition: "Open", sell: "Close", noPositions: "No open positions — place an order above",
  closedTrades: "Closed Trades", noHistory: "No history yet", closeDate: "Closed",
  performance: "Performance", winRate: "Win Rate", profitFactor: "Profit Factor", avgWin: "Avg Win", avgLoss: "Avg Loss",
  expectancy: "Expectancy", realized: "Realized", bestTrade: "Best Trade", worstTrade: "Worst Trade",
  tradesCount: "Trades: ", noPerformance: "No closed trades yet — performance appears after you close a position",
  simulated: "Simulated",
  disclaimer: "Paper trading does not constitute investment advice. Actual results may differ.",
};

