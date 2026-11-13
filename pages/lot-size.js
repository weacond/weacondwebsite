"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import Link from "next/link";
import { lotSizeSummary, LOT_SIZE_PRESETS } from "../lib/lotSize";
export const metadata = {
  title: "手数 / 合约乘数 — Weacond",
  description: "由风险定手数：风险金额/每手风险；名义价值、保证金、账户暴露。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "手数 / 合约乘数计算器",
  subtitle: "由风险定手数 = 风险金额 ÷ 每手风险；名义价值 = 手数×价格×乘数；保证金 = 名义/杠杆。教育性参考，非投资建议。",
  accountLabel: "账户",
  riskPctLabel: "单笔风险 %",
  priceLabel: "价格",
  stopLabel: "止损",
  multLabel: "合约乘数",
  levLabel: "杠杆",
  presetLabels: {
    stock: "股票 1%", futures: "期货 10×", crypto: "合约 20×", forex: "外汇 100×", conservative: "保守 0.5%",
  },
  resultTitle: "结果",
  riskAmountLabel: "风险金额",
  riskPerLotLabel: "每手风险",
  unitsLabel: "手数",
  notionalLabel: "名义价值",
  marginLabel: "所需保证金",
  exposureLabel: "账户暴露 %",
  bandLabel: "暴露等级",
  bandText: {
    light: "轻", moderate: "中", heavy: "重", "over-leveraged": "过度杠杆", none: "无", invalid: "无效",
  },
  learnTitle: "学习",
  learn: "由风险定手数：先定单笔风险金额（账户×风险%），再除以每手风险（|价格−止损|×乘数）得到手数。名义价值=手数×价格×乘数；保证金=名义/杠杆；账户暴露=名义/账户。乘数使期货/外汇的「手数」对应真实合约规模。",
};
const en = {
  title: "Lot Size / Contract Multiplier",
  subtitle: "Units from risk = risk amount ÷ risk/lot; notional = units×price×multiplier; margin = notional/leverage. Educational, not investment advice.",
  accountLabel: "Account",
  riskPctLabel: "Risk per Trade %",
  priceLabel: "Price",
  stopLabel: "Stop",
  multLabel: "Contract Multiplier",
  levLabel: "Leverage",
  presetLabels: {
    stock: "Stock 1%", futures: "Futures 10×", crypto: "Futures 20×", forex: "FX 100×", conservative: "Cons. 0.5%",
  },
  resultTitle: "Results",
  riskAmountLabel: "Risk Amount",
  riskPerLotLabel: "Risk / Lot",
  unitsLabel: "Units",
  notionalLabel: "Notional",
  marginLabel: "Margin Required",
  exposureLabel: "Account Exposure %",
  bandLabel: "Exposure Level",
  bandText: {
    light: "Light", moderate: "Moderate", heavy: "Heavy", "over-leveraged": "Over-leveraged", none: "None", invalid: "Invalid",
  },
  learnTitle: "Learn",
  learn: "Size by risk: fix risk amount (account × risk %), divide by risk/lot (|price−stop| × multiplier) to get units. Notional = units × price × multiplier; margin = notional ÷ leverage; exposure = notional ÷ account. The multiplier maps 'units' to real contract size for futures/FX.",
};
function fmtNum(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}
export default function LotSizePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [account, setAccount] = useState(100000);
  const [riskPct, setRiskPct] = useState(1);
  const [price, setPrice] = useState(100);
  const [stop, setStop] = useState(95);
  const [multiplier, setMultiplier] = useState(1);
  const [leverage, setLeverage] = useState(1);
  const res = useMemo(
    () => lotSizeSummary({ account, riskPct: riskPct / 100, price, stop, multiplier, leverage }),
    [account, riskPct, price, stop, multiplier, leverage],
  );
  const applyPreset = (p) => {
    setAccount(p.account); setRiskPct(p.riskPct * 100);
    setPrice(p.price); setStop(p.stop);
    setMultiplier(p.multiplier || 1); setLeverage(p.leverage || 1);
  };
  const band = res.band || "invalid";
  const bandColor =
    band === "light" ? "text-emerald-600" :
    band === "moderate" ? "text-indigo-600" :
    band === "heavy" ? "text-amber-600" :
    band === "over-leveraged" ? "text-rose-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="lot-size" />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(LOT_SIZE_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels[p.id] || p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.accountLabel}</span>
              <input type="number" value={account} min={1} step={1000}
                onChange={(e) => setAccount(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.riskPctLabel}</span>
              <input type="number" value={riskPct} min={0.1} max={10} step={0.1}
                onChange={(e) => setRiskPct(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.multLabel}</span>
              <input type="number" value={multiplier} min={0.0001} step={1}
                onChange={(e) => setMultiplier(Math.max(0.0001, parseFloat(e.target.value) || 1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.priceLabel}</span>
              <input type="number" value={price} step={0.01}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.stopLabel}</span>
              <input type="number" value={stop} step={0.01}
                onChange={(e) => setStop(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.levLabel}</span>
              <input type="number" value={leverage} min={1} step={1}
                onChange={(e) => setLeverage(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.resultTitle}</h2>
            {res.valid ? (
              <div className="grid grid-cols-3 gap-3">
                <div><div className="text-xs text-slate-400">{L.riskAmountLabel}</div><div className="font-mono text-lg">{fmtNum(res.riskAmount)}</div></div>
                <div><div className="text-xs text-slate-400">{L.riskPerLotLabel}</div><div className="font-mono text-lg">{fmtNum(res.riskPerLot)}</div></div>
                <div><div className="text-xs text-slate-400">{L.unitsLabel}</div><div className="font-mono text-lg">{fmtNum(res.units)}</div></div>
                <div><div className="text-xs text-slate-400">{L.notionalLabel}</div><div className="font-mono text-lg">{fmtNum(res.notional)}</div></div>
                <div><div className="text-xs text-slate-400">{L.marginLabel}</div><div className="font-mono text-lg">{fmtNum(res.margin)}</div></div>
                <div><div className="text-xs text-slate-400">{L.exposureLabel}</div><div className="font-mono text-lg">{fmtPct(res.exposure)}</div></div>
                <div className="col-span-3">
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
        </div>
      </section>
      <Footer />
    </div>
  );
}