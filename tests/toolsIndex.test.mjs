// tests/toolsIndex.test.mjs — lib/toolsIndex.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TOOLS,
  CATEGORIES,
  groupedTools,
  allToolHrefs,
  getTool,
} from "../lib/toolsIndex.js";

test("每个工具字段完整且 href 合法", () => {
  for (const t of TOOLS) {
    assert.ok(t.id && t.title && t.titleEn, `${t.id} has titles`);
    assert.ok(t.desc && t.descEn, `${t.id} has descs`);
    assert.ok(typeof t.href === "string" && t.href.startsWith("/"), `${t.id} href`);
    assert.ok(CATEGORIES[t.category], `${t.id} category valid`);
  }
});

test("id 唯一、href 唯一", () => {
  const ids = TOOLS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(allToolHrefs().length, TOOLS.length); // 无重复 href
});

test("groupedTools 覆盖全部工具且按 category order 排序", () => {
  const groups = groupedTools();
  const total = groups.reduce((s, g) => s + g.tools.length, 0);
  assert.equal(total, TOOLS.length);
  const orders = groups.map((g) => CATEGORIES[g.category].order);
  for (let i = 1; i < orders.length; i++) assert.ok(orders[i] > orders[i - 1]);
  // 每组非空
  for (const g of groups) assert.ok(g.tools.length > 0);
});

test("getTool: 已知返回、未知抛错", () => {
  assert.equal(getTool("risk").href, "/risk");
  assert.throws(() => getTool("nope"), /Unknown/);
});

test("已知 5 个核心分类均存在", () => {
  for (const c of ["technical", "position", "portfolio", "risk", "options"]) {
    assert.ok(CATEGORIES[c], `category ${c}`);
  }
});
