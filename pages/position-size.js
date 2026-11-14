"use client";

import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import FaqLd from "../components/FaqLd";
import FaqSection from "../components/FaqSection";
import { positionSize, assessPosition } from "../lib/positionSize";
import { riskReward, requiredReward } from "../lib/riskReward";
import { kellyFraction } from "../lib/kelly";

export const metadata = {
  title: "头寸计算器 — Weacond",
  description: "按每笔风险预算反推头寸大小：账户 × 风险% ÷ 止损距离。卖Put/趋势交易的仓位纪律。",
  robots: { index: true, follow: true },
};

// 集中度判定配色（避免 Tailwind 动态类被 purge）
const VERDICT_BADGE = {
  ok: { cls: "bg-green-100 text-green-700", zh: "常规仓位", en: "Normal position" },
  leveraged: { cls: "bg-orange-100 text-orange-700", zh: "需杠杆", en: "Leveraged" },
  overSized: { cls: "bg-red-100 text-red-700", zh: "集中度过高", en: "Over-concentrated" },
  invalid: { cls: "bg-slate-100 text-slate-500", zh: "输入无效", en: "Invalid input" },
};

export default function PositionSizePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  // 默认：10 万账户、1% 风险、入场 100、止损 95（止损 5%）
  const [account, setAccount] = useState("100000");
  const [riskPct, setRiskPct] = useState("1"); // 界面以 % 为单位，计算时 ÷100
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("95");
  const [target, setTarget] = useState("110");
  const [winRate, setWinRate] = useState("50");
  const [odds, setOdds] = useState("1");

  const res = positionSize({
    account: Number(account),
    riskPct: Number(riskPct) / 100,
    entry: Number(entry),
    stop: Number(stop),
  });
  const verdict = assessPosition(res);
  const vb = VERDICT_BADGE[verdict.verdict];
  const rr = riskReward(Number(entry), Number(stop), Number(target));
  const reqR = requiredReward(Number(winRate) / 100);
  const kelly = kellyFraction(Number(winRate) / 100, Number(odds));

  const num = (v) => (Number.isFinite(v) ? v.toLocaleString() : "—");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="position-size" />
      <FaqLd questions={L.faqs} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 输入 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold mb-4">{L.inputs}</h2>
              <div className="space-y-4">
                <Field label={L.account} value={account} onChange={setAccount} />
                <Field label={L.riskPct} value={riskPct} onChange={setRiskPct} suffix="%" />
                <Field label={L.entry} value={entry} onChange={setEntry} />
                <Field label={L.stop} value={stop} onChange={setStop} />
                <Field label={L.target} value={target} onChange={setTarget} />
                <Field label={L.winRate} value={winRate} onChange={setWinRate} suffix="%" />
                <Field label={L.odds} value={odds} onChange={setOdds} suffix={L.oddsSuffix} />
              </div>
              <p className="text-xs text-slate-400 mt-4">{L.formula}</p>
            </div>

            {/* 结果 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{L.results}</h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${vb.cls}`}>{vb[lang] || verdict.verdict}</span>
              </div>
              {res.valid ? (
                <div className="space-y-3">
                  <Result label={L.units} value={num(res.units)} highlight />
                  <Result label={L.notional} value={num(res.notional)} />
                  <Result label={L.positionPct} value={`${(res.positionPct * 100).toFixed(1)}%`} />
                  <Result label={L.maxLoss} value={num(res.maxLoss)} />
                  <Result label={L.riskAmount} value={num(res.riskAmount)} />
                  <div className="pt-2 border-t mt-1 space-y-3">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase">{L.rrSection}</h3>
                    <Result label={L.riskReward} value={rr.valid ? `${rr.rr.toFixed(2)} : 1` : "—"} highlight />
                    <Result label={L.breakevenWr} value={rr.valid ? `${(rr.breakevenWinRate * 100).toFixed(1)}%` : "—"} />
                    <Result label={L.requiredRr} value={reqR != null ? `${reqR.toFixed(2)} : 1` : "—"} />
                  </div>
                  <div className="pt-2 border-t mt-1 space-y-3">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase">{L.kellySection}</h3>
                    <Result label={L.kellyFull} value={kelly.valid ? `${(Math.max(kelly.fStar, 0) * 100).toFixed(1)}%` : "—"} highlight />
                    <Result label={L.halfKelly} value={kelly.valid ? `${(Math.max(kelly.half, 0) * 100).toFixed(1)}%` : "—"} />
                    <Result label={L.quarterKelly} value={kelly.valid ? `${(Math.max(kelly.quarter, 0) * 100).toFixed(1)}%` : "—"} />
                    {kelly.valid && kelly.fStar <= 0 ? <p className="text-xs text-orange-500">{L.kellyNoEdge}</p> : null}
                  </div>
                  <p className="text-xs text-slate-400 pt-2 border-t">{L.verdictHint[verdict.verdict]}</p>
                </div>
              ) : (
                <p className="text-sm text-red-500">{L.invalid}</p>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">{L.disclaimer}</p>
          <FaqSection faqs={L.faqs} title={L.faqTitle} />
        </div>
      </section>
    </div>
  );
}
function Field({ label, value, onChange, suffix }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
        />
        {suffix ? <span className="text-sm text-slate-400">{suffix}</span> : null}
      </div>
    </label>
  );
}

function Result({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`font-bold ${highlight ? "text-lg text-indigo-600" : ""}`}>{value}</span>
    </div>
  );
}

const zh = {
  title: "头寸计算器",
  subtitle: "先定“每笔最多亏多少”，再反推该买多少。卖Put 与趋势交易的仓位纪律。",
  inputs: "输入",
  account: "账户权益",
  riskPct: "每笔风险（%）",
  entry: "入场价",
  stop: "止损价",
  target: "目标价",
  winRate: "预期胜率（%）",
  formula: "头寸 = ⌊ 账户 × 风险% ÷ |入场 − 止损| ⌋；名义价值 = 头寸 × 入场。",
  results: "结果",
  units: "头寸单位（股/张）",
  notional: "名义价值",
  positionPct: "占账户比例",
  maxLoss: "最大亏损",
  riskAmount: "风险预算",
  rrSection: "风险:收益",
  riskReward: "R:R 比值",
  breakevenWr: "盈亏平衡胜率",
  requiredRr: "该胜率所需 R:R",
  odds: "净赔率（每 1 单位风险赚）",
  oddsSuffix: ": 1",
  kellySection: "Kelly 仓位",
  kellyFull: "全 Kelly",
  halfKelly: "半 Kelly",
  quarterKelly: "1/4 Kelly",
  kellyNoEdge: "无正期望（f*≤0），建议不下注。",
  verdictHint: {
    ok: "名义 ≤ 账户，集中度正常。",
    leveraged: "名义超过账户，需杠杆或保证金；注意穿仓风险。",
    overSized: "占账户 > 300%，集中度过高，单笔回撤可能放大。",
    invalid: "",
  },
  invalid: "请输入有效的账户、风险%、入场价与止损价。",
  disclaimer: "本工具基于固定止损的距离计算，不考虑波动率/保证金/滑点；非投资建议。",
  faqTitle: "常见问题",
  faqs: [
    { q: "头寸怎么算？", a: "头寸 = 账户权益 × 每笔风险% ÷ |入场价 − 止损价|。先定每笔最多亏多少，再反推该买多少。" },
    { q: "单笔风险设多少合适？", a: "多数交易员每笔用 0.5–2%，新手建议 1% 或更低；保持单笔亏损恒定比追求大仓位更利于长期生存。" },
    { q: "止损越远头寸越小吗？", a: "是。风险预算固定时，止损距离越远，单单位亏损越大，需更小头寸才能维持同一风险。" },
    { q: "头寸超过账户会怎样？", a: "名义超过账户即需杠杆/保证金，集中度过高会放大回撤甚至穿仓；务必控制单笔风险。" },
  ],
};
const en = {
  title: "Position Sizer",
  subtitle: "Decide max loss per trade first, then size the position. The core discipline for put-selling & trend trading.",
  inputs: "Inputs",
  account: "Account Equity",
  riskPct: "Risk per Trade (%)",
  entry: "Entry Price",
  stop: "Stop Price",
  target: "Target Price",
  winRate: "Expected Win Rate (%)",
  formula: "Units = ⌊ Equity × Risk% ÷ |Entry − Stop| ⌋; Notional = Units × Entry.",
  results: "Results",
  units: "Units (shares / contracts)",
  notional: "Notional",
  positionPct: "Position %",
  maxLoss: "Max Loss",
  riskAmount: "Risk Budget",
  rrSection: "Risk : Reward",
  riskReward: "R:R Ratio",
  breakevenWr: "Breakeven Win Rate",
  requiredRr: "R:R Needed",
  odds: "Net Odds (profit per 1 risked)",
  oddsSuffix: ": 1",
  kellySection: "Kelly Sizing",
  kellyFull: "Full Kelly",
  halfKelly: "Half Kelly",
  quarterKelly: "Quarter Kelly",
  kellyNoEdge: "No positive edge (f*≤0); skip the trade.",
  verdictHint: {
    ok: "Notional ≤ account; concentration is normal.",
    leveraged: "Notional exceeds account — requires leverage/margin; mind blow-up risk.",
    overSized: "Position > 300% of account; over-concentrated, drawdowns can amplify.",
    invalid: "",
  },
  invalid: "Enter a valid account, risk %, entry, and stop.",
  disclaimer: "Based on a fixed stop distance; ignores volatility/margin/slippage. Not investment advice.",
  faqTitle: "FAQ",
  faqs: [
    { q: "How do I size a position?", a: "Units = equity × risk% ÷ |entry − stop|. Decide the max loss per trade first, then size the position." },
    { q: "How much risk per trade?", a: "Most traders use 0.5–2% per trade; beginners 1% or less. Keeping per-trade loss constant beats bigger positions for long-term survival." },
    { q: "Does a wider stop mean a smaller position?", a: "Yes. With fixed risk, a wider stop raises loss per unit, so you need fewer units to keep the same risk." },
    { q: "What if the position exceeds the account?", a: "Notional above account needs leverage/margin; over-concentration amplifies drawdowns and can blow up. Keep per-trade risk in check." },
  ],
};

