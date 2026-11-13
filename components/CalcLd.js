"use client";

// components/CalcLd.js — 给单个计算器页注入 SoftwareApplication JSON-LD。
// 元数据来自 TOOLS（单一事实源），自渲染 <Head>，放置位置无关；
// 找不到对应工具则返回 null（安全降级，不报错、不注入脏数据）。
import Head from "next/head";
import { getToolBySlug } from "../lib/toolsIndex.js";
import { softwareLd } from "../lib/jsonLd.js";

export default function CalcLd({ slug }) {
  const tool = getToolBySlug(slug);
  if (!tool) return null;
  const ld = softwareLd({
    id: tool.id || slug,
    icon: tool.icon || "🧮",
    title: tool.title,
    titleEn: tool.titleEn,
    desc: tool.desc,
    descEn: tool.descEn,
    href: tool.href,
    category: tool.category || "tool",
  });
  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
    </Head>
  );
}
