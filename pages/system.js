"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import Link from "next/link";
import { simulateSystem, validSim, simInsight, SIM_PRESETS } from "../lib/systemSim";

export const metadata = {
  title: "交易系统模拟器 — Weacond",
  description: "给定胜率、盈亏比、每笔下注比例与交易次数，模拟净值曲线、最大回撤与破产概率。事前压力你的交易优势。教育性参考。",
  robots: { index: true, follow: true },
};

// 净值曲线迷你折线（自包含 SVG，无图表库）
function EquitySparkline({ curve, color = "#4f46e5" }) {
  const w = 640, h = 160, pad = 6;
  if (!curve || curve.length < 2) return null;
  const min = Math.min(...curve), max = Math.max(...curve);
  const range = max - min || 1;
  const pts = curve.map((v, i) => {
    const x = pad + (i / (curve.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (v - min) / range) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40" preserveAspectRatio="none">
      <line x1={pad} x2={w - pad} y1={h / 2} y2={h / 2} stroke="#e2e8f0" strokeDasharray="4 4" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export default function SystemPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [winRate, setWinRate] = useState(45); // 百分比
  const [rewardRisk, setRewardRisk] = useState(2);
  const [betPct, setBetPct] = useState(5);
  const [trades, setTrades] = useState(200);

  const valid = validSim({ winRate: winRate / 100, rewardRisk, betPct, trades });
  const r = useMemo(() => {
    if (!validSim({ winRate: winRate / 100, rewardRisk, betPct, trades })) return null;
    return simulateSystem({ winRate: winRate / 100, rewardRisk, betPct, trades }, 7);
  }, [winRate, rewardRisk, betPct, trades]);

  const applyPreset = (p) => {
    setWinRate(Math.round(p.winRate * 100));
    setRewardRisk(p.rewardRisk);
    setBetPct(p.betPct);
    setTrades(p.trades);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="system" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/system"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Trading System Simulator", href: "/system" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          {/* 原型选择 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {SIM_PRESETS.map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.winRateLabel}</span>
              <div className="mt-1 flex items-center gap-2">
                <input type="number" value={winRate} min={1} max={99} step={1}
                  onChange={(e) => setWinRate(Math.max(1, Math.min(99, parseFloat(e.target.value) || 0)))}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
                <span className="text-xs text-slate-400 w-6">%</span>
              </div>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.rLabel}</span>
              <div className="mt-1 flex items-center gap-2">
                <input type="number" value={rewardRisk} min={0.1} step={0.1}
                  onChange={(e) => setRewardRisk(parseFloat(e.target.value) || 0.1)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
                <span className="text-xs text-slate-400 w-6">×</span>
              </div>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.betLabel}</span>
              <div className="mt-1 flex items-center gap-2">
                <input type="number" value={betPct} min={0.1} max={50} step={0.5}
                  onChange={(e) => setBetPct(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
                <span className="text-xs text-slate-400 w-6">%</span>
              </div>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.tradesLabel}</span>
              <div className="mt-1 flex items-center gap-2">
                <input type="number" value={trades} min={10} max={2000} step={10}
                  onChange={(e) => setTrades(Math.max(10, Math.floor(parseFloat(e.target.value) || 0)))}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
              </div>
            </label>
          </div>

          {!valid && <p className="text-xs text-red-500 mb-4">{L.invalid}</p>}

          {r && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
                <div className="text-xs text-slate-400 mb-2">{L.curveLabel}</div>
                <EquitySparkline curve={r.curve} color={r.finalReturnPct >= 0 ? "#16a34a" : "#dc2626"} />
                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  <div>
                    <div className="text-xs text-slate-400">{L.finalLabel}</div>
                    <div className={`text-lg font-bold ${r.finalReturnPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {r.finalReturnPct >= 0 ? "+" : ""}{r.finalReturnPct.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{L.mddLabel}</div>
                    <div className="text-lg font-bold text-red-600">{r.maxDrawdownPct.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{L.ruinLabel}</div>
                    <div className={`text-lg font-bold ${r.probRuin < 0.1 ? "text-green-600" : "text-amber-600"}`}>
                      {(r.probRuin * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-center text-sm">
                  <div>
                    <div className="text-xs text-slate-400">{L.winRateActual}</div>
                    <div className="font-mono text-slate-700">{(r.winRateAchieved * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{L.pfLabel}</div>
                    <div className="font-mono text-slate-700">{Number.isFinite(r.profitFactor) ? r.profitFactor.toFixed(2) : "∞"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">{L.expectLabel}</div>
                    <div className={`font-mono ${r.expectancyR > 0 ? "text-green-600" : "text-red-600"}`}>
                      {r.expectancyR > 0 ? "+" : ""}{r.expectancyR.toFixed(2)}R
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-4 text-center">{simInsight(r)}</p>
              </div>
            </>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/montecarlo" className="text-indigo-500 hover:underline">→ {L.linkMonteCarlo}</Link>
            {" · "}
            <Link href="/performance" className="text-indigo-500 hover:underline">→ {L.linkPerformance}</Link>
            {" · "}
            <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "交易系统模拟器",
  subtitle: "给定胜率、盈亏比 R、每笔下注比例与交易次数，模拟净值曲线、最大回撤与破产概率——事前压力你的交易优势。",
  howToTitle: "如何使用交易系统模拟器",
  howTo: [
    "输入胜率、盈亏比 R、每笔下注比例与交易次数。",
    "计算器模拟净值曲线、最大回撤与破产概率。",
    "用于事前压力你的交易优势。",
  ],
  winRateLabel: "胜率",
  rLabel: "盈亏比 R",
  betLabel: "每笔下注",
  tradesLabel: "交易笔数",
  invalid: "胜率需在 1%~99%，R 与下注需为正，笔数 ≥ 1。",
  curveLabel: "净值曲线（100 起，确定性种子 7）",
  finalLabel: "最终收益",
  mddLabel: "最大回撤",
  ruinLabel: "破产概率",
  winRateActual: "实现胜率",
  pfLabel: "盈亏比",
  expectLabel: "每笔期望",
  presetLabels: {
    scalper: "高频小赚",
    swing: "波段趋势",
    swingTight: "紧下注波段",
    grid: "网格套利",
  },
  disclaimer: "离散交易按固定比例复合，随机路径由确定性种子生成，仅供演示与教学；真实结果受波动、滑点与路径影响，不构成投资建议。",
  linkMonteCarlo: "蒙特卡洛",
  linkPerformance: "业绩复盘",
  linkRisk: "风险仪表盘",
};
const en = {
  title: "Trading System Simulator",
  subtitle: "Given win rate, reward:risk R, bet fraction and number of trades, simulate the equity curve, max drawdown and probability of ruin — stress-test your edge before you trade it.",
  howToTitle: "How to use the trading-system simulator",
  howTo: [
    "Enter win rate, reward:risk R, bet fraction and number of trades.",
    "The calculator simulates the equity curve, max drawdown and probability of ruin.",
    "Use it to stress-test your edge before trading.",
  ],
  winRateLabel: "Win rate",
  rLabel: "Reward:risk R",
  betLabel: "Bet per trade",
  tradesLabel: "Number of trades",
  invalid: "Win rate must be 1–99%; R and bet must be positive; trades ≥ 1.",
  curveLabel: "Equity curve (base 100, deterministic seed 7)",
  finalLabel: "Final return",
  mddLabel: "Max drawdown",
  ruinLabel: "P(ruin)",
  winRateActual: "Achieved win rate",
  pfLabel: "Profit factor",
  expectLabel: "Expectancy",
  presetLabels: {
    scalper: "High-freq",
    swing: "Swing trend",
    swingTight: "Tight bet",
    grid: "Grid arb",
  },
  disclaimer: "Discrete trades compounded at a fixed fraction; the random path uses a deterministic seed for demonstration only. Real results depend on volatility, slippage and path. Not investment advice.",
  linkMonteCarlo: "Monte Carlo",
  linkPerformance: "Performance",
  linkRisk: "Risk dashboard",
};

