"use client";

// pages/mcp.js — Weacond MCP 端点公开文档页（GEO 可发现性）
// 把 /api/mcp 端点与它暴露的工具写进可被 AI 爬虫/搜索收录的 HTML，
// 并配 SoftwareApplication + FAQPage JSON-LD。SSR 渲染工具清单（进初始 HTML，
// 利于收录），调用示例带复制按钮（客户端）。

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../contexts/LanguageContext";
import Head from "next/head";
import Link from "next/link";
import FaqSection from "../components/FaqSection";
import { listToolDefs } from "../lib/mcp/tools.js";
import { webApplicationLd, faqLd, breadcrumbLd, toScript } from "../lib/jsonLd.js";

export const metadata = {
  title: "Weacond MCP 端点 — 给 AI 搜索/助手调用的金融计算器",
  description:
    "Weacond 把 12 个金融风控计算器（Kelly、ATR 止损、破产概率、风险预算、回撤规模、杠杆、期望、含费平衡价、R-multiple、保证金、资金费率、NPV）暴露为 MCP 工具，经无状态 JSON-RPC 2.0 over HTTP，Vercel 与 Cloudflare Edge 双运行时。",
  robots: { index: true, follow: true },
};

// 端点常量（单一事实源，与 pages/api/mcp.js 对应）。
const ENDPOINT = "https://weacond.com/api/mcp";
const PROTOCOL = "Model Context Protocol · JSON-RPC 2.0 over HTTP（无状态）";

// 调用示例（JSON-RPC 2.0）。
const EXAMPLES = {
  initialize:
    'POST /api/mcp\n{\n  "jsonrpc": "2.0",\n  "id": 1,\n  "method": "initialize",\n  "params": {}\n}',
  list: 'POST /api/mcp\n{\n  "jsonrpc": "2.0",\n  "id": 2,\n  "method": "tools/list"\n}',
  call:
    'POST /api/mcp\n{\n  "jsonrpc": "2.0",\n  "id": 3,\n  "method": "tools/call",\n  "params": {\n    "name": "kelly",\n    "arguments": { "winRate": 0.55, "odds": 1 }\n  }\n}',
};

// 环境变量文档。
const ENV_VARS = [
  {
    key: "MCP_API_KEY",
    def: "未设置",
    zh: "鉴权密钥；未设置则端点开放（便于 GEO 收录）。设置后请求需带 Authorization: Bearer 或 x-api-key。",
    en: "Auth key; open when unset (good for GEO). When set, requests need Authorization: Bearer or x-api-key.",
  },
  {
    key: "MCP_RATE_LIMIT_PER_MIN",
    def: "60",
    zh: "每 IP 每分钟请求上限（令牌桶，无状态运行时按实例降级）。",
    en: "Per-IP requests per minute (token bucket; degrades per-instance on stateless runtimes).",
  },
  {
    key: "MCP_PROTOCOL_VERSION",
    def: "2026-03-26",
    zh: "协商的 MCP 协议版本；缺省用内置默认，可覆盖。",
    en: "Negotiated MCP protocol version; defaults to the built-in, overridable.",
  },
];

const zh = {
  title: "Weacond MCP 端点",
  subtitle:
    "把 Weacond 的金融计算器暴露为 AI 搜索/助手可调用工具。无状态 JSON-RPC 2.0 over HTTP，Vercel + Cloudflare Edge 双运行时，零外部依赖。",
  endpointTitle: "端点",
  protocolLabel: "协议",
  runtimesLabel: "运行时",
  authLabel: "鉴权",
  toolsTitle: "暴露的工具",
  toolsHint: "共 {n} 个高风险意图计算器，每个带 JSON Schema 入参校验。",
  examplesTitle: "调用示例",
  examplesHint: "三个最常见请求，点「复制」即用。",
  envTitle: "环境变量",
  envHint: "在部署平台 env 里配置；端点绝不向客户端回传密钥。",
  faqTitle: "常见问题",
  copyLabel: "复制",
  copiedLabel: "已复制",
  faqs: [
    {
      q: "什么是 MCP？",
      a: "Model Context Protocol（MCP）是让 AI 助手/搜索调用外部工具与数据的开放协议；Weacond 的 /api/mcp 把金融计算器暴露为 MCP 工具，AI 可直接调用做量化计算。",
    },
    {
      q: "这个端点暴露哪些工具？",
      a: "12 个高风险意图计算器：Kelly 仓位、ATR 止损、破产概率、风险预算、回撤规模、杠杆/强平、交易期望/盈亏因子、含费盈亏平衡价、R-multiple 头寸、杠杆融资成本、永续资金费率、净现值 NPV。",
    },
    {
      q: "如何鉴权与限流？",
      a: "默认开放以便 GEO 收录；设置 MCP_API_KEY 后需带 Bearer/x-api-key，设置 MCP_RATE_LIMIT_PER_MIN 做每 IP 限流。密钥永不下发到客户端。",
    },
    {
      q: "它运行在哪里？",
      a: "纯函数 + 无状态 HTTP，Vercel 与 Cloudflare Edge 双运行时皆可；遵循 2026 状态化 MCP 规范（无 session 握手，每请求自带协议版本）。",
    },
    {
      q: "如何调用？",
      a: "向 /api/mcp 发 JSON-RPC 2.0 POST：initialize 取服务器信息，tools/list 列工具，tools/call 带 name 与 arguments 调用具体计算器。",
    },
  ],
};

const en = {
  title: "Weacond MCP Endpoint",
  subtitle:
    "Expose Weacond's financial calculators as MCP tools callable by AI search/agents. Stateless JSON-RPC 2.0 over HTTP, dual-runtime on Vercel + Cloudflare Edge, zero deps.",
  endpointTitle: "Endpoint",
  protocolLabel: "Protocol",
  runtimesLabel: "Runtimes",
  authLabel: "Auth",
  toolsTitle: "Exposed tools",
  toolsHint: "{n} high-intent calculators, each with JSON Schema input validation.",
  examplesTitle: "Call examples",
  examplesHint: "Three common requests — click copy to use.",
  envTitle: "Environment variables",
  envHint: "Configure in your deploy platform's env; the endpoint never leaks keys to the client.",
  faqTitle: "FAQ",
  copyLabel: "Copy",
  copiedLabel: "Copied",
  faqs: [
    {
      q: "What is MCP?",
      a: "Model Context Protocol (MCP) is an open protocol that lets AI assistants/search call external tools and data; Weacond's /api/mcp exposes financial calculators as MCP tools AI can call for quantitative math.",
    },
    {
      q: "Which tools does the endpoint expose?",
      a: "12 high-intent calculators: Kelly sizing, ATR stop, risk of ruin, risk budget, drawdown sizing, leverage/liquidation, expectancy/profit factor, fee-adjusted breakeven, R-multiple sizing, margin financing cost, perpetual funding rate, and NPV.",
    },
    {
      q: "How is it authenticated and rate-limited?",
      a: "Open by default for GEO crawlability; set MCP_API_KEY to require Bearer/x-api-key, and MCP_RATE_LIMIT_PER_MIN for per-IP throttling. Keys are never sent to the client.",
    },
    {
      q: "Where does it run?",
      a: "Pure functions over stateless HTTP, dual-runtime on Vercel and Cloudflare Edge; follows the 2026 stateless MCP spec (no session handshake, each request carries the protocol version).",
    },
    {
      q: "How do I call it?",
      a: "POST JSON-RPC 2.0 to /api/mcp: initialize for server info, tools/list for the catalog, tools/call with a name and arguments to run a specific calculator.",
    },
  ],
};

// 端点 JSON-LD：合并 WebApp + SoftwareApplication(API) + FAQ + 面包屑。
function endpointLd(faqs) {
  const web = webApplicationLd();
  const api = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Weacond MCP Endpoint",
    url: ENDPOINT,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Vercel, Cloudflare Edge (stateless HTTP)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Stateless JSON-RPC 2.0 MCP endpoint exposing 12 financial risk calculators as AI-callable tools (Kelly, ATR stop, risk of ruin, risk budget, drawdown sizing, leverage, expectancy, breakeven, R-multiple, margin, funding rate, NPV).",
  };
  const bread = breadcrumbLd([
    { name: "Weacond", href: "/" },
    { name: "MCP 端点", href: "/mcp" },
  ]);
  return toScript([web, api, faqLd(faqs), bread]);
}

export default function McpPage() {
  const { lang } = useLanguage();
  const L = lang === "en" ? en : zh;
  const tools = listToolDefs();
  const [copied, setCopied] = useState("");
  const copy = (key, text) => {
    try {
      navigator.clipboard.writeText(text);
    } catch (e) {
      /* 隐私模式等：忽略复制失败 */
    }
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };
  const exampleKeys = [
    ["initialize", EXAMPLES.initialize],
    ["tools/list", EXAMPLES.list],
    ["tools/call · kelly", EXAMPLES.call],
  ];
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Head>
        <title>{L.title}</title>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: endpointLd(L.faqs) }}
        />
      </Head>
      <Navbar />
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{L.title}</h1>
          <p className="text-slate-500 mb-6">{L.subtitle}</p>

          {/* 端点卡片 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{L.endpointTitle}</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">URL</span>{" "}
                <code className="font-mono text-indigo-600">{ENDPOINT}</code>
              </div>
              <div>
                <span className="text-slate-400">{L.protocolLabel}</span>{" "}
                <span>{PROTOCOL}</span>
              </div>
              <div>
                <span className="text-slate-400">{L.runtimesLabel}</span>{" "}
                <span>Vercel + Cloudflare Edge</span>
              </div>
              <div>
                <span className="text-slate-400">{L.authLabel}</span>{" "}
                <span>
                  {lang === "en"
                    ? "Open by default (set MCP_API_KEY to lock)"
                    : "默认开放（设 MCP_API_KEY 锁定）"}
                </span>
              </div>
            </div>
          </div>

          {/* 工具清单（SSR 进初始 HTML，利于收录） */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">{L.toolsTitle}</h2>
            <p className="text-xs text-slate-400 mb-3">
              {L.toolsHint.replace("{n}", String(tools.length))}
            </p>
            <ul className="space-y-3">
              {tools.map((t) => (
                <li
                  key={t.name}
                  className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-semibold text-indigo-600">
                      {t.name}
                    </code>
                    <span className="text-xs text-slate-400">{t.title}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-300">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.description}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(t.inputSchema.properties || {}).map(([k, v]) => (
                      <code
                        key={k}
                        className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                      >
                        {k}
                        {t.inputSchema.required && t.inputSchema.required.includes(k)
                          ? "*"
                          : ""}
                        <span className="text-slate-300">:{v.type}</span>
                      </code>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-slate-300 mt-2">
              * = {lang === "en" ? "required" : "必填"}
            </p>
          </div>

          {/* 调用示例 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">{L.examplesTitle}</h2>
            <p className="text-xs text-slate-400 mb-3">{L.examplesHint}</p>
            <div className="space-y-3">
              {exampleKeys.map(([label, text]) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-xs font-mono text-slate-500">{label}</code>
                    <button
                      onClick={() => copy(label, text)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      {copied === label ? L.copiedLabel : L.copyLabel}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto">
                    <code>{text}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>

          {/* 环境变量 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">{L.envTitle}</h2>
            <p className="text-xs text-slate-400 mb-3">{L.envHint}</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="py-1 font-medium">{lang === "en" ? "Variable" : "变量"}</th>
                  <th className="py-1 font-medium">{lang === "en" ? "Default" : "默认"}</th>
                  <th className="py-1 font-medium">{lang === "en" ? "Notes" : "说明"}</th>
                </tr>
              </thead>
              <tbody>
                {ENV_VARS.map((v) => (
                  <tr key={v.key} className="border-t border-slate-100 align-top">
                    <td className="py-2 pr-2">
                      <code className="font-mono text-xs text-indigo-600">{v.key}</code>
                    </td>
                    <td className="py-2 pr-2 text-xs text-slate-500">{v.def}</td>
                    <td className="py-2 text-xs text-slate-500">
                      {lang === "en" ? v.en : v.zh}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <FaqSection faqs={L.faqs} title={L.faqTitle} />
          <p className="text-xs text-slate-300 mt-6">
            <Link href="/calculators" className="hover:text-slate-500">
              {lang === "en" ? "Browse all calculators →" : "浏览全部计算器 →"}
            </Link>
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
