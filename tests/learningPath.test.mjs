// tests/learningPath.test.mjs — lib/learningPath.js 单元测试
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LEARNING_PATH,
  LEVELS,
  groupedPath,
  totalMinutes,
  allToolHrefs,
} from "../lib/learningPath.js";

test("每个模块字段完整、level 合法、tool 为合法 href、estMin 为正", () => {
  for (const m of LEARNING_PATH) {
    assert.ok(m.id && m.title && m.titleEn && m.desc && m.descEn, `${m.id} fields`);
    assert.ok(LEVELS[m.level], `${m.id} level valid`);
    assert.ok(m.tool.startsWith("/"), `${m.id} tool href`);
    assert.ok(m.estMin > 0, `${m.id} estMin`);
  }
});

test("id 唯一；tool href 合法集合", () => {
  const ids = LEARNING_PATH.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length, "id 唯一");
  for (const h of allToolHrefs()) assert.ok(h.startsWith("/"));
  assert.ok(allToolHrefs().length > 0);
});

test("groupedPath 按等级 order 排序，覆盖全部模块，组内非空", () => {
  const groups = groupedPath();
  const total = groups.reduce((s, g) => s + g.modules.length, 0);
  assert.equal(total, LEARNING_PATH.length);
  const orders = groups.map((g) => LEVELS[g.level].order);
  for (let i = 1; i < orders.length; i++) assert.ok(orders[i] > orders[i - 1], "等级递增");
  for (const g of groups) assert.ok(g.modules.length > 0, "组非空");
});

test("三个等级都至少有一个模块", () => {
  const levels = new Set(LEARNING_PATH.map((m) => m.level));
  for (const lv of ["beginner", "intermediate", "advanced"]) assert.ok(levels.has(lv), `level ${lv} present`);
});

test("totalMinutes 为各模块 estMin 之和且为正", () => {
  const sum = LEARNING_PATH.reduce((s, m) => s + m.estMin, 0);
  assert.equal(totalMinutes(), sum);
  assert.ok(totalMinutes() > 0);
});
