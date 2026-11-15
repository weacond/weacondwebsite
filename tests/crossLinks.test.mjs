// tests/crossLinks.test.mjs — 交叉链接引擎（计算器 ↔ 概念/词典 ↔ MCP ↔ 对比）
import { test } from "node:test";
import assert from "node:assert/strict";
import { crossLinksFor, hasCrossLinks } from "../lib/crossLinks.js";
import { TOOLS as MCP_TOOLS } from "../lib/mcp/tools.js";
import { getToolBySlug, allToolHrefs } from "../lib/toolsIndex.js";

// MCP 工具名集合（反向校验：引擎里 MCP_BY_TOOL 引用的 name 必须真实存在）
const MCP_NAMES = new Set(MCP_TOOLS.map((t) => t.name));
// 注册表计算器 href 集合（校验 compare 兄弟 + 概念/工具 href 不悬空）
const PAGE_HREFS = new Set(allToolHrefs());

test("crossLinksFor 对已知计算器返回三类交叉链接", () => {
  const dcf = crossLinksFor("dcf");
  assert.ok(dcf.concepts.some((c) => c.id === "dcf"), "dcf 含 DCF 概念");
  assert.ok(dcf.mcp.some((m) => m.name === "dcf"), "dcf 含 dcf MCP 工具");
  assert.equal(dcf.compare.length, 0, "dcf 无对比兄弟（v1 未配置）");
});

test("purchasing-power / real-estate / dca 各自带可对比兄弟", () => {
  const pp = crossLinksFor("purchasing-power");
  assert.ok(pp.compare.some((c) => c.slug === "inflation-goal"), "pp→inflation-goal");
  const re = crossLinksFor("real-estate");
  assert.ok(re.compare.some((c) => c.slug === "dcf"), "real-estate→dcf");
  const dca = crossLinksFor("dca");
  assert.ok(dca.compare.some((c) => c.slug === "npv"), "dca→npv");
});

// 反向校验：引擎引用的 MCP 工具名必须在 MCP 注册表真实存在（防拼写/改名脱节）
test("所有 MCP 工具名都存在于 MCP 注册表", () => {
  const slugs = ["dcf", "dca", "purchasing-power", "real-estate", "kelly"];
  for (const s of slugs) {
    for (const m of crossLinksFor(s).mcp) {
      assert.ok(MCP_NAMES.has(m.name), `MCP 工具名 ${m.name} 不在注册表`);
      assert.ok(m.title && m.titleEn, `${m.name} 缺双语标题`);
    }
  }
});

// 反向校验：compare 兄弟 slug 必须解析到真实计算器页（防悬空链接）
test("所有 compare 兄弟都解析到真实计算器页", () => {
  const slugs = ["dcf", "dca", "purchasing-power", "real-estate", "kelly"];
  for (const s of slugs) {
    for (const c of crossLinksFor(s).compare) {
      assert.ok(getToolBySlug(c.slug), `compare 兄弟 /${c.slug} 不存在`);
      assert.equal(c.href, "/" + c.slug, "compare href 与 slug 一致");
    }
  }
});

// 概念/工具 href 不悬空（/glossary、/mcp 是真实页面）
test("所有交叉链接 href 不悬空", () => {
  const knownPages = new Set([...PAGE_HREFS, "/glossary", "/mcp"]);
  const slugs = ["dcf", "dca", "purchasing-power", "real-estate", "kelly"];
  for (const s of slugs) {
    const c = crossLinksFor(s);
    for (const x of [...c.concepts, ...c.mcp, ...c.compare]) {
      assert.ok(knownPages.has(x.href), `${s} 的交叉链接 ${x.href} 悬空`);
    }
  }
});

// 容错：未知 slug 返回全空；/ 前缀 / 大小写不影响；hasCrossLinks 正确
test("未知 slug 返回全空 + hasCrossLinks 判断", () => {
  const empty = crossLinksFor("nonexistent-tool");
  assert.deepEqual(empty, { concepts: [], mcp: [], compare: [] });
  assert.equal(hasCrossLinks("nonexistent-tool"), false);
  assert.equal(hasCrossLinks("dcf"), true);
  assert.equal(crossLinksFor("/dcf").mcp.length, crossLinksFor("dcf").mcp.length, "/ 前缀归一");
});

console.log("✅ crossLinks 全部通过");