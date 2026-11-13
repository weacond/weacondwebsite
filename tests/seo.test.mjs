// tests/seo.test.mjs — SEO 元数据生成器单元测试
import assert from "node:assert/strict";
import {
  openGraphMeta,
  canonicalUrl,
  metaTagAttrs,
  hasRequiredOg,
} from "../lib/seo.js";

function t(name, fn) {
  fn();
  passed++;
  console.log("  ✓ " + name);
}
let passed = 0;

t("canonicalUrl：首页为根，无尾斜杠", () => {
  assert.equal(canonicalUrl("/"), "https://weacond.com");
  assert.equal(canonicalUrl("/signals/"), "https://weacond.com/signals");
  assert.equal(canonicalUrl("signals"), "https://weacond.com/signals");
});
t("canonicalUrl：自定义 baseUrl", () => {
  assert.equal(canonicalUrl("/edge", "https://x.com"), "https://x.com/edge");
});

t("openGraphMeta：含必需 OG 字段 + canonical + twitter", () => {
  const metas = openGraphMeta({ title: "信号", description: "desc", path: "/signals" });
  assert.ok(hasRequiredOg(metas), "含必需 OG 字段");
  const byKey = Object.fromEntries(metas.map((m) => [m.key, m]));
  assert.equal(byKey["canonical"].href, "https://weacond.com/signals");
  assert.equal(byKey["og:title"].content, "信号 — Weacond");
  assert.equal(byKey["og:type"].content, "website");
  assert.ok(byKey["twitter:card"], "有 twitter card");
});
t("openGraphMeta：零幻觉(不含 price/rating)", () => {
  const metas = openGraphMeta({ title: "t", description: "d", path: "/x" });
  const blob = JSON.stringify(metas);
  assert.ok(!/price|rating/i.test(blob), "不含 price/rating 字段");
});
t("openGraphMeta：article 类型", () => {
  const metas = openGraphMeta({ title: "t", description: "d", path: "/p", type: "article" });
  const byKey = Object.fromEntries(metas.map((m) => [m.key, m]));
  assert.equal(byKey["og:type"].content, "article");
});
t("metaTagAttrs：区分 rel/property/name", () => {
  const a = metaTagAttrs({ key: "canonical", rel: "canonical", href: "u" });
  assert.equal(a.rel, "canonical");
  assert.equal(a.href, "u");
  const b = metaTagAttrs({ key: "og:title", property: "og:title", content: "c" });
  assert.equal(b.property, "og:title");
  assert.equal(b.content, "c");
});
t("hasRequiredOg：缺字段返回 false", () => {
  assert.equal(hasRequiredOg([{ key: "og:title" }]), false);
  assert.equal(hasRequiredOg([]), false);
});
t("openGraphMeta：空入参不崩", () => {
  const metas = openGraphMeta({});
  assert.ok(Array.isArray(metas), "返回数组");
});

console.log(`\n✅ seo: ${passed}/${passed} 通过`);
