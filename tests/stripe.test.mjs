import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getBook,
  hasAccess,
  getR2Key,
  BUNDLE,
  ALL_SLUGS,
} from "../lib/stripe.js";

// ---------- getBook ----------
test("getBook: 已知单本 / 套装 / 未知", () => {
  const book = getBook("the-nature-of-money");
  assert.ok(book, "应能找到已知书");
  assert.equal(book.price_cents, 700);
  assert.equal(getBook("bundle-all").slug, "bundle-all");
  assert.equal(getBook("nonexistent-slug"), undefined);
});

// ---------- BUNDLE / ALL_SLUGS ----------
test("BUNDLE: 套装元数据正确", () => {
  assert.equal(BUNDLE.slug, "bundle-all");
  assert.equal(BUNDLE.type, "bundle");
  assert.ok(BUNDLE.price_cents > 0);
});

test("ALL_SLUGS: 含各本书 slug", () => {
  assert.ok(ALL_SLUGS.includes("the-nature-of-money"));
  assert.ok(ALL_SLUGS.length > 0);
});

// ---------- hasAccess（含套装放行逻辑）----------
test("hasAccess: null / 空数组 → 无权限", () => {
  assert.equal(hasAccess(null, "the-nature-of-money"), false);
  assert.equal(hasAccess([], "the-nature-of-money"), false);
});

test("hasAccess: 单本所有权", () => {
  assert.equal(hasAccess(["the-nature-of-money"], "the-nature-of-money"), true);
  assert.equal(hasAccess(["the-nature-of-money"], "valuation"), false);
});

test("hasAccess: 持有套装 → 放行任意单本（关键不变量）", () => {
  assert.equal(hasAccess(["bundle-all"], "the-nature-of-money"), true);
  assert.equal(hasAccess(["bundle-all"], "valuation"), true);
  assert.equal(hasAccess(["bundle-all"], "options-and-derivatives"), true);
});

// ---------- getR2Key（按语言取路径）----------
test("getR2Key: 中文 .cn.md / 英文 .md", () => {
  assert.equal(getR2Key("the-nature-of-money", "zh"), "content/the-nature-of-money.cn.md");
  assert.equal(getR2Key("the-nature-of-money", "en"), "content/the-nature-of-money.md");
});