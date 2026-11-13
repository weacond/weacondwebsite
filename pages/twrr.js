"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import { twrrSummary, TWRR_PRESETS } from "../lib/twrr";
export const metadata = {
  title: "时间加权收益率 TWRR 计算器 — Weacond",
  description: "TWRR=Π(1+r)−1 几何链接、现金流中性；年化几何 vs 算术；波动拖累。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "时间加权收益率 (TWRR) 计算器",
  subtitle: "总收益 = Π(1+r)−1（几何链接，对现金流中性）；年化几何 vs 算术；波动拖累。教育性参考，非投资建议。",
  returnsLabel: "每期收益 %（逗号/空格分隔）", ppyLabel: "每年期数",
  presetLabels: { steady: "稳健月 +1%", volatile: "震荡 ±3%", bullRun: "牛市 6个月", daily: "日收益 0.1%", losses: "连续亏损" },
  resultTitle: "结果", countLabel: "期数", totalLabel: "总收益", annLabel: "年化几何", dragLabel: "波动拖累", bandLabel: "年化等级",
  bandText: { negative: "负", low: "低", moderate: "中", high: "高", "very-high": "极高", invalid: "无效" },
  learnTitle: "学习",
  learn: "TWRR 几何链接各子期收益，对资金进出中性，适合评估投资经理。总收益=Π(1+r_i)−1；年化几何=[Π(1+r_i)]^(年/期)−1。算术年化=均值×每年期数；几何通常更低，差额=波动拖累（AM≥GM）。连续大波动会显著拉低复合收益。"
};

function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(3) + "%";
}

export default function TwrrPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [returnsStr, setReturnsStr] = useState("0.05, 0.08, -0.02, 0.1");
  const [ppy, setPpy] = useState(12);
  const res = useMemo(
    () => twrrSummary({ returns: returnsStr, periodsPerYear: ppy }),
    [returnsStr, ppy],
  );
  const applyPreset = (p) => {
    setReturnsStr(p.returns); setPpy(p.periodsPerYear);
  };
  const band = res.band || "invalid";
  const bandColor =
    band === "negative" ? "text-rose-600" :
    band === "low" ? "text-emerald-600" :
    band === "moderate" ? "text-indigo-600" :
    band === "high" ? "text-amber-600" :
    band === "very-high" ? "text-emerald-500" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>{L.title} — Weacond</title>
        <meta name="description" content={L.subtitle} />
      </Head>
      <Navbar />
      <section className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{L.title}</h1>
        <p className="text-sm text-slate-500 mb-6">{L.subtitle}</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.values(TWRR_PRESETS).map((p) => (
            <button key={p.id} onClick={() => applyPreset(p)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:border-indigo-300 transition">
              {L.presetLabels[p.id] || p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <label className="block col-span-2">
            <span className="text-xs text-slate-500">{L.returnsLabel}</span>
            <input type="text" value={returnsStr}
              onChange={(e) => setReturnsStr(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{L.ppyLabel}</span>
            <input type="number" value={ppy} min={1} step={1}
              onChange={(e) => setPpy(Math.max(1, parseFloat(e.target.value) || 1))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
          </label>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.resultTitle}</h2>
          {res.valid ? (
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-slate-400">{L.countLabel}</div><div className="font-mono text-lg">{res.count}</div></div>
              <div><div className="text-xs text-slate-400">{L.totalLabel}</div><div className="font-mono text-lg">{fmtPct(res.total)}</div></div>
              <div><div className="text-xs text-slate-400">{L.annLabel}</div><div className="font-mono text-lg">{fmtPct(res.annualized)}</div></div>
              <div>
                <div className="text-xs text-slate-400">{L.dragLabel}</div>
                <div className="font-mono text-lg">{res.drag === null ? "—" : fmtPct(res.drag)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">{L.bandLabel}</div>
                <div className={`font-semibold ${bandColor}`}>{L.bandText[band] || band}</div>
              </div>
            </div>
          ) : <p className="text-slate-400 text-sm">{L.subtitle}</p>}
        </div>
        <div className="bg-indigo-50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-indigo-900 mb-2">{L.learnTitle}</h2>
          <p className="text-sm text-indigo-800 leading-relaxed">{L.learn}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}