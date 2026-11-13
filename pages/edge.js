"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import StructuredData from "../components/StructuredData";
import { softwareLd, faqLd } from "../lib/jsonLd.js";

// /edge — 方法论页：把「卖确定性的概率」讲清楚（三引擎 + 肥尾风险 + 置信区间）。
// 诚实教育页：不承诺收益、不编造数字；概率都披露假设与肥尾限制。

export default function EdgePage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;

  const faqs = [
    { q: L.faq1q, a: L.faq1a },
    { q: L.faq2q, a: L.faq2a },
    { q: L.faq3q, a: L.faq3a },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title} — Weacond</title>
        <meta name="description" content={L.subtitle} />
      </Head>
      <StructuredData
        data={[
          softwareLd({
            id: "edge",
            icon: "🧭",
            title: "方法论 · 把不确定性量化成概率",
            titleEn: "Edge — Quantifying Uncertainty",
            desc: "三引擎信号 + 盈利概率 + 95% 置信区间，把「感觉」变成「可解释的概率」。",
            descEn:
              "Three-engine signals, win probability and 95% confidence intervals: turning feel into explainable probability.",
            href: "/edge",
            category: "methodology",
          }),
          faqLd(faqs),
        ]}
      />
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">{L.lede}</p>

          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {L.engines.map((e) => (
              <div key={e.icon} className="bg-white rounded-xl p-5 border border-slate-100">
                <div className="text-2xl mb-1">{e.icon}</div>
                <div className="font-semibold mb-1">{e.title}</div>
                <p className="text-sm text-slate-500">{e.body}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-5 border border-amber-200 bg-amber-50 mb-10">
            <div className="font-semibold mb-1">⚠️ {L.riskTitle}</div>
            <p className="text-sm text-slate-600 leading-relaxed">{L.riskBody}</p>
          </div>

          <h2 className="text-xl font-bold mb-4">{L.faqTitle}</h2>
          <div className="space-y-3 mb-10">
            {faqs.map((f, i) => (
              <details key={i} className="bg-white rounded-xl p-4 border border-slate-100">
                <summary className="font-medium cursor-pointer">{f.q}</summary>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/signals"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              {L.ctaSignals}
            </Link>
            <Link
              href="/winrate"
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-100"
            >
              {L.ctaWinrate}
            </Link>
            <Link
              href="/digest"
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-100"
            >
              {L.ctaDigest}
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

const zh = {
  title: "方法论 · 卖确定性的概率",
  subtitle:
    "三引擎信号 + 盈利概率 + 95% 置信区间：把「感觉」变成可解释、可回测、可对冲的概率。教育性参考，非投资建议。",
  lede:
    "市场没有 100% 的确定性，只有概率。Weacond 把基本面、技术面、波动率三个维度量化成一个「盈利概率」，并给出 95% 置信区间与假设——让你卖的是「带区间的概率」，而不是「拍脑袋的方向」。",
  engines: [
    { icon: "📊", title: "基本面引擎", body: "用公允价值分衡量「贵不贵」，过滤掉明显被高估的标的。" },
    { icon: "📈", title: "技术引擎", body: "用动量/趋势分衡量「方向对不对」，捕捉短期价格结构。" },
    { icon: "🌊", title: "波动率引擎", body: "用 IV Rank 与 theta 衡量时间价值，把波动变成可定价的风险。" },
  ],
  riskTitle: "肥尾风险：正态近似会低估尾部",
  riskBody:
    "我们给的是正态近似下的盈利概率。真实市场有肥尾，实际盈利概率通常比显示值更低。请配合止损/对冲，并把概率当作「赔率」而非「保证」。",
  faqTitle: "常见问题",
  faq1q: "盈利概率是怎么算出来的？",
  faq1a:
    "把综合信号分（0–1）近似为 edge，乘以每步波动率与持有期，得到持有期收益分布，再积分得到 P(收益>0)。每一步都披露假设。",
  faq2q: "为什么还要看 95% 置信区间？",
  faq2a: "单点概率会掩盖不确定性。置信区间告诉你「这个概率本身有多稳」，避免把噪声当信号。",
  faq3q: "这是投资建议吗？",
  faq3a: "不是。所有内容都是教育性参考，不构成买卖建议。请自行决策并对自己的资金负责。",
  ctaSignals: "看今日信号",
  ctaWinrate: "检验策略胜率",
  ctaDigest: "订阅每日简报",
};

const en = {
  title: "Edge — Sell Certainty as Probability",
  subtitle:
    "Three-engine signals + win probability + 95% confidence intervals: turning feel into explainable, backtestable, hedgeable probability. Educational only, not investment advice.",
  lede:
    "Markets have no 100% certainty, only probability. Weacond quantifies fundamentals, technicals and volatility into a single win probability with a 95% confidence interval and stated assumptions — so you sell a 'probable outcome with a range', not a gut direction.",
  engines: [
    {
      icon: "📊",
      title: "Fundamentals",
      body: "A fair-value score for 'is it overpriced', filtering out obvious overvaluations.",
    },
    {
      icon: "📈",
      title: "Technicals",
      body: "A momentum/trend score for 'is the direction right', capturing short-term structure.",
    },
    {
      icon: "🌊",
      title: "Volatility",
      body: "IV Rank and theta for time value, pricing volatility as risk.",
    },
  ],
  riskTitle: "Fat-tail risk: the normal approximation understates the tails",
  riskBody:
    "We show win probability under a normal approximation. Real markets are fat-tailed, so actual win probability is usually lower than displayed. Use stops/hedges, and treat probability as odds, not guarantees.",
  faqTitle: "FAQ",
  faq1q: "How is win probability computed?",
  faq1a:
    "We treat the composite signal score (0–1) as an edge, multiply by per-step volatility and horizon to get a return distribution, then integrate P(return>0). Every step states its assumptions.",
  faq2q: "Why show a 95% confidence interval too?",
  faq2a:
    "A single point hides uncertainty. The interval tells you how stable the probability itself is, so you don't mistake noise for signal.",
  faq3q: "Is this investment advice?",
  faq3a:
    "No. Everything here is educational reference, not a buy/sell recommendation. Make your own decisions and own your capital.",
  ctaSignals: "See today's signals",
  ctaWinrate: "Test a strategy",
  ctaDigest: "Subscribe to the brief",
};
