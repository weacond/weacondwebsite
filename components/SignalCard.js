// components/SignalCard.js — 信号卡片（可复用）
// 把「信号 + 回测 + AI」三柱串起来：每张卡片展示三引擎合成评分、可解释性，
// 并提供「查看回测」「AI 解读」两个动作，是平台的核心交互单元。
//
// 兼容两种数据形态：
//   1) DEMO 形态：{ ticker, name, score, direction, f, t, v, ivRank, reason, source }
//   2) computeSignalScore 形态：{ score, direction, riskLevel, components:{fundamental,technical,volatility}, ivRank, rationale:{...} }

import Link from "next/link";
import { useLanguage } from "../contexts/LanguageContext";

function EngineBar({ label, value }) {
  const color = value >= 70 ? "bg-green-500" : value >= 50 ? "bg-yellow-500" : "bg-orange-500";
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function SignalCard({ signal }) {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const s = signal || {};

  const score = s.score ?? 0;
  const direction = s.direction || "neutral";

  // 兼容两种形态：components 优先，否则取 f/t/v
  const comp = s.components;
  const f = comp ? comp.fundamental : s.f ?? 0;
  const t = comp ? comp.technical : s.t ?? 0;
  const v = comp ? comp.volatility : s.v ?? 0;
  const ivRank = s.ivRank ?? 0;
  const ticker = s.ticker || "—";
  const name = s.name || "";

  // 可解释性：reason（DEMO）或 rationale（computeSignalScore 的字典）
  let reason = s.reason;
  if (!reason && s.rationale && typeof s.rationale === "object") {
    reason = Object.values(s.rationale).filter(Boolean).join("；");
  }

  const scoreColor =
    score >= 70 ? "text-green-600" : score >= 50 ? "text-yellow-600" : score >= 30 ? "text-orange-600" : "text-red-600";

  const dirLabels = {
    bullish: lang === "en" ? "▲▲ Bullish" : "▲▲ 看多",
    mild_bullish: lang === "en" ? "▲ Mild Bull" : "▲ 偏多",
    mild_bearish: lang === "en" ? "▼ Mild Bear" : "▼ 偏空",
    bearish: lang === "en" ? "▼▼ Bearish" : "▼▼ 看空",
    neutral: lang === "en" ? "— Neutral" : "— 中性",
  };
  const dirColor =
    direction === "bullish" ? "text-green-600" : direction === "mild_bullish" ? "text-yellow-600" : direction === "mild_bearish" ? "text-orange-600" : direction === "bearish" ? "text-red-600" : "text-slate-500";

  const riskLabels = { high_iv: L.riskHigh, low_iv: L.riskLow, moderate: L.riskMod };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      {/* 头部：标的 + 综合评分 + 方向 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-lg font-bold">{ticker}</span>
          <span className="text-slate-500 text-sm ml-2">{name}</span>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${scoreColor}`}>{score}</div>
          <div className={`text-xs font-medium ${dirColor}`}>{dirLabels[direction] || dirLabels.neutral}</div>
        </div>
      </div>

      {/* 三引擎分数条 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <EngineBar label={L.fundamental} value={f} />
        <EngineBar label={L.technical} value={t} />
        <EngineBar label={L.volatility} value={v} />
      </div>

      {/* 可解释性 */}
      {reason && <p className="text-sm text-slate-600 mb-2">{reason}</p>}

      <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
        <span>
          {L.ivRank}: {ivRank}
          {s.riskLevel ? ` · ${riskLabels[s.riskLevel] || ""}` : ""}
        </span>
        <span>{s.source || L.engine}</span>
      </div>

      {/* 三柱串联：回测 + AI 解读 */}
      <div className="flex gap-2">
        <Link
          href="/backtest"
          className="flex-1 text-center text-xs bg-slate-100 text-slate-700 py-2 px-3 rounded-lg hover:bg-slate-200 transition-colors"
        >
          {L.viewBacktest} →
        </Link>
        <Link
          href="/ai"
          className="flex-1 text-center text-xs bg-indigo-600 text-white py-2 px-3 rounded-lg hover:bg-indigo-500 transition-colors"
        >
          {L.aiExplain} →
        </Link>
      </div>
    </div>
  );
}

const zh = {
  fundamental: "📊 基础面",
  technical: "📈 技术面",
  volatility: "⚡ 波动面",
  viewBacktest: "查看回测",
  aiExplain: "AI 解读",
  engine: "Weacond Engine v0.1",
  ivRank: "IV Rank",
  riskHigh: "高 IV",
  riskLow: "低 IV",
  riskMod: "中 IV",
};
const en = {
  fundamental: "📊 Fundamental",
  technical: "📈 Technical",
  volatility: "⚡ Volatility",
  viewBacktest: "Backtest",
  aiExplain: "AI Explain",
  engine: "Weacond Engine v0.1",
  ivRank: "IV Rank",
  riskHigh: "High IV",
  riskLow: "Low IV",
  riskMod: "Mod IV",
};
