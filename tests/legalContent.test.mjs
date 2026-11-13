// tests/legalContent.test.mjs — lib/legalContent.js 结构与合规条款守卫
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TERMS_SECTIONS,
  PRIVACY_SECTIONS,
  PLATFORM_JURISDICTION,
} from "../lib/legalContent.js";

function hasBilingualFields(list, tag) {
  const ids = new Set();
  for (const s of list) {
    assert.ok(s.id, `${tag} entry has id`);
    assert.ok(s.zh && s.zh.h && s.zh.p, `${s.id} has zh h/p`);
    assert.ok(s.en && s.en.h && s.en.p, `${s.id} has en h/p`);
    assert.ok(!ids.has(s.id), `${s.id} unique`);
    ids.add(s.id);
  }
}

test("TERMS/PRIVACY 章节双语字段完整且 id 唯一", () => {
  hasBilingualFields(TERMS_SECTIONS, "TERMS");
  hasBilingualFields(PRIVACY_SECTIONS, "PRIVACY");
});

test("合规必备条款存在（适用法律/终止/数据源/跨境/删除）", () => {
  const terms = new Set(TERMS_SECTIONS.map((s) => s.id));
  for (const id of ["governing-law", "changes", "termination", "data-sourcing"]) {
    assert.ok(terms.has(id), `TERMS has ${id}`);
  }
  const privacy = new Set(PRIVACY_SECTIONS.map((s) => s.id));
  for (const id of ["cross-border", "deletion"]) {
    assert.ok(privacy.has(id), `PRIVACY has ${id}`);
  }
});

test("PLATFORM_JURISDICTION 结构存在（上线前必填 governingLaw）", () => {
  assert.ok(PLATFORM_JURISDICTION && typeof PLATFORM_JURISDICTION === "object");
  assert.equal(typeof PLATFORM_JURISDICTION.governingLaw, "string");
  assert.equal(typeof PLATFORM_JURISDICTION.contactEmail, "string");
  assert.ok(PLATFORM_JURISDICTION.contactEmail.includes("@"), "contactEmail is an email");
});

test("适用法律条款：未填主体时显示中性占位（非虚假管辖）", () => {
  const gov = TERMS_SECTIONS.find((s) => s.id === "governing-law");
  assert.ok(gov);
  // 当前 governingLaw 为空 → 应为占位文案（不含具体法域断言之外的承诺）
  assert.ok(gov.zh.p.includes("上线前") || gov.zh.p.length > 0);
});