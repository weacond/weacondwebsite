// tests/crossLinks.test.mjs — 交叉链接引擎（计算器 ↔ 概念/词典 ↔ MCP ↔ 对比）
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { crossLinksFor, hasCrossLinks, MCP_NAME_BY_SLUG } from "../lib/crossLinks.js";
import { TOOLS as MCP_TOOLS } from "../lib/mcp/tools.js";
import { getToolBySlug } from "../lib/toolsIndex.js";

// MCP 工具名集合（反向校验：引擎里引用的 MCP 名必须真实存在）
const MCP_NAMES = new Set(MCP_TOOLS.map((t) => t.name));
const PAGES = path.join(process.cwd(), "pages");
const mappedSlugs = Object.keys(MCP_NAME_BY_SLUG);

// 1) 引擎引用的每个 MCP 名都必须存在于 MCP 注册表（防改名/拼写脱节）
test("MCP_NAME_BY_SLUG 里每个 slug 的 MCP 名都存在于 MCP 注册表", () => {
  for (const slug of mappedSlugs) {
    const name = MCP_NAME_BY_SLUG[slug];
    assert.ok(MCP_NAMES.has(name), `${slug} → MCP 名「${name}」不在 MCP 注册表`);
    const m = crossLinksFor(slug).mcp;
    assert.equal(m.length, 1, `${slug} 应有 1 个 MCP 工具`);
    assert.ok(m[0].title && m[0].titleEn, `${slug} 的 MCP 项缺双语标题`);
  }
});

// 2) 「接入」不变量：每个有页面文件的映射 slug 都必须在页面里渲染 <CrossLinks slug=...>
test("每个有页面的映射 slug 都接入了 <CrossLinks> 渲染", () => {
  for (const slug of mappedSlugs) {
    const file = path.join(PAGES, slug + ".js");
    if (!fs.existsSync(file)) continue; // 无页面则不强制接入
    const src = fs.readFileSync(file, "utf8");
    assert.ok(
      src.includes(`<CrossLinks slug="${slug}" />`),
      `${slug} 在 MCP_NAME_BY_SLUG 中但页面未渲染 <CrossLinks slug="${slug}" />`
    );
    assert.ok(
      src.includes("import CrossLinks from \"../components/CrossLinks\""),
      `${slug} 渲染了 CrossLinks 但缺少 import`
    );
  }
});

// 3) compare 兄弟 slug 必须解析到真实计算器页（防悬空链接）
test("所有 compare 兄弟都解析到真实计算器页", () => {
  for (const slug of mappedSlugs) {
    for (const c of crossLinksFor(slug).compare) {
      assert.ok(getToolBySlug(c.slug), `compare 兄弟 /${c.slug} 不存在`);
      assert.equal(c.href, "/" + c.slug, "compare href 与 slug 一致");
    }
  }
});

// 4) 交叉链接 href 不悬空：/glossary、/mcp 是真实页面；compare 必须解析到注册表计算器
test("所有交叉链接 href 不悬空", () => {
  for (const slug of mappedSlugs) {
    const c = crossLinksFor(slug);
    for (const x of [...c.concepts, ...c.mcp, ...c.compare]) {
      const ok =
        x.href === "/glossary" ||
        x.href === "/mcp" ||
        getToolBySlug(String(x.href).replace(/^\//, ""));
      assert.ok(ok, `${slug} 的交叉链接 ${x.href} 悬空`);
    }
  }
});

// 5) 容错：未知 slug 返回全空；/ 前缀归一；hasCrossLinks 正确
test("未知 slug 返回全空 + hasCrossLinks 判断", () => {
  const empty = crossLinksFor("nonexistent-tool");
  assert.deepEqual(empty, { concepts: [], mcp: [], compare: [] });
  assert.equal(hasCrossLinks("nonexistent-tool"), false);
  assert.equal(hasCrossLinks("dcf"), true);
  assert.equal(
    crossLinksFor("/dcf").mcp.length,
    crossLinksFor("dcf").mcp.length,
    "/ 前缀归一"
  );
});

console.log(`✅ crossLinks 全部通过（${mappedSlugs.length} 个映射 slug）`);