// lib/sitemap.js — 站点地图生成器（纯函数，SSR/Edge 安全，可单元测试）
//
// 单一事实源 = lib/toolsIndex.js 的 TOOLS（67 个计算器）+ 一份核心路由表。
// 生成 sitemap.xml 字符串与 URL 清单，供：
//   1. pages/api/sitemap.js（线上动态生成，随 TOOLS 变化自动更新）
//   2. 构建时写入 public/sitemap.xml（静态兜底，robots.txt 指向它）
// 不依赖任何 Node/浏览器 API；XML 做转义；按 path 去重（核心路由优先）。

import { TOOLS } from "./toolsIndex.js";

// 核心（非计算器）路由，带 priority / changefreq。
export const CORE_ROUTES = [
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/signals", priority: 0.9, changefreq: "daily" },
  { path: "/macro", priority: 0.8, changefreq: "daily" },
  { path: "/pricing", priority: 0.9, changefreq: "weekly" },
  { path: "/ebooks", priority: 0.8, changefreq: "weekly" },
  { path: "/strategies", priority: 0.8, changefreq: "weekly" },
  { path: "/putseller", priority: 0.8, changefreq: "weekly" },
  { path: "/backtest", priority: 0.8, changefreq: "weekly" },
  { path: "/calculators", priority: 0.8, changefreq: "monthly" },
  { path: "/learning", priority: 0.8, changefreq: "monthly" },
  { path: "/options", priority: 0.8, changefreq: "monthly" },
  { path: "/ai", priority: 0.7, changefreq: "weekly" },
  { path: "/dashboard", priority: 0.7, changefreq: "weekly" },
  { path: "/about", priority: 0.5, changefreq: "monthly" },
  { path: "/terms", priority: 0.3, changefreq: "yearly" },
  { path: "/privacy", priority: 0.3, changefreq: "yearly" },
];

// 计算器页由 TOOLS 派生，按 category 给 priority / changefreq。
const CAT_PRIORITY = {
  technical: 0.7, position: 0.7, portfolio: 0.7,
  risk: 0.7, options: 0.7, market: 0.8, invest: 0.7,
};
const CAT_CHANGE = {
  technical: "weekly", position: "monthly", portfolio: "monthly",
  risk: "monthly", options: "monthly", market: "daily", invest: "monthly",
};

// TOOLS → 计算器路由（lastmod 由调用方注入）。
export function calculatorRoutes() {
  return TOOLS.map((t) => ({
    path: t.href,
    priority: CAT_PRIORITY[t.category] ?? 0.7,
    changefreq: CAT_CHANGE[t.category] ?? "monthly",
  }));
}

// 合并核心路由 + 计算器路由，按 path 去重（核心优先）。
export function sitemapRoutes() {
  const seen = new Set();
  const out = [];
  for (const r of [...CORE_ROUTES, ...calculatorRoutes()]) {
    if (!r.path || seen.has(r.path)) continue;
    seen.add(r.path);
    out.push({
      path: r.path,
      priority: Number(r.priority ?? 0.7),
      changefreq: r.changefreq || "monthly",
    });
  }
  return out;
}

// XML 转义（路径/日期安全）。
function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]
  );
}

// 生成 sitemap.xml 字符串。
//   baseUrl: 站点根（如 "https://weacond.com"，可带尾斜杠）
//   routes:  默认 sitemapRoutes()
//   lastmod: 默认今天 YYYY-MM-DD
export function buildSitemapXml(baseUrl, routes = sitemapRoutes(), lastmod) {
  const base = String(baseUrl || "https://weacond.com").replace(/\/+$/, "");
  const lm = lastmod || new Date().toISOString().slice(0, 10);
  const urls = routes
    .map((r) => {
      const loc = r.path === "/" ? base : `${base}${r.path}`;
      const p = Math.max(0, Math.min(1, r.priority ?? 0.7));
      return (
        "  <url>\n" +
        `    <loc>${escapeXml(loc)}</loc>\n` +
        `    <lastmod>${escapeXml(lm)}</lastmod>\n` +
        `    <changefreq>${escapeXml(r.changefreq)}</changefreq>\n` +
        `    <priority>${p.toFixed(1)}</priority>\n` +
        "  </url>"
      );
    })
    .join("\n");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${urls}\n` +
    "</urlset>\n"
  );
}

export default buildSitemapXml;
