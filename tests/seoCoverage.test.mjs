// tests/seoCoverage.test.mjs — 计算器页 JSON-LD 覆盖守卫（防回归）
//
// 风险：68 个 TOOLS 工具页若未来某页漏注入 CalcLd（SoftwareApplication JSON-LD），
// 该页对搜索引擎将缺结构化数据。本测试锁定本次 68 页 JSON-LD 铺开的成果。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOOLS, getToolBySlug } from "../lib/toolsIndex.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, "..", "pages");
const slugOf = (href) => href.replace(/^\/+/, "");

// 页面对应 slug，且注入了自身的 CalcLd（用带闭合引号精确匹配，避免 options 误匹配 options-payoff）。
function pageHasCalcLd(slug) {
  const body = fs.readFileSync(path.join(pagesDir, slug + ".js"), "utf8");
  return body.includes("CalcLd") && body.includes(`slug="${slug}"`);
}

test("TOOLS 非空且均为合法计算器路由", () => {
  assert.ok(TOOLS.length > 0, "TOOLS 不应为空");
  for (const t of TOOLS) assert.ok(t.href.startsWith("/"), `非法 href: ${t.href}`);
});

test("每个 TOOLS 工具的页面都存在且已注入自身 CalcLd", () => {
  const missing = [];
  for (const t of TOOLS) {
    const slug = slugOf(t.href);
    if (!fs.existsSync(path.join(pagesDir, slug + ".js"))) {
      missing.push(`${slug}(noFile)`);
      continue;
    }
    if (!pageHasCalcLd(slug)) missing.push(`${slug}(noCalcLd)`);
  }
  assert.deepEqual(missing, [], `以下页面缺少 CalcLd: ${missing.join(", ")}`);
});

test("getToolBySlug 能解析每个 TOOLS 工具的 href", () => {
  for (const t of TOOLS) {
    const found = getToolBySlug(slugOf(t.href));
    assert.ok(found && found.href === t.href, `getToolBySlug 未解析 ${t.href}`);
  }
});
