"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import StructuredData from "../components/StructuredData";
import { softwareLd } from "../lib/jsonLd";
import { assessWinRate } from "../lib/winRateStats";
import SeoHead from "../components/SeoHead";

const TOOL = {
  id: "winrate",
  icon: "🎲",
  title: "胜率显著性",
  titleEn: "Win-Rate Significance",
  desc: "Wilson 95% 置信区间 + 二项检验：这个回测胜率是真 edge 还是抛硬币？",
  descEn: "Wilson 95% CI + binomial test: is this backtest win rate a real edge or a coin flip?",
  href: "/winrate",
  category: "risk",
};

export default function WinRatePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [wins, setWins] = useState(60);
  const [total, setTotal] = useState(100);
  const [avgWin, setAvgWin] = useState(100);
  const [avgLoss, setAvgLoss] = useState(50);

  const r = assessWinRate(Number(wins), Number(total), {
    avgWin: Number(avgWin),
    avgLoss: Number(avgLoss),
    grossProfit: Number(avgWin) * Number(wins),
    grossLoss: Number(avgLoss) * Math.max(0, Number(total) - Number(wins)),
  });
  const sig = r && r.significant;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title} — Weacond</title>
        <meta name="description" content={L.subtitle} />
        <SeoHead title={L.title} description={L.subtitle} path="/winrate" />
      </Head>
      <StructuredData data={[softwareLd(TOOL)]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">{TOOL.icon}</span>
            <h1 className="text-3xl font-bold">{L.title}</h1>
          </div>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Field label={L.wins} value={wins} onChange={setWins} min={0} max={Number(total)} />
            <Field label={L.total} value={total} onChange={setTotal} min={1} />
            <Field label={L.avgWin} value={avgWin} onChange={setAvgWin} min={0} />
            <Field label={L.avgLoss} value={avgLoss} onChange={setAvgLoss} min={0} />
          </div>

          {r ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label={L.winRate} value={`${(r.winRate * 100).toFixed(1)}%`} />
                <Stat
                  label={L.ci95}
                  value={`${(r.confidenceBand[0] * 100).toFixed(1)}% – ${(r.confidenceBand[1] * 100).toFixed(1)}%`}
                />
                <Stat label="z" value={r.z.toFixed(2)} />
                <Stat label="p" value={r.pValue < 0.001 ? "<0.001" : r.pValue.toFixed(3)} />
              </div>

              <div
                className={`rounded-xl p-5 border ${
                  sig ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="font-semibold mb-1">
                  {sig ? "✅ " + L.significant : "⚠️ " + L.notSignificant}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {sig ? L.significantNote : L.notSignificantNote}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat label={L.expectancy} value={`${expectancyPct(r, avgWin)}`} />
                <Stat
                  label={L.profitFactor}
                  value={r.profitFactor === Infinity ? "∞" : r.profitFactor.toFixed(2)}
                />
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{L.disclaimer}</p>
            </div>
          ) : (
            <p className="text-amber-600 text-sm">{L.invalid}</p>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function expectancyPct(r, base) {
  if (!r || !Number.isFinite(r.expectancy)) return "∞";
  const b = Math.max(1, Number(base || 1));
  return `${((r.expectancy / b) * 100).toFixed(1)}%`;
}

function Field({ label, value, onChange, min, max }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
      />
    </label>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

const zh = {
  title: "胜率显著性检验",
  subtitle:
    "把裸胜率升级为统计结论：Wilson 95% 置信区间 + 二项检验（是否显著优于 50% 抛硬币），并给出期望与盈亏比。",
  wins: "盈利笔数",
  total: "总笔数",
  avgWin: "平均盈利",
  avgLoss: "平均亏损",
  winRate: "胜率",
  ci95: "95% 置信区间",
  expectancy: "每笔期望(相对平均盈利)",
  profitFactor: "盈亏比",
  significant: "统计显著",
  notSignificant: "不显著",
  significantNote:
    "在 5% 显著性水平下，该胜率显著高于抛硬币；说明样本内存在统计 edge（仍可能与过拟合/样本敏感有关）。",
  notSignificantNote:
    "在 5% 显著性水平下，无法拒绝「胜率=50%」的零假设；样本不足以证明 edge，建议扩大样本或降低期望。",
  invalid: "请输入合法的盈利笔数与总笔数（0 ≤ 盈利笔数 ≤ 总笔数，总笔数 > 0）。",
  disclaimer:
    "教育性参考，非投资建议。显著性只说明样本内统计意义，不保证未来表现；小样本易过拟合，请配合样本外验证与止损。",
};
const en = {
  title: "Win-Rate Significance",
  subtitle:
    "Upgrade a bare win rate into a statistical verdict: Wilson 95% CI + binomial test (is it significantly better than 50%?), plus expectancy and profit factor.",
  wins: "Winning trades",
  total: "Total trades",
  avgWin: "Avg win",
  avgLoss: "Avg loss",
  winRate: "Win rate",
  ci95: "95% CI",
  expectancy: "Expectancy (% of avg win)",
  profitFactor: "Profit factor",
  significant: "Statistically significant",
  notSignificant: "Not significant",
  significantNote:
    "At the 5% level this win rate is significantly above a coin flip — a statistical edge exists in-sample (still could be overfit / sample-sensitive).",
  notSignificantNote:
    "At the 5% level we cannot reject H0 (p=50%); the sample is too small to prove an edge — enlarge it or lower expectations.",
  invalid: "Enter valid counts (0 ≤ wins ≤ total, total > 0).",
  disclaimer:
    "Educational only, not investment advice. Significance is in-sample; it does not guarantee future results. Small samples overfit — pair with out-of-sample checks and stops.",
};

