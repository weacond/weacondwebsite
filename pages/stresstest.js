"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import Link from "next/link";
import { DEFAULT_PORTFOLIO, stressAll, STRESS_SCENARIOS, totalWeight } from "../lib/stressTest";

export const metadata = {
  title: "组合压力测试 — 情景分析 — Weacond",
  description: "把你的组合放到 2008 / 2020 / 2022 利率 / 2018 波动情景中，看每只资产贡献与总损失。教育性参考。",
  robots: { index: true, follow: true },
};

export default function StressTestPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const results = stressAll(DEFAULT_PORTFOLIO);
  const tw = totalWeight(DEFAULT_PORTFOLIO);
  const worstPL = results[0].pl;
  // 归一化刻度：以绝对值最大的 |PL| 为满格
  const scale = Math.max(...results.map((r) => Math.abs(r.pl)), 1);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="stresstest" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/stresstest"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Portfolio Stress Test", href: "/stresstest" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          {/* 组合构成 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-6">
            <div className="text-xs text-slate-400 mb-2">{L.portfolio}</div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_PORTFOLIO.map((a) => (
                <span key={a.key} className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600">
                  {lang === "en" ? a.nameEn : a.name} {Math.round(a.weight * 100)}%
                </span>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">{L.weightNote(tw)}</p>
          </div>

          {/* 情景结果 */}
          <div className="space-y-4">
            {results.map((r) => {
              const s = STRESS_SCENARIOS.find((x) => x.key === r.scenario);
              const isWorst = r.scenario === results[0].scenario;
              const barW = (Math.abs(r.pl) / scale) * 100;
              return (
                <div key={r.scenario} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">
                      {lang === "en" ? s.nameEn : s.name}
                      {isWorst && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">{L.worstTag}</span>}
                    </span>
                    <span className="text-lg font-bold font-mono" style={{ color: r.pl < 0 ? "#dc2626" : "#16a34a" }}>
                      {r.pl > 0 ? "+" : ""}{r.pl.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{lang === "en" ? s.descEn : s.desc}</p>

                  {/* 损失条 */}
                  <div className="h-2 bg-slate-100 rounded-full mb-3">
                    <div className="h-2 rounded-full bg-red-400" style={{ width: `${barW}%` }} />
                  </div>

                  {/* 贡献分解 */}
                  <div className="space-y-1">
                    {[...r.contributions].sort((a, b) => a.contribution - b.contribution).map((c) => {
                      const cW = (Math.abs(c.contribution) / scale) * 100;
                      return (
                        <div key={c.key} className="flex items-center gap-2 text-xs">
                          <span className="w-20 text-slate-500">{lang === "en" ? c.nameEn : c.name}</span>
                          <span className="w-12 text-right font-mono text-slate-400">{Math.round(c.weight * 100)}%</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full relative">
                            <div className="absolute h-1.5 rounded-full" style={{
                              left: c.contribution >= 0 ? "50%" : `${100 - cW / 2}%`,
                              width: `${cW / 2}%`,
                              background: c.contribution >= 0 ? "#22c55e" : "#ef4444",
                            }} />
                            <div className="absolute left-1/2 top-0 w-px h-1.5 bg-slate-300" />
                          </div>
                          <span className="w-12 text-right font-mono" style={{ color: c.contribution >= 0 ? "#16a34a" : "#dc2626" }}>
                            {c.contribution > 0 ? "+" : ""}{c.contribution.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {L.impact} <span className="font-mono" style={{ color: "#dc2626" }}>{lang === "en" ? r.worst.nameEn : r.worst.name}</span>
                    {" · "}{L.support} <span className="font-mono" style={{ color: "#16a34a" }}>{lang === "en" ? r.best.nameEn : r.best.name}</span>
                  </p>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 mt-6 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/portfolio" className="text-indigo-500 hover:underline">→ {L.linkPortfolio}</Link>
            {" · "}
            <Link href="/montecarlo" className="text-indigo-500 hover:underline">→ {L.linkMonteCarlo}</Link>
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
  title: "组合压力测试",
  subtitle: "把组合放进 2008 金融危机、2020 新冠、2022 加息、2018 Q4 波动等情景，看总损失与每只资产的贡献。",
  howToTitle: "如何使用组合压力测试计算器",
  howTo: [
    "选择或输入组合中各资产的权重。",
    "计算器把组合放入 2008 / 2020 / 2022 / 2018 Q4 等历史情景。",
    "查看总损失与每只资产的贡献。",
  ],
  portfolio: "组合构成",
  weightNote: (w) => `权重合计 ${Math.round(w * 100)}%（理想 100%）`,
  worstTag: "最痛",
  impact: "冲击最大",
  support: "对冲最大",
  disclaimer: "情景为示意性历史近似，非精确复现；冲击为整段收益率。教育用途，不构成投资建议。",
  linkPortfolio: "组合优化器",
  linkMonteCarlo: "蒙特卡洛",
  linkRisk: "风险仪表盘",
};
const en = {
  title: "Portfolio Stress Test",
  subtitle: "Run your portfolio through 2008 GFC, 2020 COVID, 2022 rates, 2018 Q4 vol — see total loss and each asset's contribution.",
  howToTitle: "How to use the portfolio stress-test calculator",
  howTo: [
    "Select or enter each asset's weight in the portfolio.",
    "The calculator runs the portfolio through 2008 / 2020 / 2022 / 2018 Q4 scenarios.",
    "See total loss and each asset's contribution.",
  ],
  portfolio: "Portfolio mix",
  weightNote: (w) => `Weights sum to ${Math.round(w * 100)}% (ideal 100%)`,
  worstTag: "worst",
  impact: "Biggest hit",
  support: "Biggest cushion",
  disclaimer: "Scenarios are illustrative historical approximations, not exact replays; shocks are full-period returns. For education, not investment advice.",
  linkPortfolio: "Portfolio optimizer",
  linkMonteCarlo: "Monte Carlo",
  linkRisk: "Risk dashboard",
};

