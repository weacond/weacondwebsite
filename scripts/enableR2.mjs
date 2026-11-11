// scripts/enableR2.mjs — 一条命令创建 Cloudflare R2 双桶（解锁电子书销售）
//
// 背景（见 wrangler.toml 注释）：
//   R2 绑定 weacond-public / weacond-private 之前没在 Cloudflare 账号里建出来，
//   导致 next-on-pages 生成的 worker 初始化失败、所有 /api/* 路由 500/503。
//   本脚本用 Cloudflare R2 REST API 把两个桶建好，并对公开桶开启 Public Access。
//
// 干的事（两个桶，与 wrangler.toml / lib/r2.js / uploadR2.mjs 完全一致）：
//   公开桶 weacond-public  ← 预览、封面、index.json（任何人可访问）
//   私有桶 weacond-private ← 全书正文/PDF/EPUB（不开 Public Access，走签名 URL）
//
// 用法：
//   1) 在 .env.local 填好（或 shell 里 export）：
//        CLOUDFLARE_API_TOKEN = <你的 Cloudflare API Token>  （或 R2_API_TOKEN）
//        CLOUDFLARE_ACCOUNT_ID= <你的 Cloudflare 账号 ID>      （或 R2_ACCOUNT_ID）
//      取 token：Dashboard → My Profile → API Tokens → “Create token” →
//      选 “Edit Cloudflare Workers” 模板（含 R2 写权限），或自定义 R2 Read & Write。
//      账号 ID：Dashboard 右上角 → “Account ID”。
//   2) 预演（只打印将要做什么，不真调用 API）：
//        node scripts/enableR2.mjs --dry
//   3) 真正创建（幂等：已存在的桶跳过，不会重复建）：
//        node scripts/enableR2.mjs
//
// 桶名可用环境变量覆盖：R2_PUBLIC_BUCKET / R2_PRIVATE_BUCKET（默认 weacond-public / weacond-private）。
// 完成后：把 R2_PUBLIC_URL 等填进 .env.local + GitHub Secrets，并在 wrangler.toml 取消 R2 绑定注释，
// 然后 `node scripts/uploadR2.mjs` 上传内容、`git push` 触发 CI 发布。

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DRY = process.argv.includes("--dry");

// ---- 读取配置：环境变量优先，其次解析 .env.local ----
function loadEnvLocal() {
  const p = join(ROOT, ".env.local");
  const out = {};
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return out;
}
const env = { ...loadEnvLocal(), ...process.env };

const TOKEN = env.CLOUDFLARE_API_TOKEN || env.R2_API_TOKEN;
const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID || env.R2_ACCOUNT_ID;
const PUBLIC_BUCKET = env.R2_PUBLIC_BUCKET || "weacond-public";
const PRIVATE_BUCKET = env.R2_PRIVATE_BUCKET || "weacond-private";
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID || "{account}"}`;

function fail(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}
// 识别“未填 / 占位符 / 含非 ASCII”：避免把中文占位符当真实密钥发进 HTTP 头（会触发 ByteString 报错）
const PLACEHOLDER = /your|xxxx|placeholder|todo|示例|粘贴|你的|sample|\$<|<\w+>|\[\w+\]/i;
function looksUnset(v) {
  return !v || PLACEHOLDER.test(v) || /[^\x00-\x7f]/.test(v);
}
if (!DRY && (looksUnset(ACCOUNT_ID) || looksUnset(TOKEN))) {
  fail("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN 未填或仍是占位符（含中文）。\n" +
    "  请在 .env.local 填真实值，或在 shell 里 export 后重试。\n" +
    "  · API Token：Dashboard → My Profile → API Tokens → Create token（Edit Cloudflare Workers 模板，含 R2 写权限）\n" +
    "  · 账号 ID：Dashboard 右上角 → Account ID\n" +
    "  （想先看流程：node scripts/enableR2.mjs --dry）");
}

// 幂等：GET 已存在的桶名集合
async function listBuckets() {
  const res = await fetch(`${API}/r2/buckets`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`list buckets 失败 ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const names = new Set((json.result || []).map((b) => b.name));
  return names;
}

// 创建桶（幂等）：已存在则跳过
async function ensureBucket(bucket, existing) {
  if (existing.has(bucket)) {
    console.log(`  ✓ 已存在，跳过：${bucket}`);
    return;
  }
  const res = await fetch(`${API}/r2/buckets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: bucket }),
  });
  const text = await res.text();
  if (res.ok) {
    console.log(`  ✓ 已创建：${bucket}`);
    return;
  }
  // 409 = 并发已创建，视为成功；其余报错
  if (res.status === 409) {
    console.log(`  ✓ 已存在（并发创建），跳过：${bucket}`);
    return;
  }
  throw new Error(`创建 ${bucket} 失败 ${res.status}: ${text}`);
}

// 对某桶设置 Public Access（公开桶开、私有桶关）
async function setPublicAccess(bucket, enabled) {
  const body = enabled
    ? JSON.stringify({ enabled: true, type: "cloudflare" }) // 自动分配 .r2.cloudflarestorage.com 域名
    : JSON.stringify({ enabled: false });
  const res = await fetch(`${API}/r2/buckets/${encodeURIComponent(bucket)}/public-buckets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body,
  });
  const text = await res.text();
  if (res.ok) {
    try {
      const j = JSON.parse(text);
      const url = j.result && (j.result.url || (j.result.public_bucket && j.result.public_bucket.url));
      console.log(`  ✓ ${bucket} 公共访问 ${enabled ? "已开启" : "已关闭"}${url ? "  →  " + url : ""}`);
    } catch {
      console.log(`  ✓ ${bucket} 公共访问 ${enabled ? "已开启" : "已关闭"}`);
    }
    return;
  }
  // 部分账号/计划可能不支持该接口：降级为提示，不阻断
  console.warn(`  ⚠ ${bucket} 设置公共访问未成功（${res.status}）：${text.slice(0, 160)}\n` +
    `      请到 Dashboard → R2 → 该桶 → “Public access” 手动 ${enabled ? "开启" : "关闭"}。`);
}

async function main() {
  console.log(`\n=== R2 双桶创建${DRY ? "（预演，不真调用 API）" : ""} ===`);
  console.log(`账号：${ACCOUNT_ID || "<未设置 CLOUDFLARE_ACCOUNT_ID>"}`);
  console.log(`公开桶：${PUBLIC_BUCKET}    私有桶：${PRIVATE_BUCKET}\n`);

  if (DRY) {
    console.log("将执行：");
    console.log(`  1) GET  列出已有桶，跳过已存在的`);
    console.log(`  2) POST 创建 ${PUBLIC_BUCKET}（不存在时）`);
    console.log(`  3) POST 创建 ${PRIVATE_BUCKET}（不存在时）`);
    console.log(`  4) POST 开启 ${PUBLIC_BUCKET} 公共访问`);
    console.log(`  5) POST 关闭 ${PRIVATE_BUCKET} 公共访问（确保正文不可公开访问）`);
    console.log(`\n去掉 --dry 真正执行： node scripts/enableR2.mjs`);
    return;
  }

  const existing = await listBuckets();
  console.log(`【列出已有桶】共 ${existing.size} 个：${[...existing].join(", ") || "（空）"}\n`);

  console.log("【创建桶（幂等）】");
  await ensureBucket(PUBLIC_BUCKET, existing);
  await ensureBucket(PRIVATE_BUCKET, existing);

  console.log("\n【设置公共访问】");
  await setPublicAccess(PUBLIC_BUCKET, true);
  await setPublicAccess(PRIVATE_BUCKET, false);

  console.log(`\n=== 完成 ===`);
  console.log("下一步（按顺序）：");
  console.log(`  1) 把 R2_PUBLIC_URL 填进 .env.local：${PUBLIC_BUCKET}.r2.cloudflarestorage.com`);
  console.log(`     （或去 Dashboard → R2 → ${PUBLIC_BUCKET} 复制它分配的公共域名）`);
  console.log("  2) 在 wrangler.toml 取消 [[r2_buckets]] 两段绑定的注释。");
  console.log("  3) 把 R2_PUBLIC_URL / R2_ACCOUNT_ID / R2_API_TOKEN 填进 GitHub Secrets。");
  console.log("  4) 上传内容：node scripts/uploadR2.mjs --dry  预演后去掉 --dry 真传。");
  console.log("  5) git push origin main 触发 CI 发布 + 同步 R2。");
}

main().catch((e) => fail(e.message));
