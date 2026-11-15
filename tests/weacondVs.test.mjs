// tests/weacondVs.test.mjs — /weacond-vs 能力对比/定位页（GEO 可发现性）回归守卫
//
// 锁住三件事，防未来回退：
//   1) 页面文件存在且含关键结构（双语 + 对比矩阵 + 何时用谁 + FAQ + 结构化数据 + 免责 + 竞品中立）；
//   2) 已接入 sitemap（/weacond-vs 在 sitemapRoutes 中）；
//   3) 页面内链（/mcp /glossary /calculators）都解析到真实页面（防悬空链接）。
// 反幻觉/反误导原则：对比页须保持竞品描述中立（不下"X 一定没有 Y"的硬断言）+ 全程免责。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sitemapRoutes } from "../lib/sitemap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGES = path.join(__dirname, "..", "pages");
const src = fs.readFileSync(path.join(PAGES, "weacond-vs.js"), "utf8");

const pages = new Set(
  fs.readdirSync(PAGES).filter((f) => f.endsWith(".js")).map((f) => f.slice(0, -3))
);
function hrefToPage(href) {
  const clean = href.split("?")[0].split("#")[0];
  if (clean === "/" || clean === "") return "index";
  return clean.replace(/^\/+/, "");
}

// 1) 页面存在 + 关键结构（双语 + 矩阵 + 何时用谁 + FAQ + 结构化数据 + 免责）
test("/weacond-vs 页面文件存在且含关键结构", () => {
  assert.ok(src.includes('"use client"'), "应为客户端组件");
  // 双语（一套引擎零漂移）
  assert.ok(src.includes("const zh ="), "含中文 i18n");
  assert.ok(src.includes("const en ="), "含英文 i18n");
  // 能力对比矩阵 + 何时用谁 + 为什么选
  assert.ok(src.includes("const MATRIX"), "含对比矩阵");
  assert.ok(src.includes("const WHEN"), "含「何时用谁」指南");
  assert.ok(src.includes("const WHY"), "含「为什么选 Weacond」");
  // 竞品中立（不贬低）
  assert.ok(src.includes("Investopedia"), "对比含 Investopedia");
  assert.ok(src.includes("Finance Toolkit"), "对比含 Finance Toolkit");
  // 定位支柱（确定性/双语/教育/AI 可调用/本地隐私/双运行时）
  assert.ok(src.includes("/api/mcp"), "突出 AI 可调用（MCP 端点）");
  assert.ok(src.includes("WebGPU"), "突出本地隐私 AI");
  // 结构化数据（单一事实源 lib/jsonLd，不编造评分）
  assert.ok(src.includes("webApplicationLd"), "用 WebApplication JSON-LD");
  assert.ok(src.includes("faqLd"), "用 FAQ JSON-LD");
  assert.ok(src.includes("breadcrumbLd"), "用面包屑 JSON-LD");
  // 免责（合规：教育/参考、非投资建议）
  assert.ok(src.includes("disclaimer"), "含免责声明");
  assert.ok(
    src.includes("仅供参考") || src.includes("educational"),
    "含「仅供参考/教育用途」非投资建议声明"
  );
});

// 2) 已接入 sitemap（防"页面在但搜不到"回退）
test("/weacond-vs 已接入 sitemap（CORE_ROUTES）", () => {
  const paths = sitemapRoutes().map((r) => r.path);
  assert.ok(paths.includes("/weacond-vs"), "/weacond-vs 应在 sitemap 路由中");
});

// 3) 页面内链不悬空（/mcp /glossary /calculators 都解析到真实页面）
test("/weacond-vs 内链都解析到真实页面", () => {
  for (const href of ["/mcp", "/glossary", "/calculators"]) {
    assert.ok(pages.has(hrefToPage(href)), `内链 ${href} 无对应页面`);
  }
});

console.log("✅ weacond-vs 对比页守卫全部通过");
