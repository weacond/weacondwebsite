// tests/i18nCompleteness.test.mjs — 导航双语标签完整性（防回归）
//
// 新特性不断接入导航，最大风险是「加了 nav 项却漏了某语言标签」。
// 本测试解析 components/Navbar.js 文本，确保每个 NAV 项的 key 在
// labels.zh 与 labels.en 两个语言块里都有定义。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "..", "components", "Navbar.js"), "utf8");

// 匹配某个开括号 { 对应的闭括号 }，返回闭括号索引
function matchBrace(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// 从 `zh: {` / `en: {` 起取该语言块，抽出所有 `key: "..."` 的 key
function languageKeys(src, lang) {
  const marker = `${lang}: {`;
  const start = src.indexOf(marker);
  assert.ok(start >= 0, `${lang} 语言块存在`);
  const open = src.indexOf("{", start);
  const close = matchBrace(src, open);
  const block = src.slice(open + 1, close);
  const keys = new Set();
  const re = /(\w+):\s*"/g;
  let m;
  while ((m = re.exec(block)) !== null) keys.add(m[1]);
  return keys;
}

test("解析到 NAV 项与两种语言标签块", () => {
  const navKeys = [...src.matchAll(/key:\s*"(\w+)"/g)].map((m) => m[1]);
  assert.ok(navKeys.length >= 15, `应解析到较多 NAV 项，实际 ${navKeys.length}`);
  assert.ok(new Set(navKeys).size === navKeys.length, "NAV key 唯一");
  assert.ok(languageKeys(src, "zh").size >= 15, "zh 标签充足");
  assert.ok(languageKeys(src, "en").size >= 15, "en 标签充足");
});

test("每个 NAV 项在 zh 与 en 中都有标签", () => {
  const navKeys = [...src.matchAll(/key:\s*"(\w+)"/g)].map((m) => m[1]);
  const zh = languageKeys(src, "zh");
  const en = languageKeys(src, "en");
  const missingZh = navKeys.filter((k) => !zh.has(k));
  const missingEn = navKeys.filter((k) => !en.has(k));
  assert.deepEqual(missingZh, [], `zh 缺失标签: ${missingZh.join(", ")}`);
  assert.deepEqual(missingEn, [], `en 缺失标签: ${missingEn.join(", ")}`);
});

test("本次新增的 11 个特性页 key 均已接入导航双语", () => {
  const navKeys = new Set([...src.matchAll(/key:\s*"(\w+)"/g)].map((m) => m[1]));
  for (const k of ["risk", "correlation", "montecarlo", "calculators", "performance", "glossary", "regime", "stresstest", "learning", "drawdown"]) {
    assert.ok(navKeys.has(k), `导航缺少 ${k}`);
  }
});
