"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import { interestParitySummary, INTEREST_PARITY_PRESETS } from "../lib/interestParity";
export const metadata = {
  title: "利率平价 / 远期汇率计算器 — Weacond",
  description: "远期 F = S×(1+r_d)^t/(1+r_f)^t；升贴水≈利差；市场与理论远期之差=套利基差。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "利率平价 / 远期汇率计算器",
  subtitle: "理论远期 F = 即期 S × (1+r_d)^t / (1+r_f)^t；升贴水 ≈ 利差；市场远期与理论远期之差 = 套利基差。教育性参考，非投资建议。",
  spotLabel: "即期汇率", domLabel: "本币利率 %", forLabel: "外币利率 %", yearsLabel: "期限(年)", mktLabel: "市场远期(选填)",
  presetLabels: { domHigher: "本币5% vs 外币1% · 1y", domLower: "本币1% vs 外币5% · 1y", equal: "利率相等 3% · 2y", longTerm: "5% vs 2% · 5y", halfYear: "6% vs 3% · 0.5y" },
  resultTitle: "结果", fwdLabel: "理论远期", premLabel: "升贴水", misLabel: "套利基差", bandLabel: "升贴水等级",
  bandText: { flat: "平", small: "小", moderate: "中", large: "大", invalid: "无效" },
  learnTitle: "学习",
  learn: "利率平价：本币利率高于外币，本币远期贴水（F<S），因本币持有成本更高。远期 F = S×(1+r_d)^t/(1+r_f)^t。升贴水 ≈ r_d − r_f（小幅时）。市场远期偏离理论值即存在套利机会（扣除成本后）。",
};
const en = {
  title: "Interest Rate Parity / Forward Rate",
  subtitle: "Theoretical forward F = S × (1+r_d)^t / (1+r_f)^t; premium ≈ rate spread; market vs theoretical forward = arbitrage basis. Educational, not investment advice.",
  spotLabel: "Spot", domLabel: "Domestic %", forLabel: "Foreign %", yearsLabel: "Years", mktLabel: "Mkt Forward (opt)",
  presetLabels: { domHigher: "Dom 5% vs For 1% · 1y", domLower: "Dom 1% vs For 5% · 1y", equal: "Equal 3% · 2y", longTerm: "5% vs 2% · 5y", halfYear: "6% vs 3% · 0.5y" },
  resultTitle: "Results", fwdLabel: "Theory Forward", premLabel: "Premium", misLabel: "Arb Basis", bandLabel: "Premium Level",
  bandText: { flat: "Flat", small: "Small", moderate: "Moderate", large: "Large", invalid: "Invalid" },
  learnTitle: "Learn",
  learn: "Interest rate parity: when domestic rate exceeds foreign, the domestic currency trades at a forward discount (F<S), reflecting higher carry. Forward F = S×(1+r_d)^t/(1+r_f)^t. Premium ≈ r_d − r_f for small spreads. A market forward deviating from theory implies arbitrage (after costs).",
};

function fmtNum(x, d = 4) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(d);
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(3) + "%";
}

export default function InterestParityPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [spot, setSpot] = useState(1);
  const [dom, setDom] = useState(5);
  const [forR, setForR] = useState(1);
  const [years, setYears] = useState(1);
  const [mkt, setMkt] = useState("");
  const res = useMemo(
    () => interestParitySummary({ spot, domRatePct: dom, forRatePct: forR, years, marketForward: mkt === "" ? undefined : parseFloat(mkt) }),
    [spot, dom, forR, years, mkt],
  );
  const applyPreset = (p) => {
    setSpot(p.spot); setDom(p.domRatePct); setForR(p.forRatePct); setYears(p.years);
  };
  const band = res.band || "invalid";
  const bandColor =
    band === "flat" ? "text-slate-400" :
    band === "small" ? "text-emerald-600" :
    band === "moderate" ? "text-amber-600" :
    band === "large" ? "text-rose-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>{L.title} — Weacond</title>
        <meta name="description" content={L.subtitle} />
      </Head>
      <CalcLd slug="interest-parity" />
      <Navbar />
      <section className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{L.title}</h1>
        <p className="text-sm text-slate-500 mb-6">{L.subtitle}</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.values(INTEREST_PARITY_PRESETS).map((p) => (
            <button key={p.id} onClick={() => applyPreset(p)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:border-indigo-300 transition">
              {L.presetLabels[p.id] || p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <label className="block">
            <span className="text-xs text-slate-500">{L.spotLabel}</span>
            <input type="number" value={spot} min={0} step={0.01}
              onChange={(e) => setSpot(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{L.domLabel}</span>
            <input type="number" value={dom} step={0.1}
              onChange={(e) => setDom(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{L.forLabel}</span>
            <input type="number" value={forR} step={0.1}
              onChange={(e) => setForR(parseFloat(e.target.value) || 0)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{L.yearsLabel}</span>
            <input type="number" value={years} min={0} step={0.25}
              onChange={(e) => setYears(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{L.mktLabel}</span>
            <input type="number" value={mkt} step={0.01} placeholder="—"
              onChange={(e) => setMkt(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
          </label>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.resultTitle}</h2>
          {res.valid ? (
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-slate-400">{L.fwdLabel}</div><div className="font-mono text-lg">{fmtNum(res.forward)}</div></div>
              <div><div className="text-xs text-slate-400">{L.premLabel}</div><div className="font-mono text-lg">{fmtPct(res.premium)}</div></div>
              <div><div className="text-xs text-slate-400">{L.misLabel}</div><div className="font-mono text-lg">{res.mispricing ? fmtPct(res.mispricing) : "—"}</div></div>
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