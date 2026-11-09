import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SignalCard from "../components/SignalCard";
import SignalHistory from "../components/SignalHistory";
import { computeSignalScore } from "../lib/signals";
import { buildSignalHistory, summarizeHistory } from "../lib/signalHistory";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";

export const metadata = {
  title: "今日信号 — Weacond",
  description: "三引擎合成信号，可解释评分",
  robots: { index: true, follow: true },
};

// 标的池 + 各引擎输入（mock；接入行情后只替换这里即可实时化）
const UNIVERSE = [
  { ticker: "NVDA", name: "NVIDIA", fairValueScore: 0.82, technicalScore: 0.85, ivRank: 78, thetaScore: 0.7 },
  { ticker: "MSFT", name: "Microsoft", fairValueScore: 0.78, technicalScore: 0.68, ivRank: 55, thetaScore: 0.65 },
  { ticker: "SPY", name: "S&P 500 ETF", fairValueScore: 0.72, technicalScore: 0.7, ivRank: 40, thetaScore: 0.6 },
  { ticker: "AAPL", name: "Apple", fairValueScore: 0.65, technicalScore: 0.6, ivRank: 45, thetaScore: 0.6 },
  { ticker: "AMD", name: "AMD", fairValueScore: 0.55, technicalScore: 0.5, ivRank: 70, thetaScore: 0.75 },
  { ticker: "TSLA", name: "Tesla", fairValueScore: 0.4, technicalScore: 0.35, ivRank: 82, thetaScore: 0.85 },
];

// 用信号引擎计算（三引擎加权 → 综合分 + 方向 + 风险 + 可解释性），按 score 降序
const SIGNALS = UNIVERSE.map((u) => ({
  ticker: u.ticker,
  name: u.name,
  ivRank: u.ivRank,
  source: "Weacond Engine v0.1",
  ...computeSignalScore(
    { fundamental: 0.35, technical: 0.3, volatility: 0.35 },
    { fairValueScore: u.fairValueScore, technicalScore: u.technicalScore, ivRank: u.ivRank, thetaScore: u.thetaScore }
  ),
})).sort((a, b) => b.score - a.score);

// 信号历史（确定性 mock，最近 30 日）+ 命中统计
const HISTORY = buildSignalHistory(30);
const HISTORY_SUMMARY = summarizeHistory(HISTORY);

export default function SignalsPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  // 记录"已查看信号"，供仪表盘 3 天任务 Day0 读取（localStorage 持久，跨页）
  useEffect(() => {
    localStorage.setItem("weacond_seen_signals", "1");
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">{L.title}</h1>
              <p className="text-slate-500 text-sm mt-1">{L.subtitle}</p>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
              {L.demoLabel}
            </span>
          </div>

          {/* 信号卡片（引擎计算 → SignalCard 渲染 → 串联回测/AI） */}
          <div className="space-y-4">
            {SIGNALS.map((s) => (
              <SignalCard key={s.ticker} signal={s} />
            ))}
          </div>

          {/* 信号历史（带标的筛选的 client 组件） */}
          <SignalHistory history={HISTORY} />

          {/* 升级提示 */}
          <div className="mt-8 bg-indigo-50 rounded-xl p-6 text-center border border-indigo-100">
            <p className="text-indigo-800 font-medium mb-4">{L.upgradePrompt}</p>
            <Link href="/pricing" className="inline-block bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-500 transition-colors">
              {L.upgradeCta}
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "今日信号",
  subtitle: "三引擎合成评分 · 可解释 · 引擎计算（mock 输入）",
  demoLabel: "示例数据 · 非实时",
  upgradePrompt: "解锁每日 5-10 条卖 Put 筛选、IV Rank、Greeks 摘要与风控建议",
  upgradeCta: "查看 PutSeller 方案",
  historyTitle: "近 30 日信号历史",
  historySignals: "信号数",
  historyHitRate: "命中率",
  historyAvgRet: "平均收益",
  historyDisclaimer: "事后收益为回测近似；演示数据，非投资建议。",
};
const en = {
  title: "Today's Signals",
  subtitle: "3-Engine composite scoring · Explainable · Engine-computed",
  demoLabel: "Demo Data · Not Live",
  upgradePrompt: "Unlock 5-10 put options daily, IV Rank, Greeks, and risk management",
  upgradeCta: "View PutSeller Plan",
  historyTitle: "Last 30 Days of Signals",
  historySignals: "Signals",
  historyHitRate: "Hit Rate",
  historyAvgRet: "Avg Return",
  historyDisclaimer: "Returns are backtest approximations; demo data, not investment advice.",
};
