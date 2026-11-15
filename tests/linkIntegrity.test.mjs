// tests/linkIntegrity.test.mjs — 交叉引用链接完整性（防回归）
//
// 站内增长最快的风险是「A 页链接到 B，但 B 不存在/已改名」。
// 本测试收集三大索引库（toolsIndex / glossary / learningPath）引用的
// 所有内部 href，断言每个都能解析到一个真实存在的 pages/<name>.js。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allToolHrefs } from "../lib/toolsIndex.js";
import { allRelatedHrefs } from "../lib/glossary.js";
import { allToolHrefs as pathHrefs } from "../lib/learningPath.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, "..", "pages");
const pages = new Set(fs.readdirSync(pagesDir).filter((f) => f.endsWith(".js")).map((f) => f.slice(0, -3)));

// 把 href 映射到 pages 文件名：/  -> index，/foo -> foo
function hrefToPage(href) {
  const clean = href.split("?")[0].split("#")[0];
  if (clean === "/" || clean === "") return "index";
  return clean.replace(/^\/+/, "");
}

function collectAll() {
  return [...new Set([...allToolHrefs(), ...allRelatedHrefs(), ...pathHrefs()])];
}

test("所有索引引用的内部 href 都解析到真实页面", () => {
  const hrefs = collectAll();
  assert.ok(hrefs.length > 0, "应收集到一些 href");
  const missing = hrefs.filter((h) => !pages.has(hrefToPage(h)));
  assert.deepEqual(missing, [], `以下 href 无对应页面: ${missing.join(", ")}`);
});

test("新特性页面（regime/stresstest/learning/glossary/performance）均已落地", () => {
  for (const r of ["regime", "stresstest", "learning", "glossary", "performance", "correlation", "montecarlo", "risk", "portfolio"]) {
    assert.ok(pages.has(r), `缺少 pages/${r}.js`);
  }
});

test("索引 href 唯一且均为合法站内路径", () => {
  const hrefs = collectAll();
  assert.equal(new Set(hrefs).size, hrefs.length, "href 去重后应一致（collectAll 已去重，做双重保险）");
  for (const h of hrefs) assert.ok(h.startsWith("/"), `非法 href: ${h}`);
});

// ── 首页精选列表守卫（防回退）──────────────────────────────────────────────
// 首页 pages/index.js 用 zh/en 两份「精选」tools 数组，不依赖 TOOLS 注册表，
// 故新增计算器易被漏同步。这里锁定两件事，防未来回退：
//   (1) 4 个新计算器 dcf/dca/purchasing-power/real-estate 同时出现在 zh+en 精选；
//   (2) 首页所有 href 都能解析到真实页面，防「A 页链 B、B 不存在」类回退。
const indexSrc = fs.readFileSync(path.join(pagesDir, "index.js"), "utf8");

test("首页精选：4 个新计算器已在 zh+en 列表（防回退）", () => {
  for (const slug of ["/dcf", "/dca", "/purchasing-power", "/real-estate"]) {
    const count = (indexSrc.match(new RegExp(`href: "${slug}"`, "g")) || []).length;
    assert.ok(count >= 2, `首页精选中 ${slug} 出现 ${count} 次，应 ≥2（zh+en 各一）`);
  }
});

test("首页精选：所有 href 都解析到真实页面", () => {
  const re = /href[:=]\s*["']\/([^"']+)["']/g;
  const found = new Set();
  let m;
  while ((m = re.exec(indexSrc)) !== null) found.add("/" + m[1]);
  assert.ok(found.size > 0, "应能从首页解析出若干 href");
  const missing = [...found].filter((h) => !pages.has(hrefToPage(h)));
  assert.deepEqual(missing, [], `首页存在无法解析的 href: ${missing.join(", ")}`);
});

// ── Navbar 导航守卫（防回退）────────────────────────────────────────────────
// Navbar 用 navItems({href, key}) + 双语 labels(zh/en)。新增计算器易只加
// navItems 而漏加翻译（或反之），导致顶栏出现 undefined 文案。这里锁定两件
// 不变式，防未来回退：
//   (1) 每个 navItems 的 key 在 labels.zh 与 labels.en 各出现一次（共 ≥2 次）；
//   (2) 4 个新计算器 dcf/dca/purchasingPower/realEstate 已接入 navItems。
const navSrc = fs.readFileSync(path.join(__dirname, "..", "components", "Navbar.js"), "utf8");

function navItemKeys(src) {
  const start = src.indexOf("const navItems = [");
  const end = src.indexOf("];", start);
  assert.ok(start >= 0 && end > start, "应能定位 navItems 数组");
  return [...src.slice(start, end).matchAll(/\bkey:\s*"([^"]+)"/g)].map((m) => m[1]);
}

test("Navbar：每个导航 key 在 zh+en 都有翻译（共 ≥2 次）", () => {
  const keys = navItemKeys(navSrc);
  assert.ok(keys.length > 10, "应解析到一批导航项 key");
  for (const k of new Set(keys)) {
    const labelCount = (navSrc.match(new RegExp(`\\b${k}:\\s*"`, "g")) || []).length;
    assert.ok(labelCount >= 2, `导航 key "${k}" 在 labels 中出现 ${labelCount} 次，应 ≥2（zh+en）`);
  }
});

test("Navbar：4 个新计算器已接入 navItems", () => {
  const keys = new Set(navItemKeys(navSrc));
  for (const k of ["dcf", "dca", "purchasingPower", "realEstate"]) {
    assert.ok(keys.has(k), `navItems 缺少新计算器 key: ${k}`);
  }
});

// ── 防回退：用户可见文案不得残留过期工具数（67 是修复前的硬编码值，现已改为随注册表动态）──
test("源码无过期硬编码工具数（67 个金融计算工具）", () => {
  const files = [
    path.join(__dirname, "..", "pages", "index.js"),
    path.join(__dirname, "..", "lib", "jsonLd.js"),
    path.join(__dirname, "..", "lib", "sitemap.js"),
  ];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    assert.ok(!src.includes("67 个金融计算工具"), `${f} 残留过期 '67 个金融计算工具'，应改为动态 ${allToolHrefs().length}`);
  }
});
