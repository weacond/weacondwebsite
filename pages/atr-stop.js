"use client";

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import {
  atrSummary, rrBand, ATR_PRESETS,
} from "../lib/atrStop";

export const metadata = {
  title: "ATR 止损与头寸计算器 — Weacond",
  description: "用 ATR 定止损距离与风险头寸：止损 = 入场 ± N·ATR，头寸 = 风险金额 / 止损距离。教育性参考。",
  robots: { index: true, follow: true },
};

export default function AtrStopPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [account, setAccount] = useState(10000);
  const [riskPct, setRiskPct] = useState(1);
  const [side, setSide] = useState("long");
  const [entry, setEntry] = useState(100);
  const [atrVal, setAtrVal] = useState(1.5);
  const [mult, setMult] = useState(1.5);
  const [target, setTarget] = useState(104);

  const res = useMemo(
    () => atrSummary({ account, riskPct, side, entry, atrVal, mult, target }),
    [account, riskPct, side, entry, atrVal, mult, target],
  );

  const applyPreset = (p) => {
    setAccount(p.account);
    setRiskPct(p.riskPct);
    setSide(p.side || "long");
    setEntry(p.entry);
    setAtrVal(p.atrVal);
    setMult(p.mult);
    setTarget(p.target);
  };

  const rr = res.rr;
  const band = rr ? rrBand(rr.ratio) : null;
  const bandColor =
    band === "strong" ? "text-emerald-600" :
    band === "fair" ? "text-amber-600" :
    band === "thin" ? "text-orange-600" : "text-red-600";

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
            {Object.values(ATR_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.accountLabel}</span>
              <input type="number" value={account} min={0} step={100}
                onChange={(e) => setAccount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.riskLabel}</span>
              <input type="number" value={riskPct} min={0} step={0.1}
                onChange={(e) => setRiskPct(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.sideLabel}</span>
              <select value={side} onChange={(e) => setSide(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                <option value="long">{L.sides.long}</option>
                <option value="short">{L.sides.short}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.atrLabel}</span>
              <input type="number" value={atrVal} min={0} step={0.01}
                onChange={(e) => setAtrVal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.multLabel}</span>
              <input type="number" value={mult} min={0} step={0.1}
                onChange={(e) => setMult(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.entryLabel}</span>
              <input type="number" value={entry} min={0} step={0.01}
                onChange={(e) => setEntry(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-slate-500">{L.targetLabel}</span>
              <input type="number" value={target} min={0} step={0.01}
                onChange={(e) => setTarget(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {res.valid ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.stopLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.stop.stop.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.sharesLabel}</div>
                  <div className="text-xl font-bold text-indigo-600">{res.size.shares.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.riskAmountLabel}</div>
                  <div className="text-xl font-bold text-red-600">{res.size.risk.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.stopDistLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.stop.dist.toFixed(2)}</div>
                </div>
              </div>

              {rr && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4 text-center">
                  <div className="text-xs text-slate-400 mb-1">{L.rrLabel}</div>
                  <div className={`text-3xl font-bold ${bandColor}`}>1 : {Number.isFinite(rr.ratio) ? rr.ratio.toFixed(2) : "∞"}</div>
                  <div className={`text-xs mt-1 ${bandColor}`}>{L.bandLabels ? L.bandLabels[band] : band}</div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-red-500 text-center py-6">{L.invalid}</p>
          )}

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/position-size" className="text-indigo-500 hover:underline">→ {L.linkPosition}</Link>
            {" · "}
            <Link href="/r-multiple" className="text-indigo-500 hover:underline">→ {L.linkR}</Link>
            {" · "}
            <Link href="/leverage" className="text-indigo-500 hover:underline">→ {L.linkLeverage}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "ATR 止损与头寸计算器",
  subtitle: "用 ATR 定止损距离与风险头寸：止损 = 入场 ± N·ATR，头寸 = 风险金额 / 止损距离。",
  accountLabel: "账户权益",
  riskLabel: "单笔风险 %",
  sideLabel: "方向",
  atrLabel: "ATR 值",
  multLabel: "ATR 倍数 N",
  entryLabel: "入场价",
  targetLabel: "目标价",
  stopLabel: "止损价",
  sharesLabel: "头寸股数",
  riskAmountLabel: "风险金额",
  stopDistLabel: "止损距离",
  rrLabel: "盈亏比",
  invalid: "ATR 与倍数须为正数。",
  disclaimer: "ATR 止损为波动自适应的近似，未计滑点/资金费，不构成投资建议。",
  linkPosition: "头寸管理",
  linkR: "R 倍数",
  linkLeverage: "杠杆与强平",
  sides: { long: "多", short: "空" },
  bandLabels: { poor: "无盈亏比", thin: "偏薄 <1", fair: "合理 1–2", strong: "优秀 ≥2" },
  presetLabels: { dayLong: "日内多头", swingShort: "波段空头", cryptoLong: "币圈多头", simple: "简单示例" },
};
const en = {
  title: "ATR Stop & Position Size",
  subtitle: "Size positions from ATR: stop = entry ± N·ATR, shares = risk$ / stop distance. Volatility-adaptive risk control.",
  accountLabel: "Account equity",
  riskLabel: "Risk per trade %",
  sideLabel: "Side",
  atrLabel: "ATR value",
  multLabel: "ATR mult N",
  entryLabel: "Entry",
  targetLabel: "Target",
  stopLabel: "Stop price",
  sharesLabel: "Position shares",
  riskAmountLabel: "Risk $",
  stopDistLabel: "Stop distance",
  rrLabel: "Risk : Reward",
  invalid: "ATR and multiplier must be positive.",
  disclaimer: "ATR stop is a volatility-adaptive approximation; excludes slippage/funding. Not investment advice.",
  linkPosition: "Position sizing",
  linkR: "R-Multiple",
  linkLeverage: "Leverage & Liquidation",
  sides: { long: "Long", short: "Short" },
  bandLabels: { poor: "No R:R", thin: "Thin <1", fair: "Fair 1–2", strong: "Strong ≥2" },
  presetLabels: { dayLong: "Day long", swingShort: "Swing short", cryptoLong: "Crypto long", simple: "Simple" },
};
