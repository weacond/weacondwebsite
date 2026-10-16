// scripts/uploadR2.mjs — 一条命令把书上传到 Cloudflare R2
//
// 干的事（两个桶，和 wrangler.toml 一致）：
//   公开桶 weacond-public  ← public/ebooks/preview/*.md（第1章预览，公网可读）
//                        ← public/ebooks/index.json（目录，仅元数据，无正文）
//   私有桶 weacond-private ← private/ebooks/content/*.md（全书正文，公网读不到）
//                        ← private/ebooks/files/*.pdf  （可下载的 PDF）
//
// 用法：
//   1) 先在 .env.local 里填好（或 shell 里 export）：
//        R2_ACCOUNT_ID=你的Cloudflare账号ID
//        R2_API_TOKEN =你的R2 API Token
//        R2_PUBLIC_URL=https://weacond-public.r2.cloudflarestorage.com
//   2) 预演（只打印要传什么，不真传）：
//        node scripts/uploadR2.mjs --dry
//   3) 真传：
//        node scripts/uploadR2.mjs
//
// 桶名可用环境变量覆盖：R2_PUBLIC_BUCKET / R2_PRIVATE_BUCKET（默认 weacond-public / weacond-private）

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";

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

const ACCOUNT_ID = env.R2_ACCOUNT_ID;
const TOKEN = env.R2_API_TOKEN;
const PUBLIC_BUCKET = env.R2_PUBLIC_BUCKET || "weacond-public";
const PRIVATE_BUCKET = env.R2_PRIVATE_BUCKET || "weacond-private";

function fail(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}
if (!ACCOUNT_ID || !TOKEN) {
  fail("缺少 R2_ACCOUNT_ID / R2_API_TOKEN。请填到 .env.local 或 shell 环境变量后重试。");
}

// R2 S3 兼容 REST：PUT https://api.cloudflare.com/client/v4/accounts/{acct}/r2/buckets/{bucket}/objects/{key}
function put(bucket, key, filePath) {
  const url =
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${bucket}/objects/${encodeURIComponent(key)}`;
  return fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: readFileSync(filePath),
  });
}

const CONTENT_TYPES = {
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
};

function uploadDir(srcDir, bucket, keyPrefix, label) {
  if (!existsSync(srcDir)) {
    console.log(`⚠ 跳过（目录不存在）：${srcDir}`);
    return 0;
  }
  const files = readdirSync(srcDir).filter((f) => !f.startsWith("."));
  let ok = 0;
  for (const f of files) {
    const key = keyPrefix ? `${keyPrefix}${f}` : f;
    const ct = CONTENT_TYPES[extname(f)] || "application/octet-stream";
    if (DRY) {
      console.log(`  [dry] ${bucket}/${key}  (${ct})`);
      ok++;
      continue;
    }
    try {
      const res = await put(bucket, key, join(srcDir, f));
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      console.log(`  ✓ ${label}  ${bucket}/${key}`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${bucket}/${key} → ${e.message}`);
    }
  }
  return ok;
}

async function main() {
  console.log(`\n=== R2 上传${DRY ? "（预演，不真传）" : ""} ===`);
  console.log(`公开桶：${PUBLIC_BUCKET}    私有桶：${PRIVATE_BUCKET}\n`);

  // 1) 公开桶：预览 + 目录
  console.log("【公开桶 weacond-public】预览 + 目录");
  let n = await uploadDir(join(ROOT, "public/ebooks/preview"), PUBLIC_BUCKET, "preview/", "预览");
  // index.json 单独传（key 不带前缀）
  const idx = join(ROOT, "public/ebooks/index.json");
  if (existsSync(idx)) {
    if (DRY) {
      console.log(`  [dry] ${PUBLIC_BUCKET}/index.json`);
      n++;
    } else {
      try {
        const res = await put(PUBLIC_BUCKET, "index.json", idx);
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        console.log(`  ✓ 目录  ${PUBLIC_BUCKET}/index.json`);
        n++;
      } catch (e) {
        console.error(`  ✗ index.json → ${e.message}`);
      }
    }
  }

  // 2) 私有桶：全文 + PDF
  console.log("\n【私有桶 weacond-private】全文 + PDF（公网读不到）");
  n += await uploadDir(join(ROOT, "private/ebooks/content"), PRIVATE_BUCKET, "content/", "全文");
  n += await uploadDir(join(ROOT, "private/ebooks/files"), PRIVATE_BUCKET, "files/", "PDF");

  console.log(`\n=== 完成：${DRY ? "预演" : "上传"} ${n} 个对象 ===`);
  if (DRY) console.log("加 --dry 去掉即可真正上传： node scripts/uploadR2.mjs");
  else console.log("建议跑一次校验器： node scripts/syncR2.js");
}

main().catch((e) => fail(e.message));
