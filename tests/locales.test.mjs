// tests/locales.test.mjs — i18n 语言别名
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LOCALES, normalizeLocale, localeAliasPath, localeFromPath, aliasRedirectTarget,
} from "../lib/locales.js";

test("normalizeLocale：白名单内返回之，否则 null", () => {
  assert.equal(normalizeLocale("zh"), "zh");
  assert.equal(normalizeLocale("en"), "en");
  assert.equal(normalizeLocale("xx"), null);
  assert.equal(normalizeLocale(undefined), null);
});

test("localeAliasPath：合法 → /xx，非法 → null", () => {
  assert.equal(localeAliasPath("zh"), "/zh");
  assert.equal(localeAliasPath("en"), "/en");
  assert.equal(localeAliasPath("de"), null);
});

test("localeFromPath：解析语言前缀", () => {
  assert.equal(localeFromPath("/zh"), "zh");
  assert.equal(localeFromPath("/zh/risk"), "zh");
  assert.equal(localeFromPath("/en/portfolio"), "en");
  assert.equal(localeFromPath("/risk"), null);
  assert.equal(localeFromPath("/"), null);
  assert.equal(localeFromPath(""), null);
});

test("aliasRedirectTarget：默认首页，可覆盖", () => {
  assert.equal(aliasRedirectTarget(), "/");
  assert.equal(aliasRedirectTarget({ home: "/about" }), "/about");
});

test("LOCALES 含 zh/en", () => {
  assert.deepEqual([...LOCALES].sort(), ["en", "zh"]);
});

test("localeFromPath 不匹配部分前缀（如 /enx 不算 en）", () => {
  assert.equal(localeFromPath("/enx/foo"), null);
});
