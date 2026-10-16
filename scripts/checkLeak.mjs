/**
 * checkLeak.js — 本地“内容泄漏”守卫（npm run build 前的 prebuild 钩子）
 *
 * 目的：防止付费书的【全文】或二进制文件出现在会被公开部署的 public/ 目录，
 *       造成“上传到公开桶 → 全文泄露 → 退款 + 品牌损失”的隐患。
 *
 * 规则（任一命中即 FAIL，退出码 1，阻断构建）：
 *   1. public/ 下出现任何 *.pdf / *.epub / *.mobi；
 *   2. public/ebooks/ 下出现 preview/ 与 index.json 之外的文件；
 *   3. 任一 public/ebooks/preview/*.md 超过 30KB（预览应很短）。
 *
 * 这是本地守卫；生产侧另有一道 GitHub Actions 熔断（见 .github/workflows/deploy.yml）。
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, "..", "public");

const BINARY = /\.(pdf|epub|mobi)$/i;
const MAX_PREVIEW_BYTES = 30 * 1024;

const problems = [];
const warnings = [];

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

// 规则 1 + 3：遍历 public/ 全目录
walk(PUBLIC, (full) => {
  if (BINARY.test(full)) problems.push(`[二进制] public/ 下出现文件：${path.relative(PUBLIC, full)}`);
  if (full.startsWith(path.join(PUBLIC, "ebooks", "preview")) && full.endsWith(".md")) {
    const size = fs.statSync(full).size;
    if (size > MAX_PREVIEW_BYTES) {
      warnings.push(`[预览过大] ${path.relative(PUBLIC, full)} = ${size} bytes（> 30KB，疑似塞了全文）`);
    }
  }
});

// 规则 2：public/ebooks/ 只允许 index.json 与 preview/*.md；
//          其它子目录若含文件即阻断（疑似付费全文泄漏），空目录仅警告。
const ebooksDir = path.join(PUBLIC, "ebooks");
if (fs.existsSync(ebooksDir)) {
  const allowed = (rel) => rel === "index.json" || /^preview\/[^/]+\.md$/.test(rel);
  const dirHasFile = (dir) => {
    for (const c of fs.readdirSync(dir, { withFileTypes: true })) {
      if (c.isDirectory()) { if (dirHasFile(path.join(dir, c.name))) return true; }
      else return true;
    }
    return false;
  };
  for (const e of fs.readdirSync(ebooksDir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name === "preview") continue;
      if (dirHasFile(path.join(ebooksDir, e.name)))
        problems.push(`[越界目录] public/ebooks/${e.name}/（含文件，疑似付费全文泄漏）`);
      else warnings.push(`[空目录] public/ebooks/${e.name}/（无害，建议删除）`);
      continue;
    }
    if (!allowed(e.name)) problems.push(`[越界文件] public/ebooks/${e.name}（只允许 index.json）`);
  }
}

if (warnings.length) {
  console.warn("⚠️  警告（不阻断）：");
  warnings.forEach((w) => console.warn("  - " + w));
}
if (problems.length) {
  console.error("❌ 内容泄漏守卫失败，已阻止构建：");
  problems.forEach((p) => console.error("  - " + p));
  process.exit(1);
}
console.log("✓ 内容泄漏守卫通过：public/ 未发现全文或二进制。");