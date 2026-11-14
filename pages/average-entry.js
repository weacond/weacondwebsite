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
import {
  positionSummary, pnlStatus, AVG_ENTRY_PRESETS,
} from "../lib/avgEntry";

export const metadata = {
  title: "加仓均价与盈亏计算器 — Weacond",
  description: "输入原持仓与加仓，算新的加权均价、现价盈亏与到目标价距离。交易复盘常用，教育性参考。",
  robots: { index: true, follow: true },
};

export default function AverageEntryPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [existingShares, setExistingShares] = useState(100);
  const [existingPrice, setExistingPrice] = useState(100);
  const [addShares, setAddShares] = useState(50);
  const [addPrice, setAddPrice] = useState(90);
  const [current, setCurrent] = useState(95);
  const [target, setTarget] = useState(100);

  const res = useMemo(
    () => positionSummary({ existingShares, existingPrice, addShares, addPrice, current, target }),
    [existingShares, existingPrice, addShares, addPrice, current, target],
  );

  const applyPreset = (p) => {
    setExistingShares(p.existingShares);
    setExistingPrice(p.existingPrice);
    setAddShares(p.addShares);
    setAddPrice(p.addPrice);
    setCurrent(p.current);
    setTarget(p.target);
  };

  const status = pnlStatus(res.pnl);
  const statusColor =
    status === "profit" ? "text-emerald-600" :
    status === "loss" ? "text-red-600" :
    status === "flat" ? "text-slate-600" : "text-slate-400";
  const dirArrow = res.toTarget && (
    res.toTarget.direction === "up" ? "▲" : res.toTarget.direction === "down" ? "▼" : "→"
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="average-entry" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/average-entry"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Average Entry & P&L", href: "/average-entry" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(AVG_ENTRY_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.existingSharesLabel}</span>
              <input type="number" value={existingShares} min={0} step={1}
                onChange={(e) => setExistingShares(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.existingPriceLabel}</span>
              <input type="number" value={existingPrice} min={0} step={0.01}
                onChange={(e) => setExistingPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.addSharesLabel}</span>
              <input type="number" value={addShares} min={0} step={1}
                onChange={(e) => setAddShares(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.addPriceLabel}</span>
              <input type="number" value={addPrice} min={0} step={0.01}
                onChange={(e) => setAddPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.currentLabel}</span>
              <input type="number" value={current} min={0} step={0.01}
                onChange={(e) => setCurrent(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.targetLabel}</span>
              <input type="number" value={target} min={0} step={0.01}
                onChange={(e) => setTarget(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 mb-4">
            <div className="text-center mb-4">
              <div className="text-xs text-slate-400 mb-1">{L.avgLabel}</div>
              <div className="text-3xl font-bold text-indigo-600">
                {res.blended.valid ? res.blended.avg.toFixed(2) : "—"}
              </div>
              <div className={`text-xs mt-1 ${res.blended.avgShiftPct < 0 ? "text-emerald-600" : res.blended.avgShiftPct > 0 ? "text-red-600" : "text-slate-500"}`}>
                {L.shiftLabel} {res.blended.avgShiftPct >= 0 ? "+" : ""}{res.blended.avgShiftPct.toFixed(2)}%
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">{L.totalLabel}</div>
                <div className="font-mono font-semibold">{res.blended.totalShares.toLocaleString()} · {res.blended.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">{L.addSharePctLabel}</div>
                <div className="font-mono font-semibold">{res.blended.addSharesPct.toFixed(1)}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <div className="text-xs text-slate-400">{L.pnlLabel}</div>
                <div className={`text-xl font-bold ${statusColor}`}>
                  {res.pnl.valid ? `${res.pnl.profit >= 0 ? "+" : ""}${res.pnl.profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">{L.pnlPctLabel}</div>
                <div className={`text-xl font-bold ${statusColor}`}>
                  {res.pnl.valid ? `${res.pnl.profitPct >= 0 ? "+" : ""}${res.pnl.profitPct.toFixed(2)}%` : "—"}
                </div>
              </div>
            </div>

            {res.toTarget && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="text-xs text-slate-400 mb-1">{L.targetDistLabel}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-800">{dirArrow} {Math.abs(res.toTarget.pctMove).toFixed(2)}%</span>
                  <span className="text-xs text-slate-400 font-mono">→ {res.toTarget.absMove >= 0 ? "+" : ""}{res.toTarget.absMove.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
          <p className="text-center text-xs">
            <Link href="/position-size" className="text-indigo-500 hover:underline">→ {L.linkPosition}</Link>
            {" · "}
            <Link href="/leverage" className="text-indigo-500 hover:underline">→ {L.linkLeverage}</Link>
            {" · "}
            <Link href="/r-multiple" className="text-indigo-500 hover:underline">→ {L.linkR}</Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "加仓均价与盈亏计算器",
  subtitle: "输入原持仓与加仓，算新的加权均价、现价盈亏与到目标价距离。交易复盘常用。",
  howToTitle: "如何使用加仓均价与盈亏计算器",
  howTo: [
    "输入原持仓的份额/价格与加仓的份额/价格。",
    "计算器算加权均价与现价盈亏。",
    "输入目标价，查看到目标的距离。",
  ],
  existingSharesLabel: "原持仓股数",
  existingPriceLabel: "原持仓均价",
  addSharesLabel: "加入股数",
  addPriceLabel: "加仓价格",
  currentLabel: "现价",
  targetLabel: "目标价",
  avgLabel: "加仓后新均价",
  shiftLabel: "均价偏移",
  totalLabel: "总持仓 · 总成本",
  addSharePctLabel: "加仓占总量",
  pnlLabel: "现价盈亏",
  pnlPctLabel: "盈亏 %",
  targetDistLabel: "到目标价",
  disclaimer: "加权均价为成本基准，未计手续费/滑点；现价盈亏以均价为基准，不构成投资建议。",
  linkPosition: "头寸管理",
  linkLeverage: "杠杆与强平",
  linkR: "R 倍数",
  presetLabels: { averageUp: "顺势加仓", averageDown: "补仓摊平", cryptoAdd: "币圈加仓", initialOnly: "仅原持仓" },
};
const en = {
  title: "Average Entry & P&L",
  subtitle: "Enter your existing position and the add to see the blended average, P&L at spot and distance to a target. A common trade-review tool.",
  howToTitle: "How to use the average-entry & P&L calculator",
  howTo: [
    "Enter the existing position (shares/price) and the add (shares/price).",
    "The calculator computes the weighted average and P&L at spot.",
    "Enter a target price to see the distance to it.",
  ],
  existingSharesLabel: "Existing shares",
  existingPriceLabel: "Existing avg",
  addSharesLabel: "Add shares",
  addPriceLabel: "Add price",
  currentLabel: "Spot",
  targetLabel: "Target",
  avgLabel: "New blended avg",
  shiftLabel: "Avg shift",
  totalLabel: "Total shares · cost",
  addSharePctLabel: "Add / total",
  pnlLabel: "P&L at spot",
  pnlPctLabel: "P&L %",
  targetDistLabel: "Distance to target",
  disclaimer: "Blended avg is a cost basis, excludes fees/slippage; P&L is measured from the avg. Not investment advice.",
  linkPosition: "Position sizing",
  linkLeverage: "Leverage & Liquidation",
  linkR: "R-Multiple",
  presetLabels: { averageUp: "Average up", averageDown: "Average down", cryptoAdd: "Crypto add", initialOnly: "Existing only" },
};
