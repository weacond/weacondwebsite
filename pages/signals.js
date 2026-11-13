import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SignalCard from "../components/SignalCard";
import SignalHistory from "../components/SignalHistory";
import { computeSignalScore } from "../lib/signals";
import { signalConsensus } from "../lib/backtest";
import { buildSignalHistory, summarizeHistory } from "../lib/signalHistory";
import { rankByWinProbability } from "../lib/winProbability";
import StructuredData from "../components/StructuredData";
import { webApplicationLd, faqLd } from "../lib/jsonLd";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

export const metadata = {
  title: "今日信号 — Weacond",
  description: "三引擎合成信号，可解释评分",
  robots: { index: true, follow: true },
};

// 标的池 + 各引擎估算输入（技术面在客户端用真实行情重算；基本面/期权为估算，待期权链数据接入）
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

// /signals 结构化数据 FAQ（诚实、教育性；反幻觉：不编造收益/胜率保证）
const SIGNALS_FAQ = [
  {
    q: "Weacond 的信号是怎么算出来的？",
    a: "三引擎合成：基本面（公允价值）、技术面（突破/支撑）、波动面（IV Rank / Theta），加权得到可解释评分与方向。",
  },
  {
    q: "信号能保证盈利吗？",
    a: "不能。任何系统都不能保证盈利。Weacond 提供可解释的评分与「盈利概率（正态近似 + 置信区间）」，并附肥尾警示，供教育与参考，不构成投资建议。",
  },
  {
    q: "数据是实时的吗？",
    a: "技术面用行情源实时重算；未配置数据源时回退到演示数据并诚实标注。基本面与期权为估算，待期权链数据接入。",
  },
];

export default function SignalsPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [signals, setSignals] = useState(SIGNALS);
  const [dataLive, setDataLive] = useState(false);
  const [techLoading, setTechLoading] = useState(true);

  // 记录"已查看信号"，供仪表盘 3 天任务 Day0 读取（localStorage 持久，跨页）
  useEffect(() => {
    localStorage.setItem("weacond_seen_signals", "1");
  }, []);

  // 技术面用真实行情重算：/api/marketdata 有 key 返回实时 K 线（live:true），无 key 返回演示 K 线。
  // 技术面分 = signalConsensus(共识方向 × 同意度) 映射到 0-1；基本面/期权仍为估算。
  useEffect(() => {
    let cancelled = false;
    async function loadTech() {
      const results = await Promise.all(UNIVERSE.map(async (u) => {
        try {
          const res = await fetch(`/api/marketdata?symbol=${encodeURIComponent(u.ticker)}&interval=Daily&months=6`);
          if (!res.ok) return null;
          const data = await res.json();
          const candles = data.candles || [];
          if (candles.length < 30) return null;
          const cs = signalConsensus(candles);
          const technicalScore = Math.max(0, Math.min(1, 0.5 + (cs.direction / 4) * (cs.agreement / 100) * 0.8));
          return { ticker: u.ticker, technicalScore, live: !!data.live };
        } catch {
          return null;
        }
      }));
      if (cancelled) return;
      const techMap = {};
      let anyLive = false;
      results.filter(Boolean).forEach((r) => { techMap[r.ticker] = r.technicalScore; if (r.live) anyLive = true; });
      if (Object.keys(techMap).length === 0) { setTechLoading(false); return; } // 全部失败 → 保留估算
      const rebuilt = UNIVERSE.map((u) => {
        const s = computeSignalScore(
          { fundamental: 0.35, technical: 0.3, volatility: 0.35 },
          { fairValueScore: u.fairValueScore, technicalScore: techMap[u.ticker] ?? 0.5, ivRank: u.ivRank, thetaScore: u.thetaScore }
        );
        return { ticker: u.ticker, name: u.name, ivRank: u.ivRank, source: "Weacond Engine v0.1", ...s };
      }).sort((a, b) => b.score - a.score);
      setSignals(rebuilt);
      setDataLive(anyLive);
      setTechLoading(false);
    }
    loadTech();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <StructuredData data={[webApplicationLd(), faqLd(SIGNALS_FAQ)]} />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">{L.title}</h1>
              <p className="text-slate-500 text-sm mt-1">{L.subtitle}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full ${dataLive ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {techLoading ? L.techLoading : dataLive ? L.liveLabel : L.demoLabel}
            </span>
          </div>

          {/* 信号卡片（引擎计算 → SignalCard 渲染 → 串联回测/AI；技术面随真实行情刷新） */}
          <div className="space-y-4">
            {signals.map((s) => (
              <SignalCard key={s.ticker} signal={s} />
            ))}
          </div>

          {/* 信号历史（带标的筛选的 client 组件） */}
          <SignalHistory history={HISTORY} />

          {/* 胜率框架（独立模块）：把三引擎评分转成「盈利概率 + 置信区间 + 假设清单」，对齐手册「卖确定性的概率」 */}
          <WinProbabilityPanel signals={signals} lang={lang} />

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
  subtitle: "三引擎合成评分 · 技术面实时 · 可解释",
  demoLabel: "示例数据 · 技术面估算",
  liveLabel: "实时行情 · 技术面",
  techLoading: "加载技术面...",
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
  subtitle: "3-Engine composite · live technicals · explainable",
  demoLabel: "Demo Data · technicals estimated",
  liveLabel: "Live · technicals",
  techLoading: "Loading technicals...",
  upgradePrompt: "Unlock 5-10 put options daily, IV Rank, Greeks, and risk management",
  upgradeCta: "View PutSeller Plan",
  historyTitle: "Last 30 Days of Signals",
  historySignals: "Signals",
  historyHitRate: "Hit Rate",
  historyAvgRet: "Avg Return",
  historyDisclaimer: "Returns are backtest approximations; demo data, not investment advice.",
};

// ── 胜率框架（独立模块）：把评分 → 盈利概率 + 置信区间 + 假设清单 ──
const VERDICT_ZH = { high: "高胜率", mid: "中胜率", low: "低胜率", unknown: "—" };
const VERDICT_EN = { high: "High", mid: "Mid", low: "Low", unknown: "—" };
const VERDICT_COLOR = {
  high: "bg-green-100 text-green-700",
  mid: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
  unknown: "bg-slate-100 text-slate-400",
};

function WinProbabilityPanel({ signals, lang }) {
  const L = lang === "en" ? enWin : zhWin;
  if (!Array.isArray(signals) || signals.length === 0) return null;
  // 每个标的：单期波动用 IV Rank 代理（披露）；1 个月 ≈ 21 交易日
  const ranked = rankByWinProbability(
    signals.map((s) => ({
      ticker: s.ticker,
      name: s.name,
      score: s.score,
      ivRank: s.ivRank,
      sigmaPer: 0.01 + ((Number(s.ivRank) || 50) / 100) * 0.03, // 1%~4%/日
      horizon: 21,
      gain: 1.5,
      breakeven: 0,
    }))
  ).slice(0, 3);
  if (ranked.length === 0) return null;
  return (
    <div className="mt-10 border-t pt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">{L.title}</h2>
          <p className="text-slate-500 text-sm mt-1">{L.subtitle}</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200">
          {L.independent}
        </span>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {ranked.map((r, i) => {
          const wp = r.winProbability;
          return (
            <div
              key={r.ticker}
              className="rounded-xl border p-4 bg-white"
              style={i === 0 ? { borderColor: "#6366f1", borderWidth: 2 } : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{r.ticker}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${VERDICT_COLOR[wp.verdict] || VERDICT_COLOR.unknown}`}>
                  {(lang === "en" ? VERDICT_EN : VERDICT_ZH)[wp.verdict] || "—"}
                </span>
              </div>
              <div className="mt-2 text-3xl font-bold">{Math.round(wp.probOfProfit * 100)}%</div>
              <div className="text-xs text-slate-500">{L.probLabel}</div>
              <div className="mt-2 text-xs text-slate-400">
                {L.confidence} {Math.round(wp.confidenceBand[0] * 100)}–{Math.round(wp.confidenceBand[1] * 100)}%
              </div>
              {i === 0 && (
                <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">{L.assumptions}</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
        ⚠️ {L.fatTail}
        <Link href="/black-swan" className="ml-1 underline">{L.blackSwanLink}</Link>
      </p>
      <p className="mt-2 text-[11px] text-slate-400">{L.disclaimer}</p>
    </div>
  );
}

const zhWin = {
  title: "胜率框架（独立模块）",
  subtitle: "把三引擎评分转成「盈利概率 + 置信区间」—— 卖的是确定性的概率",
  independent: "独立框架 · 概率化",
  probLabel: "盈利概率（正态近似）",
  confidence: "95% 置信区间：",
  assumptions: "假设：终端收益近似正态 N(μ_total, σ_total²)；μ_total=(评分−0.5)×1.5×σ×期数；σ_total=σ×√期数（σ 由 IV Rank 代理，1%~4%/日，21 交易日）。",
  fatTail: "正态近似会高估胜率，真实行情肥尾、极端下实际胜率更低：",
  blackSwanLink: "看黑天鹅防御 →",
  disclaimer: "教育性参考，非投资建议；结果因人而异。",
};
const enWin = {
  title: "Win-Probability Framework (standalone)",
  subtitle: "Turns the 3-engine score into a probability of profit + confidence — we sell certainty as probability",
  independent: "Standalone · probabilistic",
  probLabel: "Probability of profit (normal approx.)",
  confidence: "95% CI: ",
  assumptions: "Assumptions: terminal return ~ Normal(μ_total, σ_total²); μ_total=(score−0.5)×1.5×σ×periods; σ_total=σ×√periods (σ proxied by IV Rank, 1%–4%/day, 21 sessions).",
  fatTail: "Normal approximation overstates win rate; real returns are fat-tailed, so actual odds are lower in extremes:",
  blackSwanLink: "See Black-Swan defense →",
  disclaimer: "Educational reference, not investment advice; results vary.",
};
