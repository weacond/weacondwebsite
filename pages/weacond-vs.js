"use client";

// pages/weacond-vs.js — 能力对比 / 定位页（GEO 可发现性）
//
// 把 Weacond 与其他金融工具（Investopedia 百科、Finance Toolkit 计算器套件、在线计算器/电子表格）
// 做能力对比 + "何时用谁"指南，目标是：
//   1) 承接 "weacond vs / 替代品 / best financial calculator" 等搜索流量；
//   2) 强化定位 —— 确定性 + 双语 + 教育 + 可被 AI 调用 + 本地隐私 + 双运行时。
//
// 反幻觉 / 反误导原则（关键）：
//   - 竞品描述力求客观，只陈述"该类别通常如何"，不下"X 一定没有 Y"的硬断言；
//   - 用 ✓ / ~ / — 三档 + 图例明确" — = 该类工具通常不提供或未公开，以官网为准，非贬低"；
//   - 全程标注"Weacond 视角、仅供参考、非投资建议"。
//
// 结构化数据：WebApplication + FAQPage + BreadcrumbList（单一事实源 lib/jsonLd）。
// SSR 进初始 HTML 利于收录；双语经 useLanguage 切换（zh/en 共享同一套数据，零翻译漂移）。

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import FaqSection from "../components/FaqSection";
import { webApplicationLd, faqLd, breadcrumbLd, toScript } from "../lib/jsonLd.js";

export const metadata = {
  title: "Weacond vs 其他金融工具 — 何时选谁",
  description:
    "Weacond 与 Investopedia、Finance Toolkit、在线计算器/电子表格的能力对比 + 何时用谁：确定性可复现、双语同源、教育一体、可被 AI 助手经 MCP 调用、本地隐私 AI、双运行时。仅供参考，非投资建议。",
  robots: { index: true, follow: true },
};

// 对比矩阵列（工具）——竞品名用其通用名，不评价。
const COLUMNS = [
  { key: "weacond", zh: "Weacond", en: "Weacond" },
  { key: "investopedia", zh: "Investopedia", en: "Investopedia" },
  { key: "toolkit", zh: "Finance Toolkit", en: "Finance Toolkit" },
  { key: "generic", zh: "在线计算器 / 电子表格", en: "Online calc / sheet" },
];

// 对比矩阵行（能力维度）——每格 { mark, zh, en }；mark ∈ ✓ | ~ | —。
const MATRIX = [
  {
    dim: "形态 / 定位",
    dimEn: "Form / focus",
    cells: {
      weacond: { mark: "✓", zh: "确定性计算 + 教学 + AI 可调用", en: "Deterministic calc + education + AI-callable" },
      investopedia: { mark: "~", zh: "金融百科 + 基础计算器", en: "Encyclopedia + basic calculators" },
      toolkit: { mark: "~", zh: "金融计算器套件", en: "Finance calculator suite" },
      generic: { mark: "~", zh: "单点计算 / 记账", en: "One-off calc / bookkeeping" },
    },
  },
  {
    dim: "确定性 · 可复现",
    dimEn: "Deterministic · reproducible",
    cells: {
      weacond: { mark: "✓", zh: "纯函数 + 全量单测，结果可复现可审计", en: "Pure functions + full unit tests; reproducible, auditable" },
      investopedia: { mark: "~", zh: "计算器确定，非 API", en: "Deterministic calculators, not an API" },
      toolkit: { mark: "~", zh: "浏览器计算，依实现而定", en: "Browser calc, impl-dependent" },
      generic: { mark: "✓", zh: "公式确定", en: "Formula-based" },
    },
  },
  {
    dim: "双语 zh / en",
    dimEn: "Bilingual zh / en",
    cells: {
      weacond: { mark: "✓", zh: "同源双语，一套引擎零漂移", en: "One engine, both languages, zero drift" },
      investopedia: { mark: "~", zh: "部分多语", en: "Some multilingual" },
      toolkit: { mark: "—", zh: "通常以英文为主", en: "Usually English" },
      generic: { mark: "—", zh: "多为单语", en: "Often single-language" },
    },
  },
  {
    dim: "教育深度",
    dimEn: "Educational depth",
    cells: {
      weacond: { mark: "✓", zh: "术语库 + 公式 + 概念交叉链接", en: "Glossary + formulas + concept links" },
      investopedia: { mark: "✓", zh: "百科级词条", en: "Encyclopedic entries" },
      toolkit: { mark: "—", zh: "以工具为主", en: "Tool-first" },
      generic: { mark: "—", zh: "以结果为主", en: "Result-first" },
    },
  },
  {
    dim: "AI 可调用 (MCP / API)",
    dimEn: "AI-callable (MCP / API)",
    cells: {
      weacond: { mark: "✓", zh: "/api/mcp 暴露 59 个工具", en: "/api/mcp exposes 59 tools" },
      investopedia: { mark: "—", zh: "内容站，非工具端点", en: "Content site, not a tool endpoint" },
      toolkit: { mark: "—", zh: "通常无公开 API", en: "Usually no public API" },
      generic: { mark: "—", zh: "无", en: "No" },
    },
  },
  {
    dim: "隐私 · 本地 AI",
    dimEn: "Privacy · local AI",
    cells: {
      weacond: { mark: "✓", zh: "WebGPU 本地推理，数据不出设备", en: "WebGPU local inference; data stays on device" },
      investopedia: { mark: "—", zh: "云端内容", en: "Cloud content" },
      toolkit: { mark: "—", zh: "视实现", en: "Depends" },
      generic: { mark: "—", zh: "多为云端", en: "Mostly cloud" },
    },
  },
  {
    dim: "双运行时",
    dimEn: "Cross-runtime",
    cells: {
      weacond: { mark: "✓", zh: "Vercel + Cloudflare Edge", en: "Vercel + Cloudflare Edge" },
      investopedia: { mark: "—", zh: "不适用", en: "N/A" },
      toolkit: { mark: "—", zh: "不适用", en: "N/A" },
      generic: { mark: "—", zh: "不适用", en: "N/A" },
    },
  },
  {
    dim: "免费 · 无需登录",
    dimEn: "Free · no signup",
    cells: {
      weacond: { mark: "✓", zh: "计算器免费开放", en: "Calculators free + open" },
      investopedia: { mark: "✓", zh: "内容免费", en: "Content free" },
      toolkit: { mark: "~", zh: "部分功能付费", en: "Some features paid" },
      generic: { mark: "~", zh: "视产品", en: "Varies" },
    },
  },
];

// "何时用谁"指南——按场景，不贬低任何工具。
const WHEN = [
  {
    icon: "📚",
    zh: "查概念 / 学定义 / 找百科",
    en: "Look up concepts / definitions",
    pick: "Investopedia / 金融百科",
    pickEn: "Investopedia / encyclopedias",
  },
  {
    icon: "🧮",
    zh: "单点一次性计算 / 记账",
    en: "One-off calculation / bookkeeping",
    pick: "任意在线计算器 / 电子表格",
    pickEn: "Any online calculator / spreadsheet",
  },
  {
    icon: "🤖",
    zh: "要可复现 + 可教学 + 可被 AI 助手调用 + 双语",
    en: "Reproducible + educational + AI-callable + bilingual",
    pick: "Weacond（/api/mcp + 双语 + 术语库）",
    pickEn: "Weacond (/api/mcp + bilingual + glossary)",
  },
  {
    icon: "📈",
    zh: "策略回测 / 多策略对比",
    en: "Strategy backtest / multi-strategy compare",
    pick: "Weacond /backtest · /compare",
    pickEn: "Weacond /backtest · /compare",
  },
];
// "为什么选 Weacond"——全部基于站点真实能力，不夸大。
const WHY = [
  {
    zh: "确定性 · 可测试",
    en: "Deterministic · testable",
    zhDesc: "纯函数 + 全量单测，结果可复现、可审计",
    enDesc: "Pure functions + full unit tests; reproducible and auditable",
  },
  {
    zh: "双语同源",
    en: "Bilingual, one engine",
    zhDesc: "中文 / English 共享同一套引擎，零翻译漂移",
    enDesc: "Chinese / English share one engine — zero translation drift",
  },
  {
    zh: "教育一体",
    en: "Education built in",
    zhDesc: "每个计算器都链接术语库、公式与相关概念",
    enDesc: "Every calculator links to the glossary, formulas, and related concepts",
  },
  {
    zh: "AI 可调用",
    en: "AI-callable",
    zhDesc: "59 个计算器经 /api/mcp 暴露为 MCP 工具",
    enDesc: "59 calculators exposed as MCP tools via /api/mcp",
  },
  {
    zh: "隐私优先",
    en: "Privacy-first",
    zhDesc: "本地 WebGPU AI，交易数据不出设备",
    enDesc: "Local WebGPU AI; trading data never leaves your device",
  },
  {
    zh: "双运行时",
    en: "Cross-runtime",
    zhDesc: "Vercel + Cloudflare Edge，零外部依赖",
    enDesc: "Vercel + Cloudflare Edge, zero external dependencies",
  },
];

// 标记配色（语言中性）：✓ 绿、~ 琥珀、— 灰。
function markColor(mark) {
  if (mark === "✓") return "#059669";
  if (mark === "~") return "#d97706";
  return "#94a3b8";
}

// 本页 JSON-LD：WebApplication + FAQ + 面包屑（不编造评分/评论数）。
function compareLd(faqs) {
  const web = webApplicationLd();
  const bread = breadcrumbLd([
    { name: "Weacond", href: "/" },
    { name: "Weacond vs", href: "/weacond-vs" },
  ]);
  return toScript([web, faqLd(faqs), bread]);
}

const zh = {
  title: "Weacond vs 其他金融工具 — 何时选谁",
  subtitle:
    "Weacond 与 Investopedia、Finance Toolkit、在线计算器/电子表格的能力对比 + 场景指南。定位：确定性 · 双语 · 教育 · 可被 AI 调用 · 本地隐私 · 双运行时。",
  whatTitle: "Weacond 是什么",
  what: "Weacond 是一层双语、确定性、可被 AI 调用的金融计算：把 59 个量化计算器（Kelly、ATR 止损、破产概率、风险预算、回撤规模、杠杆/强平、滑点、止盈、追踪止损、外汇点值/交叉汇率、再平衡、组合 beta、NPV 等）做成纯函数 + 全量单测，并链接术语库与相关概念；同一套引擎同时供人（网页）与 AI 助手（/api/mcp MCP 工具）使用。",
  matrixTitle: "能力对比",
  matrixHint: "按能力维度横向对比；标记为 ✓ 提供 / ~ 部分或视情况 / — 该类工具通常不提供或未公开。",
  dimCol: "能力维度",
  legend:
    "图例：✓ = 提供该能力；~ = 部分 / 视情况；— = 该类工具通常不提供或未公开。竞品描述为 Weacond 视角，力求客观但可能不完整或随时间变化，请以各产品官网为准；非贬低、非投资建议。",
  whenTitle: "何时用谁",
  whenHint: "按场景选择最合适的工具——不同工具解决不同问题。",
  pickLabel: "推荐",
  pickLabelEn: "Best fit",
  whyTitle: "为什么是 Weacond",
  whyHint: "全部基于站点真实能力，不夸大。",
  faqTitle: "常见问题",
  seeMcp: "查看 MCP 端点 →",
  seeGlossary: "浏览术语库 →",
  seeCalculators: "浏览全部计算器 →",
  relatedTitle: "相关页面",
  disclaimer:
    "本对比为 Weacond 视角，旨在帮助用户选择工具；竞品描述力求客观，可能不完整，请以各产品官网为准。本页及 Weacond 全部内容、计算结果仅供教育与研究用途，不构成投资、财务或法律建议，亦不代表对任何资产做出买卖推荐。历史结果不代表未来表现。",
  faqs: [
    {
      q: "Weacond 和 Investopedia 有什么区别？",
      a: "Investopedia 以金融百科与参考见长，适合查概念/定义；Weacond 在确定性计算（纯函数 + 全量单测、可复现可审计）、双语同源、以及可被 AI 助手经 /api/mcp 调用上更强。两者可互补：用 Investopedia 学概念，用 Weacond 做可复现的量化计算。",
    },
    {
      q: "Weacond 和 Finance Toolkit 有什么区别？",
      a: "Finance Toolkit 是一组金融计算器；Weacond 同样提供计算器，并额外提供：双语同源、术语库/教学、本地隐私 AI，以及把计算器暴露为 AI 可调用 MCP 工具（/api/mcp）。",
    },
    {
      q: "Weacond 适合谁？",
      a: "想要可复现、可教学、可被 AI 助手调用的双语金融计算的零售投资者与量化/开发人士；以及希望把金融计算接入 AI 工作流的团队。",
    },
    {
      q: "Weacond 的 MCP 端点是什么？",
      a: "/api/mcp 把 59 个计算器暴露为 MCP 工具，经无状态 JSON-RPC 2.0 over HTTP（Vercel + Cloudflare Edge 双运行时），AI 助手可直接调用。详见 /mcp。",
    },
    {
      q: "这个对比是投资建议吗？",
      a: "不是。本对比仅为帮助用户选择工具的参考，竞品描述力求客观但可能不完整，请以各产品官网为准。所有计算与内容仅供教育与研究用途，非投资建议。",
    },
  ],
};
const en = {
  title: "Weacond vs other finance tools — when to use what",
  subtitle:
    "Capability comparison + use-case guide: Weacond vs Investopedia, Finance Toolkit, and online calculators/spreadsheets. Positioning: deterministic · bilingual · educational · AI-callable · private · cross-runtime.",
  whatTitle: "What is Weacond",
  what:
    "Weacond is a bilingual, deterministic, AI-callable layer of financial calculation: 59 quant calculators (Kelly, ATR stop, risk of ruin, risk budget, drawdown sizing, leverage/liquidation, slippage, take-profit, trailing stop, FX pip/cross-rate, rebalancing, portfolio beta, NPV, and more) as pure functions with full unit tests, each linked to a glossary and related concepts. The same engine serves both people (web pages) and AI assistants (/api/mcp MCP tools).",
  matrixTitle: "Capability comparison",
  matrixHint:
    "Compared by capability dimension. Marks: ✓ provided / ~ partial or depends / — not typical for this category or not public.",
  dimCol: "Capability",
  legend:
    "Legend: ✓ = provides it; ~ = partial or depends; — = not typical for this category or not public. Competitor notes are Weacond's view, made to be objective but possibly incomplete or time-varying — verify with each product's official site. Not disparaging, not investment advice.",
  whenTitle: "When to use what",
  whenHint: "Pick the right tool per scenario — different tools solve different problems.",
  pickLabel: "推荐",
  pickLabelEn: "Best fit",
  whyTitle: "Why Weacond",
  whyHint: "All grounded in real, verifiable capabilities — no exaggeration.",
  faqTitle: "FAQ",
  seeMcp: "See the MCP endpoint →",
  seeGlossary: "Browse the glossary →",
  seeCalculators: "Browse all calculators →",
  relatedTitle: "Related pages",
  disclaimer:
    "This comparison is Weacond's view, meant to help you choose a tool; competitor notes are made to be objective but may be incomplete — verify with each product's official site. This page and all Weacond content and calculation results are for educational and research purposes only, and do not constitute investment, financial, or legal advice, nor a recommendation to buy or sell any asset. Past results do not guarantee future performance.",
  faqs: [
    {
      q: "How is Weacond different from Investopedia?",
      a: "Investopedia excels as a financial encyclopedia and is great for looking up concepts/definitions; Weacond is stronger on deterministic calculation (pure functions + full unit tests, reproducible and auditable), bilingual-in-one-engine, and being AI-callable via /api/mcp. They complement each other: learn concepts on Investopedia, run reproducible quant math on Weacond.",
    },
    {
      q: "How is Weacond different from Finance Toolkit?",
      a: "Finance Toolkit is a set of finance calculators; Weacond offers calculators too, and additionally provides bilingual-in-one-engine, a glossary/education layer, local private AI, and calculators exposed as AI-callable MCP tools (/api/mcp).",
    },
    {
      q: "Who is Weacond for?",
      a: "Retail investors and quant/developers who want reproducible, educational, AI-callable, bilingual financial calculation; and teams that want to plug financial math into AI workflows.",
    },
    {
      q: "What is Weacond's MCP endpoint?",
      a: "/api/mcp exposes 59 calculators as MCP tools over stateless JSON-RPC 2.0 on HTTP (dual-runtime on Vercel + Cloudflare Edge); AI assistants can call them directly. See /mcp.",
    },
    {
      q: "Is this comparison investment advice?",
      a: "No. It is only a reference to help you choose a tool; competitor notes are made to be objective but may be incomplete — verify with each product's official site. All calculations and content are for educational and research purposes only, not investment advice.",
    },
  ],
};
export default function WeacondVsPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const isEn = lang === "en";
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: compareLd(L.faqs) }}
        />
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          {/* 是什么 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">{L.whatTitle}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{L.what}</p>
          </div>

          {/* 能力对比矩阵 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">{L.matrixTitle}</h2>
            <p className="text-xs text-slate-400 mb-3">{L.matrixHint}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 pr-3 font-medium text-slate-400">{L.dimCol}</th>
                    {COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        className="text-left py-2 px-3 font-semibold text-slate-600 whitespace-nowrap"
                      >
                        {isEn ? c.en : c.zh}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row) => (
                    <tr key={row.dim} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-3 font-medium text-slate-700 whitespace-nowrap">
                        {isEn ? row.dimEn : row.dim}
                      </td>
                      {COLUMNS.map((c) => {
                        const cell = row.cells[c.key] || { mark: "—", zh: "", en: "" };
                        return (
                          <td key={c.key} className="py-2 px-3 text-slate-500">
                            <span
                              className="mr-1 font-bold"
                              style={{ color: markColor(cell.mark) }}
                              aria-label={cell.mark}
                            >
                              {cell.mark}
                            </span>
                            <span>{isEn ? cell.en : cell.zh}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{L.legend}</p>
          </div>

          {/* 何时用谁 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">{L.whenTitle}</h2>
            <p className="text-xs text-slate-400 mb-3">{L.whenHint}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {WHEN.map((w, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none">{w.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-700">
                        {isEn ? w.en : w.zh}
                      </div>
                      <div className="text-xs text-indigo-600 mt-1">
                        {isEn ? L.pickLabelEn : L.pickLabel}：{isEn ? w.pickEn : w.pick}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* 为什么选 Weacond */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">{L.whyTitle}</h2>
            <p className="text-xs text-slate-400 mb-3">{L.whyHint}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {WHY.map((w, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm font-semibold text-slate-700 mb-1">
                    {isEn ? w.en : w.zh}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {isEn ? w.enDesc : w.zhDesc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <FaqSection faqs={L.faqs} title={L.faqTitle} />

          {/* 相关 + 免责 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">{L.relatedTitle}</h2>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <Link href="/mcp" className="text-indigo-600 hover:text-indigo-800">
                {L.seeMcp}
              </Link>
              <Link href="/glossary" className="text-indigo-600 hover:text-indigo-800">
                {L.seeGlossary}
              </Link>
              <Link href="/calculators" className="text-indigo-600 hover:text-indigo-800">
                {L.seeCalculators}
              </Link>
            </div>
            <p className="text-[10px] text-amber-300/80 leading-relaxed mt-3">{L.disclaimer}</p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
