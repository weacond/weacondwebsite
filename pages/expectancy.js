"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  expectancySummary, EXPECTANCY_PRESETS,
} from "../lib/expectancy";

export const metadata = {
  title: "交易期望 / 盈亏因子计算器 — Weacond",
  description: "期望=p·赢−(1−p)·输，盈亏因子=总盈/总亏，平衡胜率=输/(赢+输)。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};

function fmtNum(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function ExpectancyPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [winRate, setWinRate] = useState(50); // 百分比
  const [avgWin, setAvgWin] = useState(200);
  const [avgLoss, setAvgLoss] = useState(100);
  const [trades, setTrades] = useState(100);

  const res = useMemo(
    () => expectancySummary({ winRate: winRate / 100, avgWin, avgLoss, trades }),
    [winRate, avgWin, avgLoss, trades],
  );

  const applyPreset = (p) => {
    setWinRate(p.winRate * 100);
    setAvgWin(p.avgWin);
    setAvgLoss(p.avgLoss);
    setTrades(p.trades);
  };

  const band = res.band;
  const bandColor =
    band === "strong" ? "text-emerald-600" :
    band === "marginal" ? "text-amber-600" :
    "text-rose-600";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(EXPECTANCY_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.winRateLabel}</span>
              <input type="number" value={winRate} min={0} max={100} step={1}
                onChange={(e) => setWinRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.avgWinLabel}</span>
              <input type="number" value={avgWin} min={1} step={1}
                onChange={(e) => setAvgWin(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.avgLossLabel}</span>
              <input type="number" value={avgLoss} min={1} step={1}
                onChange={(e) => setAvgLoss(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.tradesLabel}</span>
              <input type="number" value={trades} min={0} step={10}
                onChange={(e) => setTrades(Math.max(0, Math.floor(parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.evLabel}</div>
                <div className={`text-4xl font-bold ${bandColor}`}>{fmtNum(res.expectedValue)}</div>
                <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.pfLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.profitFactor >= 999 ? "∞" : fmtNum(res.profitFactor)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.beLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{(res.breakEvenWinRate * 100).toFixed(1)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.rrLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtNum(res.rewardRiskRatio)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.totalLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{fmtNum(res.totalExpectancy)}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/r-multiple" className="text-indigo-500 hover:underline">→ {L.linkRMultiple}</Link>
            {" · "}
            <Link href="/position-size" className="text-indigo-500 hover:underline">→ {L.linkPosition}</Link>
            {" · "}
            <Link href="/risk-ruin" className="text-indigo-500 hover:underline">→ {L.linkRiskRuin}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "交易期望 / 盈亏因子",
  subtitle: "每笔期望=p·平均赢−(1−p)·平均输；盈亏因子=总盈/总亏；平衡胜率=输/(赢+输)。",
  winRateLabel: "胜率 %",
  avgWinLabel: "平均盈利",
  avgLossLabel: "平均亏损",
  tradesLabel: "交易次数",
  evLabel: "每笔期望 (EV)",
  pfLabel: "盈亏因子",
  beLabel: "平衡胜率",
  rrLabel: "盈亏比",
  totalLabel: "累计期望",
  invalid: "胜率 0–100%，平均盈/亏须 >0。",
  disclaimer: "基于历史均值的简化模型，未计交易成本/滑点/序列效应，非投资建议。",
  linkRMultiple: "R 倍数",
  linkPosition: "头寸规模",
  linkRiskRuin: "破产风险",
  bandLabels: { strong: "强 PF≥1.5", marginal: "一般 1–1.5", negative: "负 <1" },
  presetLabels: { positive: "正期望", breakeven: "盈亏平衡", highWin: "高胜率", scalper: "高频小盈", negative: "负期望" },
};
const en = {
  title: "Trade Expectancy / Profit Factor",
  subtitle: "EV per trade = p·avgWin − (1−p)·avgLoss; profit factor = gross profit/gross loss; break-even win rate.",
  winRateLabel: "Win rate %",
  avgWinLabel: "Avg win",
  avgLossLabel: "Avg loss",
  tradesLabel: "Trades",
  evLabel: "Expected value / trade",
  pfLabel: "Profit factor",
  beLabel: "Break-even win rate",
  rrLabel: "Reward/risk",
  totalLabel: "Total expectancy",
  invalid: "Win rate 0–100%, avg win/loss must be > 0.",
  disclaimer: "Simplified model from historical means; excludes costs/slippage/sequencing. Not investment advice.",
  linkRMultiple: "R-Multiple",
  linkPosition: "Position Size",
  linkRiskRuin: "Risk of Ruin",
  bandLabels: { strong: "Strong PF≥1.5", marginal: "Mild 1–1.5", negative: "Negative <1" },
  presetLabels: { positive: "Positive", breakeven: "Break-even", highWin: "High win", scalper: "Scalper", negative: "Negative" },
};

