// lib/crossLinks.js — 计算器 ↔ 概念/词典 ↔ MCP 工具 ↔ 对比 的交叉链接引擎
//
// 单一事实源：给定一个计算器 slug，返回它的「相关概念 / 可被 AI agent 调用的 MCP 工具 /
// 可对比兄弟计算器」。纯函数、确定性、轻量（不 import 整个 MCP TOOLS，避免把 48 个计算库
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

// 计算器 slug → 对应 MCP 工具（name 与 slug 不一定同，如 real-estate→realEstate）。
// title=中文，titleEn=英文；存在性由测试反向校验，故引擎不 import MCP 全表（保持轻量）。
const MCP_BY_TOOL = {
  dcf: [{ name: "dcf", title: "DCF 估值", titleEn: "DCF Valuation" }],
  dca: [{ name: "dca", title: "定投 vs 一次性", titleEn: "DCA vs Lump Sum" }],
  "purchasing-power": [{ name: "purchasingPower", title: "购买力 / 通胀", titleEn: "Purchasing Power / Inflation" }],
  "real-estate": [{ name: "realEstate", title: "房地产投资分析", titleEn: "Real Estate Investment" }],
  kelly: [{ name: "kelly", title: "凯利仓位比例", titleEn: "Kelly Criterion" }],
};

// 计算器 slug → 可对比兄弟（仅高置信项；slug 必须在注册表存在，否则丢弃）
const COMPARE_BY_TOOL = {
  "purchasing-power": [{ slug: "inflation-goal", label: "通胀目标", labelEn: "Inflation Goal" }],
  "real-estate": [{ slug: "dcf", label: "DCF 估值", labelEn: "DCF Valuation" }],
  dca: [{ slug: "npv", label: "NPV 现值", labelEn: "NPV" }],
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

  // 2) mcp：对应 MCP 工具（存在性由测试校验，这里直接采用）
  const mcp = (MCP_BY_TOOL[s] || []).map((m) => ({
    name: m.name,
    title: m.title,
    titleEn: m.titleEn || m.title,
    href: "/mcp",
  }));

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