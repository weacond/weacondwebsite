"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import Head from "next/head";
import { TRADE_PRESETS, tradeScorecard, gradePerformance } from "../lib/performance";

export const metadata = {
  title: "交易日志 / 业绩报告 — Weacond",
  description: "输入一串每笔交易收益率，读出胜率、盈利因子、盈亏比、期望、连亏、夏普/索提诺与破产概率，并给出业绩评级。教育性工具，非投资建议。",
  robots: { index: true, follow: true },
};

const GRADE_CLS = {
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
  amber: "bg-amber-100 text-amber-700 border-amber-300",
  orange: "bg-orange-100 text-orange-700 border-orange-300",
  rose: "bg-rose-100 text-rose-700 border-rose-300",
  slate: "bg-slate-100 text-slate-600 border-slate-300",
};

function parseReturns(text) {
  return String(text)
    .split(/[\s,]+/)
    .map((s) => parseFloat(s))
    .filter((x) => Number.isFinite(x));
}

export default function PerformancePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [presetId, setPresetId] = useState("edge");
  const [custom, setCustom] = useState("");
  const [periods, setPeriods] = useState(252);

  const preset = TRADE_PRESETS[presetId];
  const customVals = parseReturns(custom);
  const usingCustom = customVals.length >= 2;
  const trades = usingCustom ? customVals : preset.trades;
  const sc = tradeScorecard(trades, { periods });
  const grade = gradePerformance(sc);
  const pct = (v) => (Number.isFinite(v) ? (v * 100).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "%" : "—");
  const num = (v) => (Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>

          {/* 预设 + 输入 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-3">{L.preset}</h2>
            <div className="flex flex-wrap gap-2">
              {Object.values(TRADE_PRESETS).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPresetId(p.id)}
                  disabled={usingCustom}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    !usingCustom && preset.id === p.id
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                  }`}
                >
                  {lang === "en" ? p.nameEn : p.name}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-3">{lang === "en" ? preset.descEn : preset.desc}</p>

            <h2 className="text-lg font-bold mt-6 mb-3">{L.custom}</h2>
            <textarea
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              rows={3}
              placeholder="0.05, -0.02, 0.04, -0.03, 0.06 ..."
              className="w-full text-sm font-mono p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-slate-400 mt-2">{L.customHint}</p>
          </div>
          {/* 评级徽章 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{L.grade}</h2>
              <span className={`text-sm font-bold px-3 py-1 rounded-full border ${GRADE_CLS[grade.color]}`}>
                {lang === "en" ? grade.labelEn : grade.label}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4 text-center">
              <Metric label={L.totalReturn} value={pct(sc.totalReturn)} accent={sc.totalReturn >= 0 ? "text-emerald-600" : "text-rose-600"} />
              <Metric label={L.winRate} value={pct(sc.winRate)} />
              <Metric label={L.profitFactor} value={num(sc.profitFactor)} accent={sc.profitFactor >= 1 ? "text-emerald-600" : "text-rose-600"} />
              <Metric label={L.payoff} value={num(sc.payoff)} />
              <Metric label={L.expectancy} value={pct(sc.expectancy)} accent={sc.expectancy >= 0 ? "text-emerald-600" : "text-rose-600"} />
              <Metric label={L.probRuin} value={pct(sc.probRuin)} accent={sc.probRuin < 0.5 ? "text-emerald-600" : "text-rose-600"} />
              <Metric label={L.sharpe} value={num(sc.sharpe)} />
              <Metric label={L.sortino} value={num(sc.sortino)} />
              <Metric label={L.maxLossStreak} value={num(sc.maxLosingStreak)} accent="text-rose-600" />
              <Metric label={L.maxWinStreak} value={num(sc.maxWinStreak)} accent="text-emerald-600" />
              <Metric label={L.trades} value={num(sc.n)} />
              <Metric label={L.cagr} value={pct(sc.cagr)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-3 text-center">
              {L.count} {sc.wins}W / {sc.losses}L / {sc.scratch}·
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className={`text-sm font-mono font-semibold ${accent || "text-slate-700"}`}>{value}</div>
    </div>
  );
}

const zh = {
  title: "交易日志 / 业绩报告",
  subtitle: "输入一串每笔交易收益率（小数，如 0.05 = +5%），读出胜率、盈利因子、盈亏比、期望、连亏、夏普/索提诺与破产概率，并评级。教育性工具，非投资建议。",
  preset: "选择示例",
  custom: "自定义交易日志",
  customHint: "每笔收益率以逗号/空格/换行分隔，至少 2 笔；留空则用上方示例。",
  grade: "业绩评级",
  totalReturn: "累计收益",
  winRate: "胜率",
  profitFactor: "盈利因子",
  payoff: "盈亏比",
  expectancy: "每笔期望",
  probRuin: "破产概率",
  sharpe: "夏普",
  sortino: "索提诺",
  maxLossStreak: "最长连亏",
  maxWinStreak: "最长连盈",
  trades: "交易数",
  cagr: "年化",
  count: "胜负",
  disclaimer: "示例日志为教学示意；盈利因子/期望/破产概率为历史统计估计，未来表现可能不同。本工具不构成投资建议。",
};
const en = {
  title: "Trade Journal / Performance",
  subtitle: "Enter a list of per-trade returns (decimals, e.g. 0.05 = +5%) to read win rate, profit factor, payoff, expectancy, losing streaks, Sharpe/Sortino & ruin odds, plus a grade. Educational tool, not investment advice.",
  preset: "Choose example",
  custom: "Custom trade log",
  customHint: "Per-trade returns separated by comma/space/line, at least 2; leave blank to use an example above.",
  grade: "Performance Grade",
  totalReturn: "Total Return",
  winRate: "Win Rate",
  profitFactor: "Profit Factor",
  payoff: "Payoff",
  expectancy: "Expectancy",
  probRuin: "Prob. Ruin",
  sharpe: "Sharpe",
  sortino: "Sortino",
  maxLossStreak: "Max Loss Streak",
  maxWinStreak: "Max Win Streak",
  trades: "Trades",
  cagr: "CAGR",
  count: "W/L",
  disclaimer: "Example logs are illustrative; profit factor / expectancy / ruin odds are historical estimates and future results may differ. Not investment advice.",
};

