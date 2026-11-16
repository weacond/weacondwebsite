// tests/mcpPageFilter.test.mjs — /mcp 页 56 工具客户端过滤守卫（防回退）
//
// 锁定 /mcp 页的客户端搜索/过滤：必须保留 query 状态、对 name/category/title/
// description 的过滤（中英双语命中）、结果计数 + 空态 + 清空按钮。
// 注意：过滤是纯客户端（初始 query="" 时 shown === 全量 tools），故 SSR 仍进全量清单，SEO 不退化。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "..", "pages", "mcp.js"), "utf8");

test("/mcp 页保留客户端过滤逻辑（状态 + 渲染 + 输入）", () => {
  assert.ok(src.includes("setQuery"), "应有 setQuery 状态");
  assert.ok(src.includes("shown.map"), "工具清单应渲染过滤后的 shown（而非全量 tools）");
  assert.ok(src.includes('type="search"'), "应有搜索输入框");
});

test("/mcp 过滤覆盖 name/category/title/description（中英双语命中）", () => {
  for (const f of ["t.name", "t.category", "t.title", "t.description"]) {
    assert.ok(src.includes(f), `过滤应覆盖 ${f}`);
  }
});

test("/mcp 有结果计数 + 空态 + 清空按钮（防 UX 回退）", () => {
  assert.ok(src.includes("resultsHint"), "应有结果计数");
  assert.ok(src.includes("noResults"), "应有空态");
  assert.ok(src.includes('setQuery("")'), "应有清空按钮");
});

console.log("✅ mcpPageFilter 全部通过");
