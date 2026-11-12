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
