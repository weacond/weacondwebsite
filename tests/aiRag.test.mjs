// tests/aiRag.test.mjs — lib/aiRag.js 单元测试（幻觉控制 + RAG 接地层）
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KNOWLEDGE,
  buildSystemPrompt,
  retrieveContext,
  formatContext,
  buildGroundedSystemPrompt,
  looksUncertain,
  appendSources,
} from "../lib/aiRag.js";

test("KNOWLEDGE：条目字段完整，id 唯一", () => {
  const ids = new Set();
  for (const e of KNOWLEDGE) {
    assert.ok(e.id && e.tags && e.zh && e.en, `${e.id} has fields`);
    assert.ok(Array.isArray(e.tags) && e.tags.length > 0, `${e.id} has tags`);
    assert.ok(!ids.has(e.id), `${e.id} unique`);
    ids.add(e.id);
  }
  assert.ok(KNOWLEDGE.length >= 6);
});

test("buildSystemPrompt：含幻觉控制铁律（不编造 / 说不确定 / 不荐股）", () => {
  const zh = buildSystemPrompt({ lang: "zh" });
  assert.match(zh, /严禁编造|不得编造/);
  assert.match(zh, /不确定|需要更多数据/);
  assert.match(zh, /个性化投资建议/);
  const en = buildSystemPrompt({ lang: "en" });
  assert.match(en, /never fabricate|never invent/i);
  assert.match(en, /not sure/i);
  assert.match(en, /personalized investment advice/i);
});

test("buildSystemPrompt：grounded + context 时注入上下文块", () => {
  const p = buildSystemPrompt({ lang: "en", context: "[ivrank] IV Rank fact" });
  assert.match(p, /answer only from this/); // 注入块独有标记
  assert.match(p, /\[ivrank\]/);
  const p2 = buildSystemPrompt({ lang: "en", context: "" });
  assert.ok(!p2.includes("answer only from this"), "no injected context block when empty");
});

test("retrieveContext：命中相关条目，按分数排序，空查询返回空", () => {
  assert.deepEqual(retrieveContext(""), []);
  assert.deepEqual(retrieveContext("   "), []);
  const hits = retrieveContext("什么是 IV Rank 隐含波动率", KNOWLEDGE, 3);
  assert.ok(hits.length >= 1);
  assert.ok(hits[0].id === "ivrank", `top hit is ivrank, got ${hits[0].id}`);
  const hits2 = retrieveContext("kelly position sizing bet", KNOWLEDGE, 3);
  assert.ok(hits2[0].id === "kelly", `top hit is kelly, got ${hits2[0].id}`);
});

test("retrieveContext：无匹配返回空（模型可据此说「不知道」）", () => {
  const hits = retrieveContext("zzzzxqwwweee", KNOWLEDGE, 4);
  assert.deepEqual(hits, []);
});

test("formatContext：含条目 id；空列表返回空串", () => {
  assert.equal(formatContext([]), "");
  const c = formatContext([KNOWLEDGE[0]], "zh");
  assert.match(c, /\[ivrank\]/);
});

test("buildGroundedSystemPrompt：命中时 sources 非空且 prompt 含上下文", () => {
  const r = buildGroundedSystemPrompt("卖 put 的风险 IV", { lang: "zh", k: 2 });
  assert.ok(Array.isArray(r.sources) && r.sources.length >= 1);
  assert.ok(r.sources.includes("putselling") || r.sources.includes("ivrank"));
  assert.match(r.prompt, /ivrank|putselling/);
});

test("buildGroundedSystemPrompt：extraKnowledge 可扩充语料", () => {
  const extra = [{ id: "mymacro", tags: ["fed", "降息"], zh: "测试条目", en: "test" }];
  const r = buildGroundedSystemPrompt("fed 降息", { extraKnowledge: extra, k: 1 });
  assert.ok(r.sources.includes("mymacro"), "extra KB entry retrieved");
});

test("looksUncertain：中英文不确定表达", () => {
  assert.ok(looksUncertain("我不确定，需要更多数据"));
  assert.ok(looksUncertain("I'm not sure, insufficient data"));
  assert.ok(!looksUncertain("IV Rank 高时卖方更占优"));
});

test("appendSources：有来源追加，无来源原样返回", () => {
  assert.equal(appendSources("答案", []), "答案");
  assert.equal(appendSources("答案", null), "答案");
  const out = appendSources("答案", ["ivrank", "vix"], "en");
  assert.match(out, /— Sources: \[ivrank\], \[vix\]/);
  const outZh = appendSources("答案", ["ivrank"], "zh");
  assert.match(outZh, /— 参考来源: \[ivrank\]/);
});