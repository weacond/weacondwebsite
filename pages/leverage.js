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
  validLeverage, notional, leveragedPnl, liquidationMove, liquidationPrice,
  maxLossForMove, adverseMoveForMaxLoss, leverageBand, leverageInsight,
  LEVERAGE_PRESETS,
} from "../lib/leverage";

export const metadata = {
  title: "杠杆与强平计算器 — Weacond",
  description: "输入杠杆倍数与价格变动，算名义价值、放大后盈亏、强平价与最大亏损。教育性参考。",
  robots: { index: true, follow: true },
};

export default function LeveragePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const [leverage, setLeverage] = useState(5);
  const [movePct, setMovePct] = useState(10);
  const [side, setSide] = useState("long");
  const [account, setAccount] = useState(10000);
  const [mmPct, setMmPct] = useState(0);
  const [maxLossPct, setMaxLossPct] = useState(20);

  const levValid = validLeverage(leverage);
  const res = useMemo(() => {
    if (!levValid) return null;
    const pnl = leveragedPnl(movePct, leverage, side);
    const liqMove = liquidationMove(leverage, mmPct);
    const band = leverageBand(leverage);
    return {
      pnl,
      notional: notional(account, leverage),
      liqPrice: liquidationPrice(100, leverage, side, mmPct),
      liqMove,
      maxLoss: maxLossForMove(leverage, Math.abs(movePct)),
      adverseMove: adverseMoveForMaxLoss(leverage, maxLossPct),
      band,
      insight: leverageInsight(leverage, movePct, side),
    };
  }, [leverage, movePct, side, account, mmPct, maxLossPct]);

  const applyPreset = (p) => {
    setLeverage(p.leverage);
    setMovePct(p.movePct);
    setSide(p.side || "long");
  };

  const bandColor =
    res?.band === "extreme" ? "text-red-600" :
    res?.band === "high" ? "text-orange-600" :
    res?.band === "moderate" ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="leverage" />
      <StructuredData items={[
        howToLd(L.howToTitle, L.howTo, "/leverage"),
        breadcrumbLd([{ name: "Home", href: "/" }, { name: "Leverage & Liquidation", href: "/leverage" }]),
      ]} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {LEVERAGE_PRESETS.map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels ? L.presetLabels[p.id] : p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <label className="block">
              <span className="text-xs text-slate-500">{L.levLabel}</span>
              <input type="number" value={leverage} min={1} step={1}
                onChange={(e) => setLeverage(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.moveLabel}</span>
              <input type="number" value={movePct} step={0.5}
                onChange={(e) => setMovePct(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <div className="block">
              <span className="text-xs text-slate-500">{L.sideLabel}</span>
              <div className="mt-1 flex gap-1">
                {["long", "short"].map((s) => (
                  <button key={s} onClick={() => setSide(s)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm border transition ${side === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-600"}`}>
                    {L.sides ? L.sides[s] : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <label className="block">
              <span className="text-xs text-slate-500">{L.accountLabel}</span>
              <input type="number" value={account} min={0} step={1000}
                onChange={(e) => setAccount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.mmLabel}</span>
              <input type="number" value={mmPct} min={0} max={100} step={0.1}
                onChange={(e) => setMmPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.maxLossLabel}</span>
              <input type="number" value={maxLossPct} min={0} max={100} step={1}
                onChange={(e) => setMaxLossPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>

          {!levValid && <p className="text-xs text-red-500 mb-4">{L.invalid}</p>}

          {res && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 text-center">
                <div className="text-xs text-slate-400 mb-1">{L.pnlLabel}</div>
                <div className={`text-4xl font-bold mb-1 ${res.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {res.pnl >= 0 ? "+" : ""}{res.pnl.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mb-4">
                  {L.notionalLabel}:{" "}
                  <span className="font-semibold">{Math.round(res.notional).toLocaleString()}</span>
                  {" · "}
                  {L.bandLabel}:{" "}
                  <span className={`font-semibold ${bandColor}`}>{lang === "en" ? res.band.labelEn : res.band.label}</span>
                </div>
                <p className="text-sm text-slate-500">{res.insight}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.liqMoveLabel}</div>
                  <div className="text-xl font-bold text-orange-600">{res.liqMove.toFixed(2)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.liqPriceLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.liqPrice.toFixed(2)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.maxLossLabel}</div>
                  <div className="text-xl font-bold text-red-600">{res.maxLoss.toFixed(1)}%</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">{L.adverseLabel}</div>
                  <div className="text-xl font-bold text-slate-800">{res.adverseMove.toFixed(2)}%</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6">{L.disclaimer}</p>
              <p className="text-center text-xs">
                <Link href="/risk" className="text-indigo-500 hover:underline">→ {L.linkRisk}</Link>
                {" · "}
                <Link href="/voltarget" className="text-indigo-500 hover:underline">→ {L.linkVolTarget}</Link>
                {" · "}
                <Link href="/position-size" className="text-indigo-500 hover:underline">→ {L.linkPosition}</Link>
              </p>
            </>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "杠杆与强平计算器",
  subtitle: "输入杠杆倍数与价格变动，算放大后盈亏、强平价与最大亏损。价格反向 1/杠杆 即触强平。",
  howToTitle: "如何使用杠杆/强平计算器",
  howTo: [
    "输入杠杆倍数（如 2×–20×）与价格变动%。",
    "选择方向（多/空），填账户权益与维持保证金%。",
    "计算器算放大后权益变动、名义价值与风险等级。",
    "读取强平幅度与强平价（入场 100），判断价格反向多少即触强平。",
    "设最大可亏%，反推可承受的最大价格变动。",
  ],
  levLabel: "杠杆倍数 ×",
  moveLabel: "价格变动 %",
  sideLabel: "方向",
  accountLabel: "账户权益",
  mmLabel: "维持保证金 %",
  maxLossLabel: "最大可亏 %",
  invalid: "杠杆须为正数。",
  pnlLabel: "权益变动",
  notionalLabel: "名义价值",
  bandLabel: "风险等级",
  liqMoveLabel: "强平幅度",
  liqPriceLabel: "强平价（入场 100）",
  adverseLabel: "可承受最大价变",
  disclaimer: "杠杆放大收益与回撤；强平价按 1/杠杆 近似，未计资金费/滑点，不构成投资建议。",
  linkRisk: "风险仪表盘",
  linkVolTarget: "波动目标",
  linkPosition: "头寸管理",
  sides: { long: "多", short: "空" },
  presetLabels: { spot: "现货 1×", low: "低杠杆 2×", mod: "中杠杆 5×", high: "高杠杆 10×", crypto: "币圈 20×" },
};
const en = {
  title: "Leverage & Liquidation",
  subtitle: "Enter leverage and a price move to see amplified P&L, liquidation price and max loss. A price move of 1/leverage against you triggers liquidation.",
  howToTitle: "How to use the leverage & liquidation calculator",
  howTo: [
    "Enter leverage (e.g. 2×–20×) and a price move %.",
    "Choose side (long/short), and fill account equity and maintenance margin %.",
    "The calculator computes amplified P&L, notional and the risk band.",
    "Read the move-to-liquidation and liquidation price (entry 100) to see how far an adverse move triggers liquidation.",
    "Set a max loss % to back-solve the tolerable price move.",
  ],
  levLabel: "Leverage ×",
  moveLabel: "Price move %",
  sideLabel: "Side",
  accountLabel: "Account equity",
  mmLabel: "Maint. margin %",
  maxLossLabel: "Max loss %",
  invalid: "Leverage must be positive.",
  pnlLabel: "Equity change",
  notionalLabel: "Notional",
  bandLabel: "Risk band",
  liqMoveLabel: "Move to liq",
  liqPriceLabel: "Liq price (entry 100)",
  adverseLabel: "Tolerable move",
  disclaimer: "Leverage amplifies returns and drawdowns; liquidation ≈ 1/leverage, excludes funding/slippage. Not investment advice.",
  linkRisk: "Risk dashboard",
  linkVolTarget: "Volatility Target",
  linkPosition: "Position sizing",
  sides: { long: "Long", short: "Short" },
  presetLabels: { spot: "Spot 1×", low: "Low 2×", mod: "Mid 5×", high: "High 10×", crypto: "Crypto 20×" },
};
