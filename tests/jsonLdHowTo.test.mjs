// tests/jsonLdHowTo.test.mjs — HowTo JSON-LD 生成器（反幻觉：步骤文本由调用方提供，不编造）
import { test } from "node:test";
import assert from "node:assert/strict";
import { howToLd, toScript } from "../lib/jsonLd.js";

test("howToLd 字符串数组 → HowTo/HowToStep，position 从 1 递增、默认 name", () => {
  const ld = howToLd("How to X", ["do A", "do B"], "/x");
  assert.equal(ld["@context"], "https://schema.org");
  assert.equal(ld["@type"], "HowTo");
  assert.equal(ld.name, "How to X");
  assert.equal(ld.url, "https://weacond.com/x");
  assert.equal(ld.step.length, 2);
  assert.equal(ld.step[0]["@type"], "HowToStep");
  assert.equal(ld.step[0].position, 1);
  assert.equal(ld.step[0].name, "Step 1"); // 字符串 → 默认名
  assert.equal(ld.step[0].text, "do A");
  assert.equal(ld.step[1].position, 2);
});

test("howToLd 对象数组 [{name,text}] → 采用调用方提供的 name/text", () => {
  const ld = howToLd("Title", [{ name: "Enter inputs", text: "..." }]);
  assert.equal(ld.step[0].name, "Enter inputs");
  assert.equal(ld.step[0].text, "...");
  // 无 url 参数 → 不附 url 字段
  assert.equal("url" in ld, false);
});

test("空步骤不报错，step 为空数组", () => {
  const ld = howToLd("Title", []);
  assert.equal(ld["@type"], "HowTo");
  assert.deepEqual(ld.step, []);
  assert.equal(ld.name, "Title");
});

test("toScript(howToLd) 标记 ld+json 且转义 <", () => {
  const s = toScript(howToLd("T", ["a < b"]));
  assert.ok(s.includes('type="application/ld+json"'));
  assert.ok(s.includes("\\u003c"));
  assert.ok(!s.includes("<b\""));
});