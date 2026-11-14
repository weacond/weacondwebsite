"use client";
import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import FaqLd from "../components/FaqLd";
import StructuredData from "../components/StructuredData";
import { howToLd, breadcrumbLd } from "../lib/jsonLd";
import FaqSection from "../components/FaqSection";
import Link from "next/link";
import { riskBudgetSummary, RISK_BUDGET_PRESETS } from "../lib/riskBudget";
export const metadata = {
  title: "风险预算仓位 — Weacond",
  description: "风险金额=账户×风险比例；最大仓位=风险金额/VaR。教育性参考，非投资建议。",
  robots: { index: true, follow: true },
};
const zh = {
  title: "风险预算仓位计算器",
  subtitle: "风险金额=账户×风险比例；最大仓位=风险金额÷每单位风险（VaR）。教育性参考，非投资建议。",
  accountLabel: "账户规模",
  riskPctLabel: "单笔风险 %",
  varLabel: "每单位风险（VaR）",
  priceLabel: "单位价格",
  numStratLabel: "策略数",
  presetLabels: {
    conservative: "保守 0.5%", moderate: "中等 1%", aggressive: "激进 2%",
    multiStrat: "多策略 1%", tiny: "小账户 1%",
  },
  resultTitle: "结果",
  riskAmountLabel: "风险金额",
  unitsLabel: "最大仓位（单位）",
  notionalLabel: "名义价值",
  positionPctLabel: "占账户 %",
  perStratLabel: "每策略风险",
  bandLabel: "风险等级",
  bandText: {
    conservative: "保守", moderate: "中等", aggressive: "激进",
    "over-leveraged": "过度杠杆", zero: "零", invalid: "无效",
  },
  learnTitle: "学习",
  learn: "风险预算法将每笔交易的风险限制在账户的一定比例（如 1%）。最大仓位 = 风险金额 ÷ 每单位风险（VaR 或止损距离）。多策略时总风险预算均分给每个策略。",
  faqTitle: "常见问题",
  howToTitle: "如何使用风险预算仓位计算器",
  howTo: [
    "输入账户规模与单笔风险比例 riskPct（如 1%），得到风险金额 = 账户 × riskPct。",
    "输入每单位风险（VaR 或止损距离），得到最大仓位 = 风险金额 ÷ 每单位风险。",
    "查看名义价值、占账户比例与每策略风险；多策略时总风险预算均分。",
    "风险比例越小越稳健：多数稳健策略用 1%，保守用 0.5%，激进用 2%。",
  ],
  faqs: [
    { q: "风险预算法怎么定头寸？", a: "风险金额 = 账户 × 单笔风险%；最大仓位 = 风险金额 ÷ 每单位风险（VaR 或止损距离），把每笔损失限制在账户固定比例。" },
    { q: "单笔风险比例取多少合适？", a: "常见 0.5–2%：越小越稳健但增长慢，越大越快但波动与回撤更剧烈；多数稳健策略用 1%。" },
    { q: "多策略如何分配风险？", a: "总风险预算均分给每个策略；若策略间相关，需降低每个策略的风险以避免叠加回撤。" },
    { q: "VaR 作每单位风险准吗？", a: "VaR 是常用近似，但低估尾部风险；更稳健做法用 CVaR 或历史止损距离，并预留相关性冲击。" },
  ],
};
const en = {
  title: "Risk Budget Position Sizing",
  subtitle: "Risk amount = account × risk %; max position = risk amount ÷ per-unit risk (VaR). Educational, not investment advice.",
  accountLabel: "Account",
  riskPctLabel: "Risk per Trade %",
  varLabel: "Per-Unit Risk (VaR)",
  priceLabel: "Unit Price",
  numStratLabel: "Num Strategies",
  presetLabels: {
    conservative: "Conservative 0.5%", moderate: "Moderate 1%", aggressive: "Aggressive 2%",
    multiStrat: "Multi-Strat 1%", tiny: "Small Acct 1%",
  },
  resultTitle: "Results",
  riskAmountLabel: "Risk Amount",
  unitsLabel: "Max Position (units)",
  notionalLabel: "Notional Value",
  positionPctLabel: "% of Account",
  perStratLabel: "Per-Strategy Risk",
  bandLabel: "Risk Level",
  bandText: {
    conservative: "Conservative", moderate: "Moderate", aggressive: "Aggressive",
    "over-leveraged": "Over-leveraged", zero: "Zero", invalid: "Invalid",
  },
  learnTitle: "Learn",
  learn: "Risk budget sizing caps each trade's risk at a fixed % of account (e.g. 1%). Max position = risk amount ÷ per-unit risk (VaR or stop distance). Multi-strategy splits total risk budget evenly.",
  faqTitle: "FAQ",
  howToTitle: "How to use the risk-budget position sizing calculator",
  howTo: [
    "Enter account size and risk per trade riskPct (e.g. 1%); risk amount = account × riskPct.",
    "Enter per-unit risk (VaR or stop distance); max position = risk amount ÷ per-unit risk.",
    "Read notional value, account share, and risk per strategy; for multiple strategies the budget is split evenly.",
    "Smaller risk per trade is more conservative: most steady strategies use 1%, conservative 0.5%, aggressive 2%.",
  ],
  faqs: [
    { q: "How does risk-budget sizing set a position?", a: "Risk amount = account × per-trade risk %; max position = risk amount ÷ per-unit risk (VaR or stop distance), capping each loss at a fixed account share." },
    { q: "What per-trade risk % is appropriate?", a: "Commonly 0.5–2%: smaller is steadier but slower, larger is faster but far more volatile; most steady strategies use 1%." },
    { q: "How to split risk across strategies?", a: "The total risk budget is split evenly among strategies; if they are correlated, lower each one's risk to avoid stacking drawdowns." },
    { q: "Is VaR a good per-unit risk?", a: "VaR is a common approximation but understates tail risk; a more robust approach uses CVaR or historical stop distance, with a buffer for correlation." },
  ],
};
function fmtNum(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(2) + "%";
}
export default function RiskBudgetPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [account, setAccount] = useState(100000);
  const [riskPct, setRiskPct] = useState(1);
  const [varPerUnit, setVarPerUnit] = useState(10);
  const [price, setPrice] = useState(100);
  const [numStrat, setNumStrat] = useState(1);
  const res = useMemo(
    () => riskBudgetSummary({ account, riskPct: riskPct / 100, varPerUnit, price, numStrategies: numStrat }),
    [account, riskPct, varPerUnit, price, numStrat],
  );
  const applyPreset = (p) => {
    setAccount(p.account); setRiskPct(p.riskPct * 100);
    setVarPerUnit(p.varPerUnit); setPrice(p.price);
    setNumStrat(p.numStrategies || 1);
  };
  const band = res.band || "invalid";
  const bandColor =
    band === "conservative" ? "text-emerald-600" :
    band === "moderate" ? "text-indigo-600" :
    band === "aggressive" ? "text-amber-600" :
    band === "over-leveraged" ? "text-rose-600" :
    "text-slate-400";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <CalcLd slug="risk-budget" />
      <FaqLd questions={L.faqs} />
      <StructuredData
        data={[
          howToLd(L.howToTitle, L.howTo, "/risk-budget"),
          breadcrumbLd([{ name: "Home", href: "/" }, { name: "Risk Budget", href: "/risk-budget" }]),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.values(RISK_BUDGET_PRESETS).map((p) => (
              <button key={p.id} onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-full text-xs bg-white border border-slate-200 hover:border-indigo-300 transition">
                {L.presetLabels[p.id] || p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
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
              <span className="text-xs text-slate-500">{L.varLabel}</span>
              <input type="number" value={varPerUnit} min={0.1} step={0.1}
                onChange={(e) => setVarPerUnit(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">{L.priceLabel}</span>
              <input type="number" value={price} min={0.1} step={1}
                onChange={(e) => setPrice(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
            <label className="block col-span-2">
              <span className="text-xs text-slate-500">{L.numStratLabel}</span>
              <input type="number" value={numStrat} min={1} max={20} step={1}
                onChange={(e) => setNumStrat(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono" />
            </label>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.resultTitle}</h2>
            {res.valid ? (
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-400">{L.riskAmountLabel}</div><div className="font-mono text-lg">{fmtNum(res.riskAmount)}</div></div>
                <div><div className="text-xs text-slate-400">{L.unitsLabel}</div><div className="font-mono text-lg">{fmtNum(res.units)}</div></div>
                <div><div className="text-xs text-slate-400">{L.notionalLabel}</div><div className="font-mono text-lg">{fmtNum(res.notional)}</div></div>
                <div><div className="text-xs text-slate-400">{L.positionPctLabel}</div><div className="font-mono text-lg">{fmtPct(res.positionPct)}</div></div>
                {res.perStrategy != null && (
                  <div><div className="text-xs text-slate-400">{L.perStratLabel}</div><div className="font-mono text-lg">{fmtNum(res.perStrategy)}</div></div>
                )}
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
          <FaqSection faqs={L.faqs} title={L.faqTitle} />
        </div>
      </section>
      <Footer />
    </div>
  );
}