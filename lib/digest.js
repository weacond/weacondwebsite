// lib/digest.js — 每日信号简报生成器（纯函数，SSR/Edge 安全，可单元测试）
//
// 把「今天的信号 + 市场状态」浓缩成一份结构化、诚实的简报，同一份内容供
// 页面渲染与未来邮件复用（单一事实源）。手册 §4「邮件自动化」/ 留存漏斗。
// 复用 lib/signalApi.js（按胜率排序的三引擎信号）。

import { buildSignalApi } from "./signalApi.js";

// 生成每日简报对象。opts 可注入 date/未注入的 universe/weights/dataMode/headline/cta。
export function buildDailyDigest(opts = {}) {
  const date = opts.date || new Date().toISOString().slice(0, 10);
  const signals = buildSignalApi(opts.universe, opts.weights, {
    generatedAt: opts.generatedAt || new Date().toISOString(),
    dataMode: opts.dataMode || "estimated",
  });

  const top = signals.signals.slice(0, opts.topN ?? 3);
  // 今日风险：取 IV Rank 最高者（期权卖方视角：IV 越高 Theta 越好，但波动越大）
  const risk = signals.signals
    .slice()
    .sort((a, b) => b.ivRank - a.ivRank)[0] || null;

  return {
    date,
    engine: signals.engine,
    dataMode: signals.dataMode,
    headline: opts.headline || "今日信号简报",
    top, // 按盈利概率降序的 Top-N
    topSignal: top[0] || null,
    riskOfTheDay: risk
      ? { ticker: risk.ticker, ivRank: risk.ivRank, riskLevel: risk.riskLevel }
      : null,
    disclaimer: signals.disclaimer,
    cta: opts.cta || "查看完整信号 → /signals",
  };
}

// 纯文本版（供邮件/通知；不含 HTML）。
export function formatDigestText(d = {}, lang = "zh") {
  if (!d || !d.date) return "";
  const L = lang === "en" ? enText : zhText;
  const lines = [d.headline || L.headline, L.date.replace("{d}", d.date), ""];
  if (d.topSignal) {
    lines.push(L.top.replace("{t}", d.topSignal.ticker).replace("{p}", Math.round(d.topSignal.probOfProfit * 100) + "%"));
  }
  (d.top || []).forEach((s, i) => {
    lines.push(`${i + 1}. ${s.ticker} — P(+)≈${Math.round(s.probOfProfit * 100)}% [95% ${Math.round(s.confidenceBand[0] * 100)}–${Math.round(s.confidenceBand[1] * 100)}%]`);
  });
  if (d.riskOfTheDay) {
    lines.push("", L.risk.replace("{t}", d.riskOfTheDay.ticker).replace("{iv}", d.riskOfTheDay.ivRank));
  }
  lines.push("", d.disclaimer || L.disclaimer);
  return lines.join("\n");
}

const zhText = {
  headline: "今日信号简报",
  date: "日期：{d}",
  top: "今日最高盈利概率：{t}（≈ 需看区间）",
  risk: "今日波动焦点：{t}（IV Rank {iv}）",
  disclaimer: "教育性参考，非投资建议。盈利概率为正态近似，真实肥尾下实际更低。",
};
const enText = {
  headline: "Today's Signal Brief",
  date: "Date: {d}",
  top: "Top win probability: {t}",
  risk: "Volatility focus: {t} (IV Rank {iv})",
  disclaimer: "Educational only, not investment advice. Probabilities are normal approximations; fat tails are worse.",
};

export default buildDailyDigest;
