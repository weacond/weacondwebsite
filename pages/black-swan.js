"use client";

import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";

export const metadata = {
  title: "黑天鹅防御 — Weacond",
  description: "尾部风险识别与对冲，从2008到2020的历史复盘",
  robots: { index: true, follow: true },
};

const RISK_FACTORS = [
  { name: "VIX 恐慌指数", value: 18.5, level: "normal", desc: "当前市场恐慌水平" },
  { name: "信用利差", value: "1.2%", level: "normal", desc: "投资级债券利差" },
  { name: "期限利差", value: "1.8%", level: "normal", desc: "10Y-2Y 利差" },
  { name: "融资余额", value: "$610B", level: "elevated", desc: "保证金交易规模" },
  { name: "Put/Call 比率", value: "0.95", level: "normal", desc: "期权市场情绪" },
  { name: "实际利率", value: "2.1%", level: "elevated", desc: "TIPS 收益率" },
];

const HEDGE_SUGGESTIONS = [
  { risk: "VIX > 30", action: "买入 SPY 1.0 Put", cost: "0.5% 权利金", desc: "尾部对冲" },
  { risk: "信用利差 > 2%", action: "增配 TLT (长债)", cost: "分散化", desc: "流动性危机保护" },
  { risk: "期限利差倒挂", action: "减配周期股", cost: "减仓", desc: "衰退预警" },
  { risk: "融资余额 > $700B", action: "降低杠杆", cost: "风控", desc: "强制平仓风险" },
];

export default function BlackSwanPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-8">{L.subtitle}</p>

          {/* 风险因子仪表盘 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
            <h3 className="font-semibold mb-4">{L.riskFactors}</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {RISK_FACTORS.map((f) => (
                <div key={f.name} className={`p-4 rounded-lg border ${f.level === "elevated" ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}`}>
                  <div className="text-xs text-slate-500">{f.name}</div>
                  <div className="text-2xl font-bold mt-1">{f.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 对冲建议 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
            <h3 className="font-semibold mb-4">{L.hedgeSuggestions}</h3>
            <div className="space-y-3">
              {HEDGE_SUGGESTIONS.map((h, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-mono text-red-600 bg-red-50 px-2 py-1 rounded">{h.risk}</span>
                  <span className="text-sm font-medium">{h.action}</span>
                  <span className="text-xs text-slate-400">{h.cost} · {h.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 历史案例 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold mb-4">{L.history}</h3>
            <div className="space-y-4">
              {[
                { year: "2020", event: "新冠冲击", vixPeak: "82.4", dd: "-33%", recovery: "47d" },
                { year: "2018", event: "贸易战+缩表", vixPeak: "32.0", dd: "-18%", recovery: "12d" },
                { year: "2016", event: "英国脱欧", vixPeak: "35.2", dd: "-12%", recovery: "1d" },
                { year: "2008", event: "金融危机", vixPeak: "89.5", dd: "-50%", recovery: "320d" },
              ].map((e) => (
                <div key={e.year} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-bold">{e.year}</span>
                    <span className="ml-2 text-sm text-slate-500">{e.event}</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-red-500">VIX {e.vixPeak}</span>
                    <span className="text-slate-500">DD {e.dd}</span>
                    <span className="text-green-600">恢复 {e.recovery}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">{L.disclaimer}</p>
        </div>
      </section>
    </div>
  );
}

const zh = {
  title: "黑天鹅防御",
  subtitle: "尾部风险识别与对冲，从2008到2020的历史复盘",
  riskFactors: "风险因子仪表盘",
  hedgeSuggestions: "对冲建议",
  history: "历史案例",
  disclaimer: "黑天鹅事件不可预测。历史数据仅供参考，不构成投资建议。",
};
const en = {
  title: "Black Swan Defense",
  subtitle: "Tail risk identification and hedging. 2008-2020 case studies",
  riskFactors: "Risk Factor Dashboard",
  hedgeSuggestions: "Hedge Suggestions",
  history: "Historical Cases",
  disclaimer: "Black swan events are unpredictable. Historical data for reference only. Not investment advice.",
};
