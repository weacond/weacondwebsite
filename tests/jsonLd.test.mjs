// tests/jsonLd.test.mjs — 结构化数据(JSON-LD)单元测试
import assert from "node:assert/strict";
import {
  organizationLd,
  webApplicationLd,
  softwareLd,
  faqLd,
  breadcrumbLd,
  itemLd,
  toLdString,
  toScript,
} from "../lib/jsonLd.js";

function t(name, fn) {
  fn();
  passed++;
  console.log("  ✓ " + name);
}
let passed = 0;
function isLd(o) {
  assert.ok(o && o["@context"] === "https://schema.org", "有 @context");
  assert.ok(o["@type"], "有 @type");
}

// ── 各构造器 ──
t("organizationLd 是 Organization", () => {
  const o = organizationLd();
  isLd(o);
  assert.equal(o["@type"], "Organization");
  assert.equal(o.name, "Weacond");
});
t("webApplicationLd 是 WebApplication 且【不编造评分】", () => {
  const o = webApplicationLd();
  isLd(o);
  assert.equal(o["@type"], "WebApplication");
  assert.equal(o.offers.price, "0");
  assert.equal(o.aggregateRating, undefined, "反幻觉：不得编造 aggregateRating");
});
t("softwareLd 用工具标题/链接/免费", () => {
  const o = softwareLd({ title: "枢轴点", titleEn: "Pivot Points", href: "/pivots", desc: "x", descEn: "y" });
  isLd(o);
  assert.equal(o["@type"], "SoftwareApplication");
  assert.ok(o.name.includes("Pivot Points"), "用英文标题");
  assert.equal(o.url, "https://weacond.com/pivots");
  assert.equal(o.offers.price, "0");
});
t("faqLd 映射 q/a，空数组 → 空 mainEntity", () => {
  const o = faqLd([{ q: "什么是卖Put?", a: "卖出看跌期权。" }, { question: "x", answer: "y" }]);
  isLd(o);
  assert.equal(o.mainEntity.length, 2);
  assert.equal(o.mainEntity[0].acceptedAnswer["@type"], "Answer");
  assert.deepEqual(faqLd([]).mainEntity, []);
  assert.deepEqual(faqLd(null).mainEntity, []);
});
t("breadcrumbLd 位置 1..n", () => {
  const o = breadcrumbLd([{ name: "Home", href: "/" }, { name: "Pivots", href: "/pivots" }]);
  isLd(o);
  assert.equal(o.itemListElement[0].position, 1);
  assert.equal(o.itemListElement[1].position, 2);
  assert.equal(o.itemListElement[1].item, "https://weacond.com/pivots");
});

// ── 序列化 ──
t("toLdString 单对象 vs 数组", () => {
  assert.equal(JSON.parse(toLdString(organizationLd()))["@type"], "Organization");
  const arr = JSON.parse(toLdString([organizationLd(), webApplicationLd()]));
  assert.ok(Array.isArray(arr) && arr.length === 2, "多对象 → 数组");
});
t("toScript 含 ld+json 且转义 '<' 防注入", () => {
  const s = toScript([{ "@type": "X", evil: "</script><b>" }]);
  assert.ok(s.includes('type="application/ld+json"'), "script 标签");
  assert.ok(!s.includes("</script><b>"), "原始 </script> 被转义");
  assert.ok(s.includes("\\u003c"), "('<') 被转义");
});
t("所有构造器产物都是合法 JSON（round-trip）", () => {
  [organizationLd(), webApplicationLd(), softwareLd({ href: "/x" }), faqLd([{ q: 1, a: 2 }]), breadcrumbLd([{ name: "a" }])].forEach((o) => {
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(o)));
  });
});
t("itemLd 列出全部工具，位置 1..n，url 正确", () => {
  const items = [
    { title: "枢轴点", titleEn: "Pivot Points", href: "/pivots" },
    { title: "凯利", titleEn: "Kelly", href: "/kelly" },
  ];
  const o = itemLd(items, "https://weacond.com/");
  assert.equal(o["@type"], "ItemList");
  assert.equal(o.numberOfItems, 2);
  assert.equal(o.itemListElement[0].position, 1);
  assert.equal(o.itemListElement[0].name, "Pivot Points", "优先用英文标题");
  assert.equal(o.itemListElement[0].url, "https://weacond.com/pivots", "尾斜杠被规整");
  assert.deepEqual(itemLd(null).itemListElement, [], "null → 空清单");
});

console.log(`\n✅ jsonLd: ${passed}/${passed} 通过`);
