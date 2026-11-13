// tests/sitemap.test.mjs — 站点地图生成器单元测试
import assert from "node:assert/strict";
import {
  buildSitemapXml,
  sitemapRoutes,
  calculatorRoutes,
  CORE_ROUTES,
} from "../lib/sitemap.js";
import { TOOLS } from "../lib/toolsIndex.js";

function t(name, fn) {
  fn();
  passed++;
  console.log("  ✓ " + name);
}
let passed = 0;

// ── 路由派生 ──
t("calculatorRoutes 数量 === TOOLS 数量", () =>
  assert.equal(calculatorRoutes().length, TOOLS.length));
t("每条计算器路由有 path/priority/changefreq", () => {
  for (const r of calculatorRoutes()) {
    assert.ok(r.path && /^\/\S/.test(r.path), "path 以 / 开头");
    assert.ok(r.priority > 0 && r.priority <= 1, "priority 在 (0,1]");
    assert.ok(/^(always|hourly|daily|weekly|monthly|yearly)$/.test(r.changefreq), "changefreq 合法");
  }
});
t("sitemapRoutes 含核心路由 + 全部计算器", () => {
  const routes = sitemapRoutes();
  const paths = routes.map((r) => r.path);
  assert.ok(paths.includes("/"), "含首页 /");
  assert.ok(paths.includes("/signals"), "含 /signals");
  for (const tool of TOOLS) assert.ok(paths.includes(tool.href), `含 ${tool.href}`);
});
t("sitemapRoutes 按 path 去重（核心优先）", () => {
  const routes = sitemapRoutes();
  const paths = routes.map((r) => r.path);
  assert.equal(new Set(paths).size, paths.length, "无重复 path");
});
t("核心路由优先级 > 计算器（/ 为 1.0）", () => {
  const home = sitemapRoutes().find((r) => r.path === "/");
  assert.equal(home.priority, 1.0);
});

// ── XML 生成 ──
t("buildSitemapXml 含 xml 头 + urlset", () => {
  const xml = buildSitemapXml("https://weacond.com", sitemapRoutes(), "2026-11-14");
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "xml 头");
  assert.ok(xml.includes("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"), "urlset");
  assert.ok(xml.includes("</urlset>"), "闭合");
});
t("首页 / → 不产生双斜杠", () => {
  const xml = buildSitemapXml("https://weacond.com", [{ path: "/", priority: 1.0, changefreq: "daily" }], "2026-01-01");
  assert.ok(xml.includes("<loc>https://weacond.com</loc>"), "首页 loc 无双斜杠");
  assert.ok(!xml.includes("https://weacond.com/</loc>"), "无尾斜杠 loc");
});
t("带尾斜杠的 baseUrl 被规整", () => {
  const xml = buildSitemapXml("https://weacond.com///", [{ path: "/signals", priority: 0.9, changefreq: "daily" }], "x");
  assert.ok(xml.includes("<loc>https://weacond.com/signals</loc>"), "尾斜杠被去掉");
});
t("XML 转义特殊字符", () => {
  const xml = buildSitemapXml("https://x.com", [{ path: "/a&b", priority: 0.5, changefreq: "daily" }], "2026&11");
  assert.ok(xml.includes("&amp;"), "& 被转义");
});
t("默认 lastmod 为今天的 YYYY-MM-DD", () => {
  const xml = buildSitemapXml("https://weacond.com", [{ path: "/", priority: 1, changefreq: "daily" }]);
  assert.ok(/\d{4}-\d{2}-\d{2}/.test(xml), "含 YYYY-MM-DD");
});
t("默认 routes 来自 sitemapRoutes（非空且多）", () => {
  const xml = buildSitemapXml("https://weacond.com");
  const n = (xml.match(/<url>/g) || []).length;
  assert.ok(n >= 60, `至少 60 个 <url>，实际 ${n}`);
});

console.log(`\n✅ sitemap: ${passed}/${passed} 通过`);
