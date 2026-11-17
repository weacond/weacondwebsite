"use client";

import Navbar from "../components/Navbar";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";

export const metadata = {
  title: "资源中心 · 学习路径 — Weacond",
  description:
    "从入门到精通：学习路径、策略市场、概念词典、投资书房与全部计算工具，一站直达。",
  robots: { index: true, follow: true },
};

// 资源中心：把已分散在 100+ 页里的能力与内容，按「买家问题」聚成单一可发现入口。
// 全部链接指向已存在的页面（零编造），设计语言与站内一致（卡片磁贴 + 分类分块）。
const zh = {
  title: "资源中心",
  subtitle: "从入门到精通，把分散在站内各处的能力与内容，收进一个清晰的入口。",
  groups: [
    {
      title: "从这里开始",
      items: [
        { icon: "🧭", title: "学习路径", desc: "入门→进阶→高级，循序渐进", href: "/learning" },
        { icon: "📖", title: "概念词典", desc: "Sharpe / 回撤 / VaR / Kelly 双语定义", href: "/glossary" },
        { icon: "🔎", title: "搜索", desc: "搜全部工具与量化概念，实时匹配", href: "/search" },
      ],
    },
    {
      title: "策略与回测",
      items: [
        { icon: "⚖️", title: "策略市场", desc: "发现、评估、零代码复用量化策略", href: "/strategies" },
        { icon: "📈", title: "回测引擎", desc: "参数化回测，含滑点 / 佣金 / 分红", href: "/backtest" },
        { icon: "💼", title: "模拟交易", desc: "零风险模拟盘，全链路演练", href: "/paper" },
      ],
    },
    {
      title: "信号与宏观",
      items: [
        { icon: "📊", title: "三引擎信号", desc: "基本面 + 技术面 + 波动面评分", href: "/signals" },
        { icon: "🌐", title: "宏观情绪", desc: "市场体制识别 + 风险评分", href: "/macro" },
        { icon: "🧭", title: "市场体制", desc: "VIX · 趋势 · 收益率曲线 · 信用", href: "/regime" },
        { icon: "🌡️", title: "恐惧指数", desc: "VIX 式恐慌度与情绪标签", href: "/fear" },
      ],
    },
    {
      title: "期权",
      items: [
        { icon: "⚡", title: "期权工具", desc: "IV Rank / Theta / 盈亏图", href: "/options" },
        { icon: "🛡️", title: "卖 Put 增强", desc: "ATM Put + Gamma 对冲", href: "/putseller" },
        { icon: "📐", title: "期权盈亏", desc: "多腿盈亏与希腊字母", href: "/options-payoff" },
      ],
    },
    {
      title: "组合与风险",
      items: [
        { icon: "📊", title: "组合优化", desc: "5 种配权 + 有效前沿", href: "/portfolio" },
        { icon: "🛡️", title: "风险仪表盘", desc: "最大回撤 / VaR / CVaR", href: "/risk" },
        { icon: "🎲", title: "蒙特卡洛", desc: "财富路径 + 终端分布", href: "/montecarlo" },
        { icon: "🧰", title: "全部工具集", desc: "全部金融计算工具", href: "/calculators" },
      ],
    },
    {
      title: "深度阅读",
      items: [
        { icon: "📚", title: "投资书房", desc: "中英双语电子书", href: "/ebooks" },
        { icon: "✅", title: "上线检查清单", desc: "逐项清除 Blocker", href: "/launchcheck" },
      ],
    },
  ],
};

const en = {
  title: "Resource Hub",
  subtitle:
    "From first steps to mastery — every capability and resource scattered across the site, gathered into one clear entry point.",
  groups: [
    {
      title: "Start here",
      items: [
        { icon: "🧭", title: "Learning Path", desc: "Beginner → advanced, step by step", href: "/learning" },
        { icon: "📖", title: "Glossary", desc: "Sharpe / drawdown / VaR / Kelly, bilingual", href: "/glossary" },
        { icon: "🔎", title: "Search", desc: "Search every tool & concept, live matching", href: "/search" },
      ],
    },
    {
      title: "Strategies & Backtest",
      items: [
        { icon: "⚖️", title: "Strategy Market", desc: "Discover, evaluate, reuse zero-code strategies", href: "/strategies" },
        { icon: "📈", title: "Backtest Engine", desc: "Parameterized, with slippage / fees / dividends", href: "/backtest" },
        { icon: "💼", title: "Paper Trading", desc: "Risk-free full-cycle simulation", href: "/paper" },
      ],
    },
    {
      title: "Signals & Macro",
      items: [
        { icon: "📊", title: "Three-Engine Signals", desc: "Fundamental + technical + volatility", href: "/signals" },
        { icon: "🌐", title: "Macro Sentiment", desc: "Regime detection + risk scoring", href: "/macro" },
        { icon: "🧭", title: "Market Regime", desc: "VIX · trend · yield curve · credit", href: "/regime" },
        { icon: "🌡️", title: "Fear Index", desc: "VIX-style fear gauge & mood", href: "/fear" },
      ],
    },
    {
      title: "Options",
      items: [
        { icon: "⚡", title: "Options", desc: "IV Rank / Theta / payoff", href: "/options" },
        { icon: "🛡️", title: "Sell Put", desc: "ATM Put + Gamma hedge", href: "/putseller" },
        { icon: "📐", title: "Options Payoff", desc: "Multi-leg payoff & Greeks", href: "/options-payoff" },
      ],
    },
    {
      title: "Portfolio & Risk",
      items: [
        { icon: "📊", title: "Portfolio Optimizer", desc: "5 weightings + efficient frontier", href: "/portfolio" },
        { icon: "🛡️", title: "Risk Dashboard", desc: "Max drawdown / VaR / CVaR", href: "/risk" },
        { icon: "🎲", title: "Monte Carlo", desc: "Wealth paths + terminal distribution", href: "/montecarlo" },
        { icon: "🧰", title: "All Calculators", desc: "Every financial calculator", href: "/calculators" },
      ],
    },
    {
      title: "Go deeper",
      items: [
        { icon: "📚", title: "Reading Room", desc: "Bilingual e-books", href: "/ebooks" },
        { icon: "✅", title: "Launch Checklist", desc: "Clear every blocker", href: "/launchcheck" },
      ],
    },
  ],
};

export default function ResourcesPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head><title>{L.title}</title></Head>
      <Navbar />
      <section className="pt-24 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">{L.title}</h1>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">{L.subtitle}</p>
        </div>
      </section>
      <section className="pb-24 px-4">
        <div className="max-w-5xl mx-auto space-y-12">
          {L.groups.map((g, gi) => (
            <div key={gi}>
              <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                {g.title}
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {g.items.map((it, i) => (
                  <Link
                    key={i}
                    href={it.href}
                    className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all"
                  >
                    <div className="text-2xl mb-2 w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-50">
                      {it.icon}
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{it.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{it.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}