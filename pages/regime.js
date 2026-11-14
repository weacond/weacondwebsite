"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import Link from "next/link";
import { evaluateRegime, REGIME_PRESETS } from "../lib/regime";

export const metadata = {
  title: "市场状态分类器 — 风险偏好 / 规避 — Weacond",
  description: "由 VIX、价格 vs 200 日均线、10Y-2Y 利差、信用利差判定当前 Risk-On 还是 Risk-Off。教育性参考。",
  robots: { index: true, follow: true },
};

export default function RegimePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [vix, setVix] = useState(18);
  const [spyVsMa200, setSpyVsMa200] = useState(0);
  const [yieldSpread, setYieldSpread] = useState(0.3);
  const [creditOAS, setCreditOAS] = useState(500);

  const inputs = { vix, spyVsMa200, yieldSpread, creditOAS };
  const result = evaluateRegime(inputs);
  const total = result.total;
  const regime = result.regime;

  const applyPreset = (id) => {
    const p = REGIME_PRESETS[id];
    setVix(p.inputs.vix);
    setSpyVsMa200(p.inputs.spyVsMa200);
    setYieldSpread(p.inputs.yieldSpread);
    setCreditOAS(p.inputs.creditOAS);
  };

  const gaugePct = ((total + 100) / 200) * 100;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="regime" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/regime"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Market Regime Classifier", href: "/regime" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(REGIME_PRESETS).map(([id, p]) => (
              <button
                key={id}
                onClick={() => applyPreset(id)}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 transition"
              >
                {lang === "en" ? p.labelEn : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <Field label={L.fields.vix} min={0} max={100} value={vix} onChange={setVix} />
            <Field label={L.fields.price} unit="%" min={-30} max={30} value={spyVsMa200} onChange={setSpyVsMa200} step={0.1} />
            <Field label={L.fields.yield} unit="%" min={-3} max={3} value={yieldSpread} onChange={setYieldSpread} step={0.01} />
            <Field label={L.fields.credit} unit="bp" min={200} max={1500} value={creditOAS} onChange={setCreditOAS} step={10} />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
            <div className="text-center mb-4">
              <div className="text-xs text-slate-400 mb-1">{L.score}</div>
              <div className="text-4xl font-bold" style={{ color: total >= 15 ? "#16a34a" : total <= -15 ? "#dc2626" : "#64748b" }}>
                {total > 0 ? "+" : ""}{total.toFixed(1)}
              </div>
              <div className="mt-2 inline-block px-4 py-1 rounded-full text-sm font-semibold" style={{
                background: total >= 15 ? "#dcfce7" : total <= -15 ? "#fee2e2" : "#f1f5f9",
                color: total >= 15 ? "#166534" : total <= -15 ? "#991b1b" : "#475569",
              }}>
                {lang === "en" ? regime.labelEn : regime.label}
              </div>
            </div>

            <div className="relative h-3 rounded-full bg-gradient-to-r from-red-400 via-slate-300 to-green-400 mb-2">
              <div className="absolute -top-1 w-1 h-5 bg-slate-800 rounded" style={{ left: `calc(${gaugePct}% - 2px)` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-4">
              <span>Risk-Off</span><span>Neutral</span><span>Risk-On</span>
            </div>

            <p className="text-sm text-slate-600 mb-4">{lang === "en" ? regime.descEn : regime.desc}</p>

            <div>
              <div className="text-xs text-slate-400 mb-2">{L.components}</div>
              <div className="space-y-2">
                {result.components.map((c) => {
                  const pct = (c.value + 40) / 80 * 100;
                  return (
                    <div key={c.key} className="flex items-center gap-2 text-xs">
                      <span className="w-28 text-slate-500">{c.label}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full relative">
                        <div className="absolute h-2 rounded-full" style={{
                          left: c.value >= 0 ? "50%" : `${pct}%`,
                          width: `${Math.abs(pct - 50)}%`,
                          background: c.value >= 0 ? "#22c55e" : "#ef4444",
                        }} />
                        <div className="absolute left-1/2 top-0 w-px h-2 bg-slate-300" />
                      </div>
                      <span className="w-10 text-right font-mono" style={{ color: c.value >= 0 ? "#16a34a" : "#dc2626" }}>
                        {c.value > 0 ? "+" : ""}{c.value.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">{L.barNote}</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
            {" · "}
            <Link href="/glossary" className="text-indigo-500 hover:underline">→ {L.linkGlossary}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Field({ label, value, onChange, unit, min, max, step }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step || 1}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
        />
        {unit && <span className="text-xs text-slate-400 w-6">{unit}</span>}
      </div>
    </label>
  );
}

const zh = {
  title: "市场状态分类器",
  subtitle: "综合 VIX、价格趋势、利率曲线、信用利差，判定当前市场偏向 Risk-On（风险偏好）还是 Risk-Off（风险规避）。",
  howToTitle: "如何使用市场状态分类器",
  howTo: [
    "输入 VIX、价格趋势、利率曲线斜率与信用利差。",
    "计算器综合这些信号判定市场偏向 Risk-On 还是 Risk-Off。",
    "查看风险偏好/规避判定，辅助资产配置。",
  ],
  fields: { vix: "VIX 隐含波动率", price: "价格 vs 200 日均线", yield: "10Y-2Y 利差", credit: "高收益信用利差 OAS" },
  score: "综合得分（−100 ~ +100）",
  components: "分项贡献（绿=偏 Risk-On，红=偏 Risk-Off）",
  barNote: "以 0 为中心，向右为风险偏好，向左为风险规避。",
  disclaimer: "本工具为教学演示，采用简化的线性打分模型；真实市场状态需结合更多数据与判断。不构成投资建议。",
  linkRisk: "风险仪表盘",
  linkGlossary: "概念词典",
};
const en = {
  title: "Market Regime Classifier",
  subtitle: "Combine VIX, price trend, the yield curve and credit spreads to judge whether the market is tilting Risk-On or Risk-Off.",
  howToTitle: "How to use the market-regime classifier",
  howTo: [
    "Enter VIX, price trend, yield-curve slope and credit spreads.",
    "The calculator combines these signals to judge Risk-On vs Risk-Off.",
    "Read the risk-appetite / avoidance verdict to inform allocation.",
  ],
  fields: { vix: "VIX (implied vol)", price: "Price vs 200-DMA", yield: "10Y-2Y spread", credit: "HY credit OAS" },
  score: "Composite score (−100 ~ +100)",
  components: "Component contributions (green = Risk-On, red = Risk-Off)",
  barNote: "Centered at 0; right is risk-appetite, left is caution.",
  disclaimer: "Educational demo using a simplified linear scoring model; real regime calls need more data and judgment. Not investment advice.",
  linkRisk: "Risk dashboard",
  linkGlossary: "Glossary",
};

