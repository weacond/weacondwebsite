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
import { fibTimeSummary, FIB_TIME_PRESETS, TIME_MULTS } from "../lib/fibTime";
export const metadata = {
  title: "斐波那契时间周期 — Weacond",
  description: "时间轴斐波那契预测：t2+T×φ。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
function fmtNum(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
}
export default function FibTimePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [t2, setT2] = useState(50);
  const [T, setT] = useState(10);
  const [cur, setCur] = useState(55);
  const res = useMemo(() => fibTimeSummary({ t2, T, currentTime: cur }), [t2, T, cur]);
  const applyPreset = (p) => {
    setT2(p.t2); setT(p.T); setCur(p.currentTime);
  };
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="fib-time" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/fib-time"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Fibonacci Time Zones", href: "/fib-time" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(FIB_TIME_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.t2Label}</span>
              <input type="number" value={t2} min={1} step={1}
                onChange={(e) => setT2(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.tLabel}</span>
              <input type="number" value={T} min={1} step={1}
                onChange={(e) => setT(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.curLabel}</span>
              <input type="number" value={cur} min={1} step={1}
                onChange={(e) => setCur(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          {res.valid ? (
            <>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.nextLabel}</div>
                <div className="text-3xl font-bold text-indigo-600">
                  {res.next ? fmtNum(res.next) : L.exhausted}
                </div>
                {res.status.next && (
                  <div className="text-xs text-slate-400 mt-1">
                    {L.zoneInfo} {res.status.zoneIndex + 1}/{res.status.zonesTotal} · {Math.round(res.status.progress * 100)}%
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {TIME_MULTS.map((m, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 text-center">
                    <div className="text-xs text-slate-400">{fmtNum(m)}×</div>
                    <div className="text-sm font-bold text-slate-800">{fmtNum(res.predictions[i])}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}
          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/fibonacci" className="text-indigo-500 hover:underline">→ {L.linkFib}</Link>
            {" · "}
            <Link href="/pivots" className="text-indigo-500 hover:underline">→ {L.linkPivots}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
const zh = {
  title: "斐波那契时间周期",
  subtitle: "时间轴预测：t2+T×φ。教育性参考。",
  howToTitle: "如何使用斐波那契时间周期计算器",
  howTo: [
    "输入参考时间点 t1、t2 与间隔 T。",
    "计算器按 t2+T×φ 预测下一组时间窗口。",
    "用于时间轴预测（教育性参考）。",
  ],
  t2Label: "摆动结束 t₂",
  tLabel: "周期 T（根）",
  curLabel: "当前时间",
  nextLabel: "下一转折点",
  zoneInfo: "区间",
  exhausted: "已超越",
  invalid: "T 须 > 0。",
  disclaimer: "简化模型，非投资建议。",
  linkFib: "斐波那契",
  linkPivots: "枢轴点",
  presetLabels: { short: "短期 T=5", medium: "中期 T=20", long: "长期 T=50", intraday: "日内 T=2", weekly: "周线 T=8" },
};
const en = {
  title: "Fibonacci Time Zones",
  subtitle: "Time-axis prediction: t2+T×φ. Educational.",
  howToTitle: "How to use the Fibonacci time-zones calculator",
  howTo: [
    "Enter reference points t1, t2 and interval T.",
    "The calculator predicts the next time windows via t2 + T×φ.",
    "Use it for time-axis prediction (educational).",
  ],
  t2Label: "Swing end t₂",
  tLabel: "Period T (bars)",
  curLabel: "Current time",
  nextLabel: "Next turning point",
  zoneInfo: "Zone",
  exhausted: "Exhausted",
  invalid: "T must be > 0.",
  disclaimer: "Simplified model. Not investment advice.",
  linkFib: "Fibonacci",
  linkPivots: "Pivots",
  presetLabels: { short: "Short T=5", medium: "Med T=20", long: "Long T=50", intraday: "Intraday T=2", weekly: "Weekly T=8" },
};