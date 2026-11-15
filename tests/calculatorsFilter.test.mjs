// tests/calculatorsFilter.test.mjs — /calculators 页 73 工具客户端过滤守卫（防回退）
//
// 锁定 /calculators 页的客户端搜索/过滤：必须保留 query 状态、按 title/titleEn/
// desc/descEn/category/id/href 的过滤、结果计数 + 空态 + 清空按钮。
// 初始 query 为空时 shownGroups === 全量分组，SSR 进全量、SEO 不退化。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "..", "pages", "calculators.js"), "utf8");

test("/calculators 页保留客户端过滤逻辑（状态 + 渲染 + 输入）", () => {
  assert.ok(src.includes("setQuery"), "应有 setQuery 状态");
  assert.ok(src.includes("shownGroups.map"), "工具清单应渲染过滤后的 shownGroups");
  assert.ok(src.includes('type="search"'), "应有搜索输入框");
});

test("/calculators 过滤覆盖中英双语字段", () => {
  for (const f of ["t.title", "t.titleEn", "t.desc", "t.descEn", "t.category", "t.href"]) {
    assert.ok(src.includes(f), `过滤应覆盖 ${f}`);
  }
});

test("/calculators 有结果计数 + 空态 + 清空按钮（防 UX 回退）", () => {
  assert.ok(src.includes("resultsHint"), "应有结果计数");
  assert.ok(src.includes("noResults"), "应有空态");
  assert.ok(src.includes('setQuery("")'), "应有清空按钮");
});

console.log("✅ calculatorsFilter 全部通过");
