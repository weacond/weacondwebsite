"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import { fearGauge, FEAR_PRESETS } from "../lib/fearIndex";

export const metadata = {
  title: "市场恐惧指数 — Weacond",
  description: "VIX 风格恐惧仪表：确定性合成序列 + 0~100 恐惧分 + 情绪标签。教育性示例数据。",
  robots: { index: true, follow: true },
};

// VIX 风格序列迷你折线（自包含 SVG）
function VixSparkline({ data }) {
  const w = 640, h = 140, pad = 6;
  if (!data || data.length < 2) return null;
  const max = Math.max(...data) || 1;
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (v - min) / range) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#ef4444" strokeWidth="1.5" />
    </svg>
  );
}

export default function FearPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [presetId, setPresetId] = useState("calm");
  const active = FEAR_PRESETS.find((p) => p.id === presetId) || FEAR_PRESETS[0];

  const g = useMemo(() => fearGauge(active.seed, active.n, active.opts), [active]);

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
            {FEAR_PRESETS.map((p) => (
              <button key={p.id} onClick={() => setPresetId(p.id)}
                className={`px-3 py-1.5 rounded-full text-xs border transition ${presetId === p.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 hover:border-indigo-300"}`}>
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 text-center">
            <div className="text-xs text-slate-400 mb-1">{L.gaugeLabel}</div>
            <div className={`text-5xl font-bold mb-1 ${g.score > 60 ? "text-red-600" : g.score > 30 ? "text-amber-500" : "text-green-600"}`}>
              {g.score.toFixed(0)}
            </div>
            <div className="text-sm text-slate-500 mb-4">
              {lang === "en" ? g.labelEn : g.label} · VIX≈{g.vix.toFixed(1)}
            </div>
            <VixSparkline data={g.series} />
          </div>

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/regime" className="text-indigo-500 hover:underline">→ {L.linkRegime}</Link>
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
  title: "市场恐惧指数",
  subtitle: "VIX 风格恐惧仪表：确定性合成序列 + 0~100 恐惧分 + 情绪标签。",
  gaugeLabel: "恐惧分（0~100）",
  disclaimer: "本指数由确定性合成序列演示，非实时 VIX 行情，仅作教学参考，不构成投资建议。",
  linkRegime: "市场状态",
  linkRisk: "风险仪表盘",
  presetLabels: { calm: "平静市", volatile: "波动市", crisis: "危机市" },
};
const en = {
  title: "Market Fear Index",
  subtitle: "A VIX-style fear gauge: a deterministic synthetic series mapped to a 0–100 score and mood label.",
  gaugeLabel: "Fear score (0–100)",
  disclaimer: "This index is a deterministic synthetic illustration, not live VIX data. Educational only — not investment advice.",
  linkRegime: "Market regime",
  linkRisk: "Risk dashboard",
  presetLabels: { calm: "Calm", volatile: "Volatile", crisis: "Crisis" },
};

