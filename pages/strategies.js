"use client";

import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";

export const metadata = {
  title: "策略市场 — Weacond",
  description: "发现、评估、分享量化策略。创作者分润，用户零代码使用",
  robots: { index: true, follow: true },
};

const DEMO_STRATEGIES = [
  { id: 1, name: "双均线趋势跟踪", author: "quant_joe", category: "趋势", sharpe: 1.8, maxDD: 12, trades: 45, winRate: 62, price: "免费", verified: true, desc: "10/30 日均线交叉，适合中大市值趋势行情" },
  { id: 2, name: "卖Put增强收益", author: "option_master", category: "期权", sharpe: 2.1, maxDD: 8, trades: 120, winRate: 71, price: "$9.9/月", verified: true, desc: "IV Rank > 50 时卖出 ATM Put，结合 Gamma 对冲" },
  { id: 3, name: "动量轮动", author: "momentum_lab", category: "轮动", sharpe: 1.5, maxDD: 15, trades: 24, winRate: 55, price: "免费", verified: false, desc: "月度再平衡，持有过去6个月表现最佳的5个行业ETF" },
  { id: 4, name: "均值回归套利", author: "stat_arb", category: "统计套利", sharpe: 1.3, maxDD: 6, trades: 380, winRate: 58, price: "$29.9/月", verified: true, desc: "基于协整关系的配对交易，适用于高相关性ETF对" },
];

export default function StrategiesPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>

          <div className="grid md:grid-cols-2 gap-6">
            {DEMO_STRATEGIES.map((s) => (
              <div key={s.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg">{s.name}</h3>
                  {s.verified && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">✓ {L.verified}</span>}
                </div>
                <p className="text-sm text-slate-500 mb-4">{s.desc}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400">by {s.author}</span>
                  <span className="text-xs text-slate-400">{s.category}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center mb-4">
                  <div><div className="text-xs text-slate-400">{L.sharpe}</div><div className="font-bold text-sm">{s.sharpe}</div></div>
                  <div><div className="text-xs text-slate-400">{L.maxDD}</div><div className="font-bold text-sm text-red-500">{s.maxDD}%</div></div>
                  <div><div className="text-xs text-slate-400">{L.winRate}</div><div className="font-bold text-sm">{s.winRate}%</div></div>
                  <div><div className="text-xs text-slate-400">{L.trades}</div><div className="font-bold text-sm">{s.trades}</div></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-600">{s.price}</span>
                  <Link href="/backtest" className="text-sm text-indigo-600 hover:underline">{L.backtest} →</Link>
                </div>
              </div>
            ))}
          </div>

          {/* 创作者入口 */}
          <div className="mt-10 bg-white rounded-xl p-6 shadow-sm border border-slate-100 text-center">
            <h3 className="font-semibold text-lg mb-2">{L.creatorTitle}</h3>
            <p className="text-sm text-slate-500 mb-4">{L.creatorDesc}</p>
            <Link href="/login" className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 transition-colors">
              {L.becomeCreator}
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
    </div>
  );
}

const zh = {
  title: "策略市场",
  subtitle: "发现、评估、分享量化策略。创作者分润，用户零代码使用",
  verified: "已验证",
  sharpe: "夏普", maxDD: "回撤", winRate: "胜率", trades: "交易",
  backtest: "回测",
  creatorTitle: "成为策略创作者",
  creatorDesc: "上传你的策略代码，通过订阅分润赚取收入。平台审核 + 回测验证 + 风险披露。",
  becomeCreator: "开始创建",
  disclaimer: "策略表现基于历史回测，不代表未来收益。使用策略前请充分理解风险。",
};
const en = {
  title: "Strategy Marketplace",
  subtitle: "Discover, evaluate, and share quant strategies. Creator revenue share, zero-code for users",
  verified: "Verified",
  sharpe: "Sharpe", maxDD: "Max DD", winRate: "Win", trades: "Trades",
  backtest: "Backtest",
  creatorTitle: "Become a Strategy Creator",
  creatorDesc: "Upload your strategy code and earn revenue through subscription sharing. Platform review + backtest verification + risk disclosure.",
  becomeCreator: "Start Creating",
  disclaimer: "Strategy performance is based on historical backtests and does not guarantee future results. Understand risks before use.",
};
