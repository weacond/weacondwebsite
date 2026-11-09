import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBook,
  resolvePath,
  publicUrl,
  markdownToBlocks,
} from "../lib/r2.js";

// ---------- normalizeBook ----------
test("normalizeBook: price_cents 转美元、number 为 1 基索引(i+1)", () => {
  const n = normalizeBook({ price_cents: 700 }, 0);
  assert.equal(n.price, 7);
  assert.equal(n.number, 1); // i=0 → 1 基
});

test("normalizeBook: 已有 price 时保留，desc 回退链生效", () => {
  const n = normalizeBook({ price: 5, desc_cn: "中文描述", title_en: "En" }, 3);
  assert.equal(n.price, 5);
  assert.equal(n.number, 4); // i=3 → 1 基
  assert.equal(n.desc_cn, "中文描述");
  assert.equal(n.desc, "中文描述"); // desc 缺失 → 回退 desc_cn
});

// ---------- resolvePath ----------
test("resolvePath: 英文默认原样返回", () => {
  assert.equal(resolvePath("preview/x.md", "en"), "preview/x.md");
  assert.equal(resolvePath("x.md"), "x.md"); // 默认 lang=en
});

test("resolvePath: 中文在扩展名前插入 .cn，已 .cn.md 不变", () => {
  assert.equal(resolvePath("preview/x.md", "zh"), "preview/x.cn.md");
  assert.equal(resolvePath("preview/x.cn.md", "zh"), "preview/x.cn.md");
});

test("resolvePath: 对象写法按语言取（键为 cn/en），缺省回退", () => {
  assert.equal(resolvePath({ cn: "a.cn.md", en: "a.md" }, "en"), "a.md");
  assert.equal(resolvePath({ cn: "a.cn.md", en: "a.md" }, "zh"), "a.cn.md");
  assert.equal(resolvePath("", "en"), "");
});

// ---------- publicUrl ----------
test("publicUrl: 拼接公开桶 URL", () => {
  const u = publicUrl("cover/1.jpg");
  assert.ok(u.startsWith("https://"), "应为 https URL");
  assert.ok(u.endsWith("/cover/1.jpg"), "应包含 key 路径");
});

// ---------- markdownToBlocks ----------
test("markdownToBlocks: 标题/段落/列表/代码块", () => {
  const blocks = markdownToBlocks("# H1\n\nSome text\n- item1\n- item2\n```\ncode\n```");
  assert.ok(blocks.some((b) => b.type === "h1" && b.text === "H1"));
  assert.ok(blocks.some((b) => b.type === "paragraph" && b.text === "Some text"));
  assert.ok(blocks.some((b) => b.type === "list_item" && b.text === "item1"));
  assert.ok(blocks.some((b) => b.type === "list_item" && b.text === "item2"));
  assert.ok(blocks.some((b) => b.type === "code" && b.text === "code"));
});

test("markdownToBlocks: 空输入 → 空数组", () => {
  assert.deepEqual(markdownToBlocks(""), []);
});