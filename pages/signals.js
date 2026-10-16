import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";

export const metadata = {
  title: "今日信号 — Weacond",
  description: "三引擎合成信号，可解释评分",
  robots: { index: true, follow: true },
};

// 示例信号数据（实际接入行情 API 后替换）
const DEMO_SIGNALS = [
  { ticker:"NVDA", name:"NVIDIA", score:82, direction:"bullish",
    f:91, t:88, v:65, ivRank:78, reason:"AI需求强劲，技术突破$130阻力", source:"Weacond Engine v0.1" },
  { ticker:"AAPL", name:"Apple", score:64, direction:"mild_bullish",
    f:70, t:62, v:55, ivRank:45, reason:"财报预期温和，支撑位$195", source:"Weacond Engine v0.1" },
  { ticker:"TSLA", name:"Tesla", score:38, direction:"mild_bearish",
    f:35, t:30, v:70, ivRank:82, reason:"交付不及预期，IV偏高适合卖Put", source:"Weacond Engine v0.1" },
  { ticker:"SPY", name:"S&P 500 ETF", score:71, direction:"bullish",
    f:75, t:72, v:50, ivRank:40, reason:"宏观利好，趋势向上", source:"Weacond Engine v0.1" },
];

export default function SignalsPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

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
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
              {L.demoLabel}
            </span>
          </div>

          {/* 信号卡片列表 */}
          <div className="space-y-4">
            {DEMO_SIGNALS.map((s) => {
              const scoreColor = s.score >= 70 ? "text-green-600" : s.score >= 50 ? "text-yellow-600" : s.score >= 30 ? "text-orange-600" : "text-red-600";
              const dirColor = s.direction === "bullish" ? "text-green-600" : s.direction === "mild_bullish" ? "text-yellow-600" : s.direction === "mild_bearish" ? "text-orange-600" : "text-red-600";
              return (
                <div key={s.ticker} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-lg font-bold">{s.ticker}</span>
                      <span className="text-slate-500 text-sm ml-2">{s.name}</span>
                    </div>
                    <div className={`text-right`}>
                      <div className={`text-3xl font-bold ${scoreColor}`}>{s.score}</div>
                      <div className={`text-xs font-medium ${dirColor}`}>
                        {s.direction === "bullish" ? "▲▲ 看多" : s.direction === "mild_bullish" ? "▲ 偏多" : s.direction === "mild_bearish" ? "▼ 偏空" : "▼▼ 看空"}
                      </div>
                    </div>
                  </div>
                  {/* 三引擎分数条 */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[["📊 基础面", s.f], ["📈 技术面", s.t], ["⚡ 波动面", s.v]].map(([label, val], i) => (
                      <div key={i}>
                        <div className="text-xs text-slate-500 mb-1">{label}</div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${val>=70?"bg-green-500":val>=50?"bg-yellow-500":"bg-orange-500"}`}
                            style={{width:`${val}%`}} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{s.reason}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>IV Rank: {s.ivRank}</span>
                    <span>{s.source}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 升级提示 */}
          <div className="mt-8 bg-indigo-50 rounded-xl p-6 text-center border border-indigo-100">
            <p className="text-indigo-800 font-medium mb-4">{L.upgradePrompt}</p>
            <Link href="/pricing" className="inline-block bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-500 transition-colors">
              {L.upgradeCta}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const zh = {
  title: "今日信号",
  subtitle: "三引擎合成评分 · 可解释 · 附数据来源",
  demoLabel: "示例数据 · 非实时",
  upgradePrompt: "解锁每日 5-10 条卖 Put 筛选、IV Rank、Greeks 摘要与风控建议",
  upgradeCta: "查看 PutSeller 方案",
};
const en = {
  title: "Today's Signals",
  subtitle: "3-Engine composite scoring · Explainable · With sources",
  demoLabel: "Demo Data · Not Live",
  upgradePrompt: "Unlock 5-10 put options daily, IV Rank, Greeks, and risk management",
  upgradeCta: "View PutSeller Plan",
};