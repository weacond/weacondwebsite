import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import { assessMacroState } from "../lib/macro";
import Head from "next/head";

export const metadata = {
  title: "宏观情绪 — Weacond",
  description: "宏观状态识别、风险评分与资产配置建议",
  robots: { index: true, follow: true },
};

// 用现有 lib/macro 引擎评估默认宏观指标（mock；接入真实数据后只改这里）
const MACRO = assessMacroState({
  rates: 4.5,
  inflation: 3.2,
  employment: 100,
  vix: 14.2,
  credit_spread: 1.1,
});

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
  const regime = REGIME_LABELS[MACRO.regime] || REGIME_LABELS.neutral;

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
            <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
              {L.demoLabel}
            </span>
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
              </div>
            ))}
          </div>

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
  disclaimer: "基于 lib/macro 引擎评估的示例数据；配置建议非投资建议。",
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
  disclaimer: "Sample data evaluated by lib/macro; allocation suggestions are not investment advice.",
};

