// lib/search.js — 全站搜索（纯函数、可单元测试）
//
// 把工具目录 (toolsIndex.TOOLS) 与概念词典 (glossary.GLOSSARY) 合并为
// 一个统一可搜索索引，按关键字（标题/描述/术语）做大小写不敏感子串匹配。
// 供 /search 页在客户端实时过滤，未来接入搜索框时复用同一逻辑。
//
// 口径：lang 决定匹配 zh/en 字段；空查询 → 空数组；结果按出现顺序截断。

import { TOOLS } from "./toolsIndex.js";
import { GLOSSARY } from "./glossary.js";

/**
 * 构建统一索引：工具 + 词典术语，统一字段。
 * @returns {Array<{ type:string, id:string, title, titleEn, desc, descEn, href:string, icon:string }>}
 */
export function buildIndex() {
  const tools = TOOLS.map((t) => ({
    type: "tool",
    id: t.id,
    title: t.title,
    titleEn: t.titleEn,
    desc: t.desc,
    descEn: t.descEn,
    href: t.href,
    icon: t.icon,
  }));
  const terms = GLOSSARY.map((g) => ({
    type: "term",
    id: g.id,
    title: g.term,
    titleEn: g.termEn,
    desc: g.def,
    descEn: g.defEn,
    href: g.related || "/glossary",
    icon: "📖",
  }));
  return [...tools, ...terms];
}

/**
 * 在索引中按关键字过滤（大小写不敏感子串匹配，匹配标题/描述）。
 * @param {string} query
 * @param {"zh"|"en"} [lang="zh"] 决定匹配中/英文字段
 * @param {number} [limit=12] 结果上限
 * @returns {Array} 匹配项；空查询 → []
 */
export function search(query, lang = "zh", limit = 12) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const idx = buildIndex();
  const out = [];
  for (const item of idx) {
    const fields = lang === "en" ? [item.titleEn, item.descEn] : [item.title, item.desc];
    const hit = fields.some((f) => f && f.toLowerCase().includes(q));
    if (hit) out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * 索引规模（用于测试与展示）。
 * @returns {{ tools:number, terms:number, total:number }}
 */
export function indexStats() {
  const idx = buildIndex();
  const tools = idx.filter((i) => i.type === "tool").length;
  return { tools, terms: idx.length - tools, total: idx.length };
}
