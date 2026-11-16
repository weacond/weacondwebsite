// lib/crossLinks.js — 计算器 ↔ 概念/词典 ↔ MCP 工具 ↔ 对比 的交叉链接引擎
//
// 单一事实源：给定一个计算器 slug，返回它的「相关概念 / 可被 AI agent 调用的 MCP 工具 /
// 可对比兄弟计算器」。纯函数、确定性、轻量（不 import 整个 MCP TOOLS，避免把 51 个计算库
// 拖进每个用本模块的页面 bundle）。MCP 工具名 / 对比兄弟 slug 的存在性由
// tests/crossLinks.test.mjs 反向校验。
//
// 三类交叉链接：
//  1. concepts：词典概念（精确映射 CONCEPT_BY_TOOL ∪ 反向映射：related 含本 href 的词典条目）
//  2. mcp：可被 AI agent 通过 MCP 调用的对应工具（MCP_BY_TOOL，name 与 slug 不一定相同）
//  3. compare：可对比的兄弟计算器（COMPARE_BY_TOOL，slug 必须在注册表存在，否则丢弃）
//
// 设计意图（方向）：同一份确定性计算，同时服务「散户/教育面」（概念 + 对比）与
// 「AI agent 面」（MCP 工具）。无映射时返回全空，调用方据此决定渲染。

import { GLOSSARY, getGlossaryTerm } from "./glossary.js";
import { getToolBySlug } from "./toolsIndex.js";

// 精确映射：计算器 slug → 词典概念 id（高置信；反向映射兜底）
const CONCEPT_BY_TOOL = {
  dcf: ["dcf"],
  dca: ["dca"],
  "purchasing-power": ["purchasingPower"],
  "real-estate": ["realEstate"],
  kelly: ["kelly"],
};

// 唯一手工维护项：页面 slug → 对应 MCP 工具名（MCP 名与 slug 常不一致，如 atr-stop→atr_stop、
// real-estate→realEstate、barrier→two-barrier）。工具的 title/titleEn 直接取自注册表
// （getToolBySlug），不在此重复，避免与注册表脱节。覆盖全部 51 个 MCP 工具；工具名存在性 +
// 接入不变量由 tests/crossLinks.test.mjs 反向校验（每个映射必须有页面且已渲染 <CrossLinks>）。
export const MCP_NAME_BY_SLUG = {
  // risk
  kelly: "kelly",
  "atr-stop": "atr_stop",
  "risk-ruin": "risk_of_ruin",
  "risk-budget": "risk_budget",
  "drawdown-sizing": "drawdown_sizing",
  leverage: "leverage",
  expectancy: "expectancy",
  breakeven: "breakeven",
  "r-multiple": "r_multiple",
  margin: "margin",
  var: "var",
  "two-barrier": "barrier",
  "prob-return": "prob_return",
  // position / execution / crypto
  funding: "funding_rate",
  slippage: "slippage",
  "take-profit": "take_profit",
  "trailing-stop": "trailing_stop",
  "lot-size": "lotSize",
  staking: "staking",
  // investment
  annuity: "annuity",
  ytm: "yield_to_maturity",
  "options-payoff": "option_payoff",
  rebalance: "rebalance",
  "portfolio-beta": "beta",
  "fair-value": "fairValue",
  dcf: "dcf",
  dca: "dca",
  // planning / performance
  fire: "fire",
  twrr: "time_weighted_return",
  "real-after-tax": "real_after_tax",
  "real-return": "real_return",
  "tax-drag": "tax_drag",
  "loan": "loan",
  "goal-solver": "goalSolver",
  "inflation-goal": "inflationGoal",
  "tax-loss": "taxLoss",
  // finance
  npv: "npv",
  ear: "ear",
  continuous: "continuous",
  "levered-etf": "leveredEtf",
  bond: "bond",
  // fx
  "fx-pip": "fx_pip",
  "fx-cross": "fx_cross",
  "interest-parity": "interest_parity",
  // strategy / real
  "average-entry": "avgEntry",
  drip: "drip",
  "purchasing-power": "purchasingPower",
  "real-estate": "realEstate",
  calmar: "calmar",
  sortino: "sortino",
  alpha: "alpha",
};

// 反向：MCP 工具名 → 页面 slug（由 MCP_NAME_BY_SLUG 派生，单一事实源）。
// 供 /mcp 页把每个工具链接回其计算器页，完成「计算器 ↔ MCP 工具」双向闭环。
// 不变量：每个反向 slug 都对应真实页面（tests/crossLinks.test.mjs 校验），故不会悬空。
export const SLUG_BY_MCP_NAME = Object.fromEntries(
  Object.entries(MCP_NAME_BY_SLUG).map(([slug, name]) => [name, slug])
);

// 给定 MCP 工具名，返回其计算器页 href（/slug）；无映射则 null（绝不悬空）。
export function mcpPageHref(name) {
  const slug = SLUG_BY_MCP_NAME[name];
  return slug ? "/" + slug : null;
}

// 计算器 slug → 可对比兄弟（仅高置信项；slug 必须在注册表存在，否则丢弃）
const COMPARE_BY_TOOL = {
  "purchasing-power": [{ slug: "inflation-goal", label: "通胀目标", labelEn: "Inflation Goal" }],
  "real-estate": [{ slug: "dcf", label: "DCF 估值", labelEn: "DCF Valuation" }],
  dca: [{ slug: "npv", label: "NPV 现值", labelEn: "NPV" }],
  calmar: [
    { slug: "risk", label: "风险仪表盘", labelEn: "Risk Dashboard" },
    { slug: "performance", label: "业绩/交易日志", labelEn: "Performance / Journal" },
  ],
  sortino: [
    { slug: "calmar", label: "Calmar 比率", labelEn: "Calmar Ratio" },
    { slug: "risk", label: "风险仪表盘", labelEn: "Risk Dashboard" },
  ],
  alpha: [
    { slug: "calmar", label: "Calmar 比率", labelEn: "Calmar Ratio" },
    { slug: "sortino", label: "Sortino 比率", labelEn: "Sortino Ratio" },
  ],
};

function slugFrom(href) {
  return String(href || "").replace(/^\/+/, "");
}

// 反向映射：哪些词典概念的 related 指向本计算器（related 可为字符串或字符串数组）
function conceptsReferencing(slug) {
  const href = "/" + slug;
  return GLOSSARY.filter((g) => {
    const r = g.related;
    const list = Array.isArray(r) ? r : r ? [r] : [];
    return list.includes(href);
  });
}

// 给定 slug 返回 { concepts, mcp, compare }；无任何映射时返回全空数组。
export function crossLinksFor(slug) {
  const s = slugFrom(slug);

  // 1) concepts：精确映射 ∪ 反向映射，去重；只解析确实存在的概念 id（getGlossaryTerm 未知即抛）
  const ids = new Set([
    ...(CONCEPT_BY_TOOL[s] || []),
    ...conceptsReferencing(s).map((g) => g.id),
  ]);
  const concepts = [...ids]
    .map((id) => {
      try {
        const g = getGlossaryTerm(id);
        return { id: g.id, term: g.term, termEn: g.termEn, href: "/glossary" };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // 2) mcp：对应 MCP 工具；title/titleEn 取自注册表（getToolBySlug 未知返回 null 则回退到名）
  const mcpName = MCP_NAME_BY_SLUG[s];
  const reg = mcpName ? getToolBySlug(s) : null;
  const mcp = mcpName
    ? [
        {
          name: mcpName,
          title: reg ? reg.title : mcpName,
          titleEn: reg ? reg.titleEn : mcpName,
          href: "/mcp",
        },
      ]
    : [];

  // 3) compare：兄弟计算器，仅保留注册表中确实存在的 slug（getToolBySlug 未知返回 null）
  const compare = (COMPARE_BY_TOOL[s] || [])
    .filter((c) => getToolBySlug(c.slug))
    .map((c) => ({
      slug: c.slug,
      href: "/" + c.slug,
      label: c.label,
      labelEn: c.labelEn || c.label,
    }));

  return { concepts, mcp, compare };
}

// 是否有任何交叉链接（供页面决定要不要渲染该区块）
export function hasCrossLinks(slug) {
  const c = crossLinksFor(slug);
  return c.concepts.length + c.mcp.length + c.compare.length > 0;
}