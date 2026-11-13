"use client";

import { useLanguage } from "../contexts/LanguageContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Head from "next/head";
import CalcLd from "../components/CalcLd";
import { buildPutScreener, DEFAULT_PUT_UNIVERSE } from "../lib/putseller";

// 卖 Put 筛选结果（纯函数、确定性、无网络）。B-S 模型估算，非实时报价。
const results = buildPutScreener(DEFAULT_PUT_UNIVERSE, { expiryDays: 30 });
const excludedCount = DEFAULT_PUT_UNIVERSE.length - results.length;

const meta = {
  zh: {
    title: "卖 Put 筛选器 · Weacond",
    description:
      "从 IV Rank > 50 且基本面 > 60 的标的中，用 B-S 模型选出高 Theta 优势、低实值概率的虚值 Put，并给出权利金、实值概率与时间衰减。",
    keywords: "卖 Put, Put 筛选器, IV Rank, Theta 优势, 期权卖方, 增强收益, 权利金, 实值概率",
    h1: "卖 Put 筛选器",
    sub: "在 IV 高企、质地优良的标的里，找到 Theta 站在你这一边、被赋值概率低的虚值 Put。",
    resultsTitle: "通过筛选的卖 Put 机会",
    emptyTitle: "暂无通过筛选的标的",
    emptySub: "当前标的池没有同时满足「IV Rank > 50」与「基本面 > 60」的标的。",
    excludedNote: "另有 {n} 个标的未通过筛选（IV Rank 偏低或基本面不足），已隐去。",
    colTicker: "标的",
    colSpot: "现价",
    colStrike: "行权价",
    colExpiry: "到期",
    colIvRank: "IV Rank",
    colPremium: "权利金",
    colProbProfit: "盈利概率",
    colBreakeven: "盈亏平衡",
    colProbITM: "实值概率",
    colTheta: "Theta",
    colScore: "综合分",
    colAction: "操作",
    actionSell: "卖 Put",
    howTitle: "筛选逻辑",
    how1: "IV Rank > 50：隐含波动率高于自身历史，权利金含「波动率溢价」，卖方有 Theta 优势。",
    how2: "基本面评分 > 60：质地好或估值被低估，愿意长期持有的标的。",
    how3: "选虚值 Put（strike 低于现价 10%），实值概率 < 50%，到期大概率归零、收全权利金。",
    riskTitle: "风险与纪律",
    risk1: "最大亏损 = 行权价 − 权利金（接近整股），非仅权利金；务必预留保证金。",
    risk2: "盈亏平衡点 = 行权价 − 权利金；股价跌破此价即亏损。",
    risk3: "IV Rank 高不代表方向看跌，只是「定价偏贵」；请结合仓位与组合敞口决策。",
    disclaimer:
      "本页为 B-S 模型估算，非实时交易所报价，亦非投资建议。期权交易具有高风险，可能导致超出权利金的亏损。请结合自身情况并咨询专业人士。",
  },
  en: {
    title: "Put-Selling Screener · Weacond",
    description:
      "Screen for out-of-the-money puts with high IV Rank, strong fundamentals, high Theta edge and low probability of finishing in-the-money, priced with a Black-Scholes model.",
    keywords: "sell put, put screener, IV rank, theta, options selling, premium, probability of ITM",
    h1: "Put-Selling Screener",
    sub: "Find OTM puts where Theta favors the seller and the odds of assignment are low — in high-IV, high-quality names.",
    resultsTitle: "Puts passing the screen",
    emptyTitle: "No puts pass the screen",
    emptySub: "No name in the current universe clears both IV Rank > 50 and fundamentals > 60.",
    excludedNote: "{n} more names were filtered out (low IV Rank or weak fundamentals).",
    colTicker: "Ticker",
    colSpot: "Spot",
    colStrike: "Strike",
    colExpiry: "Expiry",
    colIvRank: "IV Rank",
    colPremium: "Premium",
    colProbProfit: "P(profit)",
    colBreakeven: "Breakeven",
    colProbITM: "P(ITM)",
    colTheta: "Theta",
    colScore: "Score",
    colAction: "Action",
    actionSell: "Sell Put",
    howTitle: "How the screen works",
    how1: "IV Rank > 50: implied vol is above its own history, so premium carries a vol premium — a Theta edge for the seller.",
    how2: "Fundamentals > 60: quality or undervalued names you are willing to own long term.",
    how3: "Pick OTM puts (strike 10% below spot); P(ITM) < 50% — they likely expire worthless, keeping the premium.",
    riskTitle: "Risk & discipline",
    risk1: "Max loss ≈ strike − premium (close to a full share), not just the premium; reserve margin.",
    risk2: "Breakeven = strike − premium; below it the position loses money.",
    risk3: "High IV Rank is not a bearish call — it means 'priced rich'. Combine with position size and portfolio exposure.",
    disclaimer:
      "Black-Scholes estimate, not a live exchange quote or investment advice. Options carry high risk and can lose more than the premium. Consult a professional.",
  },
};

function fmt(n, dp = 2) {
  return typeof n === "number" && Number.isFinite(n)
    ? n.toFixed(dp)
    : "—";
}

export default function PutSellingPage() {
  const { lang } = useLanguage();
  const t = meta[lang] || meta.zh;
  const excluded = t.excludedNote.replace("{n}", excludedCount);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{t.title}</title>
        <meta name="description" content={t.description} />
        <meta name="keywords" content={t.keywords} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://weacond.com/putseller" />
        <meta property="og:title" content={t.title} />
        <meta property="og:description" content={t.description} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content={lang === "zh" ? "zh_CN" : "en_US"} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: t.title,
              description: t.description,
              brand: { "@type": "Brand", name: "Weacond" },
            }),
          }}
        />
      </Head>
      <CalcLd slug="putseller" />
      <Navbar />
      <main className="pt-20 min-h-screen">
        <section className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            {t.h1}
          </h1>
          <p className="mt-3 text-slate-600 max-w-2xl">{t.sub}</p>

          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              {t.resultsTitle}
            </h2>
            <span className="text-xs text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5 align-middle" />
              {lang === "zh" ? "模型估算 · 非实时" : "Model estimate · not live"}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-500 font-medium">{t.emptyTitle}</p>
              <p className="text-sm text-slate-400 mt-1">{t.emptySub}</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{t.colTicker}</th>
                    <th className="text-right px-4 py-3 font-medium">{t.colSpot}</th>
                    <th className="text-right px-4 py-3 font-medium">{t.colStrike}</th>
                    <th className="text-right px-4 py-3 font-medium">{t.colExpiry}</th>
                    <th className="text-right px-4 py-3 font-medium">{t.colIvRank}</th>
                    <th className="text-right px-4 py-3 font-medium">{t.colPremium}</th>
                    <th className="text-right px-4 py-3 font-medium">{t.colProbProfit}</th>
                    <th className="text-right px-4 py-3 font-medium">{t.colBreakeven}</th>
                    <th className="text-right px-4 py-3 font-medium">{t.colProbITM}</th>
                    <th className="text-right px-4 py-3 font-medium">{t.colTheta}</th>
                    <th className="text-right px-4 py-3 font-medium">{t.colScore}</th>
                    <th className="text-center px-4 py-3 font-medium">{t.colAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((r) => (
                    <tr key={r.ticker} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{r.ticker}</div>
                        <div className="text-xs text-slate-400">{r.name}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.spot)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.strike)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.expiryDays}d</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="text-amber-600 font-medium">{fmt(r.ivRank, 0)}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-medium">
                        ${fmt(r.premium)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-indigo-600 font-medium">{fmt(r.probProfit * 100, 1)}%</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">{fmt(r.breakeven)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(r.probITM * 100, 1)}%</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">{fmt(r.theta, 3)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">{fmt(r.score, 0)}</span>
                          <span className="text-xs text-slate-400">{r.riskLevel}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
                          aria-label={`${t.actionSell} ${r.ticker}`}
                        >
                          {t.actionSell}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-400">{excluded}</p>

          <section className="mt-12">
            <h2 className="text-lg font-semibold text-slate-800">{t.howTitle}</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-600 list-decimal list-inside">
              <li>{t.how1}</li>
              <li>{t.how2}</li>
              <li>{t.how3}</li>
            </ol>
          </section>

          <section className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-base font-semibold text-amber-800">{t.riskTitle}</h2>
            <ul className="mt-3 space-y-2 text-sm text-amber-900/80 list-disc list-inside">
              <li>{t.risk1}</li>
              <li>{t.risk2}</li>
              <li>{t.risk3}</li>
            </ul>
          </section>

          <p className="mt-8 text-xs text-slate-400 leading-relaxed max-w-3xl">
            {t.disclaimer}
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

