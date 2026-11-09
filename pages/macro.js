import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import { assessMacroState } from "../lib/macro";
import Head from "next/head";

export const metadata = {
  title: "宏观情绪 — Weacond",
  description: "宏观状态识别、风险评分与资产配置建议",
  robots: { index: true, follow: true },
};

// 默认（演示）宏观指标：VIX 可被真实行情覆盖；其余（利率/通胀/就业/信用利差）为演示占位，需 FRED 数据源
const DEMO_INDICATORS = {
  rates: 4.5,
  inflation: 3.2,
  employment: 100,
  vix: 14.2,
  credit_spread: 1.1,
};

// 市场状态（regime）中英标签 + 完整徽章类（避免 Tailwind 动态类被 purge）
const REGIME_LABELS = {
  crisis: { zh: "危机", en: "Crisis", badge: "bg-red-100 text-red-700" },
  stagflation: { zh: "滞胀", en: "Stagflation", badge: "bg-orange-100 text-orange-700" },
  liquidity_blow: { zh: "流动性宽松", en: "Liquidity Boom", badge: "bg-green-100 text-green-700" },
  bull: { zh: "牛市", en: "Bull", badge: "bg-green-100 text-green-700" },
  neutral: { zh: "中性", en: "Neutral", badge: "bg-slate-100 text-slate-700" },
};

// 风险配色
function riskColor(score) {
  if (score >= 70) return "text-red-600";
  if (score >= 40) return "text-orange-500";
  return "text-green-600";
}
export default function MacroPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const [vix, setVix] = useState(DEMO_INDICATORS.vix);
  const [dataSource, setDataSource] = useState("demo");
  const [loadingVix, setLoadingVix] = useState(false);
  const [vixNote, setVixNote] = useState("");

  // 用当前 VIX（演示或真实）重新评估宏观状态；其余指标暂用演示占位
  const MACRO = assessMacroState({ ...DEMO_INDICATORS, vix });
  const regime = REGIME_LABELS[MACRO.regime] || REGIME_LABELS.neutral;

  // 拉取真实 VIX（Alpha Vantage）；无 key 时接口返回演示数据并标 live:false，此处诚实标注
  const loadRealVix = async () => {
    setLoadingVix(true); setVixNote("");
    try {
      const res = await fetch("/api/marketdata?symbol=VIX&interval=Daily&months=3");
      if (!res.ok) throw new Error(`${lang === "en" ? "Market API returned" : "行情接口返回"} ${res.status}`);
      const data = await res.json();
      const candles = data.candles || [];
      const last = candles[candles.length - 1];
      if (!last || !last.close) throw new Error(lang === "en" ? "No VIX data returned" : "未获取到 VIX 数据");
      setVix(Number(last.close));
      setDataSource(data.live ? "live" : "demo");
      setVixNote(data.live
        ? (lang === "en" ? `VIX ${last.close} (live, ${last.date?.slice(0, 10)})` : `VIX ${last.close}（实时 · ${last.date?.slice(0, 10)}）`)
        : (lang === "en" ? "No API key configured — showing demo VIX" : "未配置 API key — 显示演示 VIX"));
    } catch (e) {
      setVixNote(e.message || "Failed to load VIX");
    } finally {
      setLoadingVix(false);
    }
  };

  // 宏观指标（带单位 + 解读）
  const indicators = [
    { key: "rates", label: lang === "en" ? "Fed Funds Rate" : "联邦基金利率", value: MACRO.indicators.rates, unit: "%" },
    { key: "inflation", label: lang === "en" ? "Inflation (CPI)" : "通胀 CPI", value: MACRO.indicators.inflation, unit: "%" },
    { key: "vix", label: "VIX", value: MACRO.indicators.vix, unit: "" },
    { key: "credit_spread", label: lang === "en" ? "Credit Spread" : "信用利差", value: MACRO.indicators.credit_spread, unit: "%" },
    { key: "employment", label: lang === "en" ? "Employment Index" : "就业指数", value: MACRO.indicators.employment, unit: "" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">{L.title}</h1>
              <p className="text-slate-500 text-sm mt-1">{L.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadRealVix} disabled={loadingVix}
                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {loadingVix ? "…" : (lang === "en" ? "Load live VIX" : "加载实时 VIX")}
              </button>
              <span className={`text-xs px-3 py-1 rounded-full ${dataSource === "live" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {dataSource === "live" ? (lang === "en" ? "Live VIX" : "实时 VIX") : L.demoLabel}
              </span>
            </div>
          </div>

          {/* 状态 + 风险分 */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="text-sm text-slate-400 mb-1">{L.regime}</div>
              <div className="text-3xl font-bold">
                <span className={`px-3 py-1 rounded-full ${regime.badge}`}>
                  {lang === "en" ? regime.en : regime.zh}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-3">{L.summary}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="text-sm text-slate-400 mb-1">{L.riskScore}</div>
              <div className={`text-3xl font-bold ${riskColor(MACRO.riskScore)}`}>
                {MACRO.riskScore}
                <span className="text-base text-slate-400 font-normal"> / 100</span>
              </div>
              <p className="text-sm text-slate-500 mt-3">{L.riskNote}</p>
            </div>
          </div>

          {/* 宏观指标 */}
          <h2 className="text-lg font-bold mb-3">{L.indicators}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {indicators.map((i) => (
              <div key={i.key} className="bg-white rounded-lg p-4 border border-slate-100 text-center">
                <div className="text-xs text-slate-400 mb-1">{i.label}</div>
                <div className="text-2xl font-bold">{i.value}{i.unit}</div>
                {i.key === "vix" && (
                  <div className={`text-xs mt-1 ${dataSource === "live" ? "text-green-600 font-medium" : "text-slate-400"}`}>
                    {dataSource === "live" ? (lang === "en" ? "live" : "实时") : (lang === "en" ? "demo" : "演示")}
                  </div>
                )}
              </div>
            ))}
          </div>
          {vixNote && (
            <p className={`text-xs mb-8 ${dataSource === "live" ? "text-green-600" : "text-amber-600"}`}>{vixNote}</p>
          )}

          {/* 配置建议 */}
          <h2 className="text-lg font-bold mb-3">{L.allocation}</h2>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b">
                  <th className="pb-2 font-medium">{L.asset}</th>
                  <th className="pb-2 font-medium">{L.allocation}</th>
                  <th className="pb-2 font-medium">{L.reason}</th>
                </tr>
              </thead>
              <tbody>
                {MACRO.suggestions.map((s, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 font-medium">{s.asset}</td>
                    <td className="py-2 text-indigo-600 font-semibold">{s.allocation}</td>
                    <td className="py-2 text-slate-500">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400 mt-6 text-center">{L.disclaimer}</p>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "宏观情绪",
  subtitle: "市场状态识别 · 风险评分 · 资产配置建议（引擎评估）",
  demoLabel: "示例数据 · 非实时",
  regime: "当前市场状态",
  riskScore: "风险评分",
  riskNote: "综合 VIX、信用利差、通胀与利率；越高越需防御与现金。",
  summary: "状态决定配置基调：危机/滞胀偏防御，宽松/牛市偏进攻，中性均衡。",
  indicators: "宏观指标",
  allocation: "资产配置建议",
  asset: "资产",
  reason: "理由",
  disclaimer: "基于 lib/macro 引擎评估；VIX 可加载实时行情，其余指标为演示占位。配置建议非投资建议。",
};
const en = {
  title: "Market Sentiment",
  subtitle: "Regime detection · Risk score · Allocation (engine-evaluated)",
  demoLabel: "Demo Data · Not Live",
  regime: "Current Regime",
  riskScore: "Risk Score",
  riskNote: "Composite of VIX, credit spread, inflation & rates; higher = more defensive.",
  summary: "Regime sets the tone: crisis/stagflation lean defensive, boom/bull lean aggressive, neutral is balanced.",
  indicators: "Macro Indicators",
  allocation: "Allocation Suggestions",
  asset: "Asset",
  reason: "Reason",
  disclaimer: "Evaluated by lib/macro; VIX can load live data, other indicators are demo placeholders. Allocation suggestions are not investment advice.",
};

