// tests/jsonLdFaq.test.mjs — FAQPage JSON-LD 生成器（反幻觉：仅渲染真实问答）
import { test } from "node:test";
import assert from "node:assert/strict";
import { faqLd, toScript } from "../lib/jsonLd.js";

test("faqLd 产出合法 FAQPage（Question/Answer 成对）", () => {
  const ld = faqLd([{ q: "A?", a: "Yes." }, { question: "B?", answer: "No." }]);
  assert.equal(ld["@type"], "FAQPage");
  assert.equal(ld.mainEntity.length, 2);
  assert.equal(ld.mainEntity[0]["@type"], "Question");
  assert.equal(ld.mainEntity[0].acceptedAnswer["@type"], "Answer");
  // 两种键名写法都接受
  assert.equal(ld.mainEntity[1].name, "B?");
});

test("空问答不报错，mainEntity 为空数组", () => {
  const ld = faqLd([]);
  assert.equal(ld["@type"], "FAQPage");
  assert.deepEqual(ld.mainEntity, []);
});

test("toScript 转义 < 防注入并标记 ld+json", () => {
  const s = toScript(faqLd([{ q: "x < y?", a: "z" }]));
  assert.ok(s.includes('type="application/ld+json"'));
  assert.ok(s.includes("\\u003c")); // < 被转义
  assert.ok(!s.includes("<y"));
});
