"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import FaqLd from "../components/FaqLd";
import FaqSection from "../components/FaqSection";
import { CURVE_PRESETS, getCurvePreset, buildRiskDashboard, riskTier } from "../lib/riskDashboard";

export const metadata = {
  title: "风险与绩效仪表盘 — Weacond",
  description: "输入一条净值曲线或用预设，一次性读出最大回撤/持续/恢复、VaR/CVaR 尾部风险、偏度峰度，以及夏普/索提诺/卡玛/欧米伽/尾部/斯特林六大绩效比率。教育性工具，非投资建议。",
  robots: { index: true, follow: true },
};

const TIER_CLS = {
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
  amber: "bg-amber-100 text-amber-700 border-amber-300",
  orange: "bg-orange-100 text-orange-700 border-orange-300",
  rose: "bg-rose-100 text-rose-700 border-rose-300",
  slate: "bg-slate-100 text-slate-600 border-slate-300",
};

function parseCurve(text) {
  return String(text)
    .split(/[\s,]+/)
    .map((s) => parseFloat(s))
    .filter((x) => Number.isFinite(x));
}

export default function RiskPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [presetId, setPresetId] = useState("crashRecovery");
  const [custom, setCustom] = useState("");
  const [confidence, setConfidence] = useState(0.95);
  const [rf, setRf] = useState(2);
  const [years, setYears] = useState(2);

  const preset = getCurvePreset(presetId);
  const customVals = parseCurve(custom);
  const usingCustom = customVals.length >= 2;
  const curve = usingCustom ? customVals : preset.curve;

  let dashboard = null;
  let err = null;
  try {
    dashboard = buildRiskDashboard(curve, {
      rf: rf / 100,
      years: years > 0 ? years : preset.years,
      confidence,
    });
  } catch (e) {
    err = e.message;
  }
  const tier = dashboard ? riskTier(dashboard) : null;
  const num = (v) =>
    Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
      </Head>
      <CalcLd slug="risk" />
      <FaqLd questions={L.faqs} />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>

          {/* 预设选择 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-3">{L.preset}</h2>
            <div className="flex flex-wrap gap-2">
              {Object.values(CURVE_PRESETS).map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setPresetId(Object.keys(CURVE_PRESETS).find((k) => CURVE_PRESETS[k] === p));
                    setYears(p.years);
                  }}
                  disabled={usingCustom}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    !usingCustom && preset.label === p.label
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                  }`}
                >
                  {lang === "en" ? p.labelEn : p.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-3">
              {usingCustom ? L.usingCustom : preset.desc || preset.descEn || ""}
            </p>
          </div>

          {/* 自定义净值曲线 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold mb-3">{L.custom}</h2>
            <textarea
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              rows={3}
              placeholder="100, 102, 110, 95, 108, 120 ..."
              className="w-full text-sm font-mono p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-slate-400 mt-2">{L.customHint}</p>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <label className="text-sm">
                <span className="text-slate-500">{L.confidence}</span>
                <div className="flex gap-1 mt-1">
                  {[0.95, 0.99].map((c) => (
                    <button
                      key={c}
                      onClick={() => setConfidence(c)}
                      className={`flex-1 px-2 py-1 rounded text-xs font-medium ${
                        confidence === c ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {c * 100}%
                    </button>
                  ))}
                </div>
              </label>
              <label className="text-sm">
                <span className="text-slate-500">{L.rf}</span>
                <input
                  type="number"
                  step="0.1"
                  value={rf}
                  onChange={(e) => setRf(parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full px-2 py-1 border border-slate-200 rounded text-sm font-mono"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-500">{L.years}</span>
                <input
                  type="number"
                  step="0.25"
                  value={years}
                  onChange={(e) => setYears(parseFloat(e.target.value) || preset.years)}
                  className="mt-1 w-full px-2 py-1 border border-slate-200 rounded text-sm font-mono"
                />
              </label>
            </div>
          </div>

          {err && <p className="text-rose-500 text-sm mb-6">{L.notEnough}</p>}

          {!err && dashboard && (
            <Dashboard d={dashboard} L={L} num={num} lang={lang} tier={tier} curve={curve} />
          )}

          <p className="mt-8 text-center text-xs text-slate-400">{L.disclaimer}</p>
          <FaqSection faqs={L.faqs} title={L.faqTitle} />
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div>
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className={`text-sm font-mono font-semibold ${accent || "text-slate-700"}`}>{value}</div>
    </div>
  );
}


function Dashboard({ d, L, num, lang, tier, curve }) {
  const dd = d.drawdown;
  const tail = d.tail;
  const r = d.ratios;
  const confPct = Math.round(tail.confidence * 100);

  return (
    <>
      {/* 风险等级 + 概览 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{L.tier}</h2>
          <span className={`text-sm font-bold px-3 py-1 rounded-full border ${TIER_CLS[tier.color]}`}>
            {lang === "en" ? tier.labelEn : tier.label}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric label={L.totalRet} value={`${num(d.totalReturn)}%`} accent={d.totalReturn >= 0 ? "text-emerald-600" : "text-rose-600"} />
          <Metric label={L.cagr} value={`${num(d.cagr)}%`} />
          <Metric label={L.points} value={num(d.n)} />
          <Metric label={L.mls} value={num(d.maxLosingStreak)} />
        </div>
      </div>

      {/* 回撤画像 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <h2 className="text-lg font-bold mb-4">{L.drawdownTitle}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Metric label={L.mdd} value={`${num(dd.mddPct)}%`} accent="text-rose-600" />
          <Metric label={L.duration} value={num(dd.duration)} />
          <Metric label={L.recovery} value={dd.recovered ? num(dd.recovery) : L.recoveryNone} accent={dd.recovered ? "" : "text-amber-600"} />
          <Metric label={L.ulcer} value={num(dd.ulcer * 100) + "%"} />
          <Metric label={L.avgDD} value={`${num(dd.avgDD * 100)}%`} />
          <Metric label={L.underwater} value={`${num(dd.pctUnderwater)}%`} />
        </div>
        <div className="mt-4">
          <UnderwaterChart curve={curve} L={L} />
        </div>
      </div>

      {/* 尾部风险 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <h2 className="text-lg font-bold mb-4">{L.tailTitle}</h2>
        <div className="grid grid-cols-3 gap-4">
          <Metric label={L[varKey(tail.confidence, "var")]} value={`-${num(tail.varAtConf * 100)}%`} accent="text-rose-600" />
          <Metric label={L.var99} value={`-${num(tail.var99 * 100)}%`} accent="text-rose-600" />
          <Metric label={L.cvar99} value={`-${num(tail.cvar99 * 100)}%`} accent="text-rose-700" />
          <Metric label={L.skew} value={num(tail.skewness)} />
          <Metric label={L.kurt} value={num(tail.kurtosis)} />
          <Metric label={`${L.confidence} ${confPct}%`} value={`-${num(tail.cvarAtConf * 100)}%`} />
        </div>
      </div>

      {/* 绩效比率 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <h2 className="text-lg font-bold mb-4">{L.ratiosTitle}</h2>
        <div className="grid grid-cols-3 gap-4">
          <Metric label={L.sharpe} value={num(r.sharpe)} accent="text-indigo-600" />
          <Metric label={L.sortino} value={num(r.sortino)} accent="text-indigo-600" />
          <Metric label={L.calmar} value={num(r.calmar)} accent="text-indigo-600" />
          <Metric label={L.omega} value={num(r.omega)} />
          <Metric label={L.tail} value={num(r.tail)} />
          <Metric label={L.sterling} value={num(r.sterling)} />
        </div>
      </div>
    </>
  );
}

// 动态取 "var95"/"var99" 文案键
function varKey(conf, prefix) {
  return conf === 0.99 ? "var99" : "var95";
}


// 水下曲线：逐期回撤幅度面积图（0 在顶，最深在底）
function UnderwaterChart({ curve, L }) {
  const vals = (Array.isArray(curve) ? curve : []).filter((x) => typeof x === "number" && Number.isFinite(x));
  if (vals.length < 2) return null;
  const W = 560;
  const H = 180;
  const pad = 8;
  let peak = vals[0];
  const dd = vals.map((v) => {
    if (v > peak) peak = v;
    return peak > 0 ? (peak - v) / peak : 0;
  });
  const maxDD = Math.max(...dd);
  const sx = (i) => pad + (i / (vals.length - 1)) * (W - 2 * pad);
  const sy = (d) => pad + (d / (maxDD || 1)) * (H - 2 * pad);
  const areaPath = "M " + sx(0) + "," + sy(0) + " L " + dd.map((d, i) => `${sx(i)},${sy(d)}`).join(" L ") + " L " + sx(vals.length - 1) + "," + sy(0) + " Z";

  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">{L.chartHint}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
        <line x1={pad} y1={pad} x2={W - pad} y2={pad} stroke="#e2e8f0" />
        <path d={areaPath} fill="#fee2e2" stroke="#f87171" strokeWidth={1.2} />
        <text x={W - pad} y={H - 2} textAnchor="end" fill="#94a3b8" style={{ fontSize: 10 }}>
          {L.chartX}
        </text>
        <text x={pad} y={H - 2} fill="#94a3b8" style={{ fontSize: 10 }}>
          {L.chartMaxDD}: -{(maxDD * 100).toFixed(1)}%
        </text>
      </svg>
    </div>
  );
}

const zh = {
  title: "风险与绩效仪表盘",
  subtitle: "输入净值曲线或用预设，一次读出最大回撤/持续/恢复、VaR/CVaR 尾部风险、偏度峰度，以及夏普/索提诺/卡玛/欧米伽/尾部/斯特林六大绩效比率。教育性工具，非投资建议。",
  preset: "选择净值曲线",
  custom: "自定义净值曲线",
  customHint: "每行/空格/逗号分隔的净值，至少 2 个点；留空则用上方预设。",
  usingCustom: "当前使用你输入的自定义净值曲线。",
  confidence: "置信水平",
  rf: "无风险利率 %",
  years: "曲线跨度（年）",
  notEnough: "净值点不足 2 个，无法计算风险剖面。",
  tier: "风险等级",
  totalRet: "累计收益",
  cagr: "年化 CAGR",
  points: "点数",
  mls: "最长连亏",
  drawdownTitle: "回撤画像",
  mdd: "最大回撤",
  duration: "持续期数",
  recovery: "恢复期数",
  recoveryNone: "尚未恢复",
  ulcer: "溃疡指数",
  avgDD: "平均回撤",
  underwater: "水下占比",
  chartHint: "红色面积 = 逐期回撤幅度（水下曲线），越深越久越痛苦。",
  chartX: "时间 →",
  chartMaxDD: "最深",
  tailTitle: "尾部风险（基于收益）",
  var95: "VaR 95%",
  var99: "VaR 99%",
  cvar99: "CVaR 99%",
  skew: "偏度",
  kurt: "超额峰度",
  ratiosTitle: "绩效比率",
  sharpe: "夏普",
  sortino: "索提诺",
  calmar: "卡玛",
  omega: "欧米伽",
  tail: "尾部比",
  sterling: "斯特林",
  disclaimer: "示例曲线与预设参数均为教学示意，非真实历史行情；本工具用于演示风险度量的含义，不构成投资建议。",
  faqTitle: "常见问题",
  faqs: [
    { q: "最大回撤怎么看？", a: "最大回撤 = 净值从高点到后续低点的最大跌幅，衡量最坏亏损幅度；越大越说明策略在逆境中的脆弱度。" },
    { q: "VaR / CVaR 是什么？", a: "VaR(95%) 指 95% 概率下不超过的亏损；CVaR(99%) 是最糟 1% 的平均亏损，刻画尾部风险，比单一 VaR 更稳健。" },
    { q: "夏普、索提诺、卡玛区别？", a: "夏普=收益/总波动；索提诺=收益/下行波动；卡玛=年化收益/最大回撤——分别衡量风险调整后的盈利质量，越高越好。" },
    { q: "风险度量能预测未来吗？", a: "不能。它们只描述历史曲线特征；示例曲线用于理解定义，实盘需结合当前波动与回撤画像判断风险。" },
  ],
};
const en = {
  title: "Risk & Performance Dashboard",
  subtitle: "Paste an equity curve or pick a preset to read max drawdown / duration / recovery, VaR/CVaR tail risk, skew & kurtosis, plus Sharpe / Sortino / Calmar / Omega / Tail / Sterling ratios. Educational tool, not investment advice.",
  preset: "Choose an equity curve",
  custom: "Custom equity curve",
  customHint: "Net values separated by line/space/comma, at least 2 points; leave blank to use the preset above.",
  usingCustom: "Using the custom equity curve you entered.",
  confidence: "Confidence",
  rf: "Risk-free %",
  years: "Curve span (years)",
  notEnough: "Fewer than 2 net-value points — cannot compute the risk profile.",
  tier: "Risk Tier",
  totalRet: "Total Return",
  cagr: "CAGR",
  points: "Points",
  mls: "Max Losing Streak",
  drawdownTitle: "Drawdown Portrait",
  mdd: "Max Drawdown",
  duration: "Duration",
  recovery: "Recovery",
  recoveryNone: "Not recovered",
  ulcer: "Ulcer Index",
  avgDD: "Avg Drawdown",
  underwater: "Time Underwater",
  chartHint: "Red area = per-period drawdown magnitude (underwater curve); deeper & longer = worse.",
  chartX: "Time →",
  chartMaxDD: "Deepest",
  tailTitle: "Tail Risk (from returns)",
  var95: "VaR 95%",
  var99: "VaR 99%",
  cvar99: "CVaR 99%",
  skew: "Skewness",
  kurt: "Ex. Kurtosis",
  ratiosTitle: "Performance Ratios",
  sharpe: "Sharpe",
  sortino: "Sortino",
  calmar: "Calmar",
  omega: "Omega",
  tail: "Tail Ratio",
  sterling: "Sterling",
  disclaimer: "Example curves and preset parameters are illustrative, not real market data; this tool demonstrates what risk metrics mean, not investment advice.",
  faqTitle: "FAQ",
  faqs: [
    { q: "How do I read max drawdown?", a: "Max drawdown = the largest drop from a peak to the following trough, measuring worst-case loss magnitude; larger values signal greater fragility in adversity." },
    { q: "What are VaR and CVaR?", a: "VaR(95%) is the loss not exceeded with 95% probability; CVaR(99%) is the average loss in the worst 1% of cases — a more robust measure of tail risk than VaR alone." },
    { q: "Sharpe vs Sortino vs Calmar?", a: "Sharpe = return / total volatility; Sortino = return / downside volatility; Calmar = CAGR / max drawdown — each scores risk-adjusted quality, higher is better." },
    { q: "Can risk metrics predict the future?", a: "No. They only describe historical curve characteristics; presets illustrate definitions, while live use needs current volatility and drawdown context." },
  ],
};

