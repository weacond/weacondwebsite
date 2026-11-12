// tests/search.test.mjs — 全站搜索
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, search, indexStats } from "../lib/search.js";

test("空查询 → 空数组", () => {
  assert.deepEqual(search(""), []);
  assert.deepEqual(search("   "), []);
});

test("索引含工具与术语", () => {
  const s = indexStats();
  assert.ok(s.tools > 0);
  assert.ok(s.terms > 0);
  assert.equal(s.total, s.tools + s.terms);
});

test("中文关键字命中工具", () => {
  const r = search("复利", "zh");
  assert.ok(r.length > 0, "should find compound");
  assert.ok(r.some((x) => x.id === "compound"));
});

test("英文关键字命中（lang=en 匹配英文字段）", () => {
  const r = search("correlation", "en");
  assert.ok(r.length > 0, "should find correlation");
  assert.ok(r.some((x) => x.id === "correlation"));
});

test("词典术语可被搜到", () => {
  const r = search("sharpe", "en");
  assert.ok(r.length > 0, "should find sharpe term");
  assert.ok(r.some((x) => x.type === "term"));
});

test("大小写不敏感", () => {
  const a = search("Sharpe", "en");
  const b = search("sharpe", "en");
  assert.equal(a.length, b.length);
});

test("limit 截断结果", () => {
  const many = search("a", "en", 3);
  assert.ok(many.length <= 3);
});

test("无匹配 → 空数组", () => {
  assert.deepEqual(search("zzz_no_such_term_xxx", "en"), []);
});

test("buildIndex 字段统一", () => {
  const idx = buildIndex();
  for (const item of idx) {
    assert.ok("type" in item && "id" in item && "href" in item && "title" in item, "field " + item.id);
  }
});
