// R2 同步脚本 — 验证 public/ebooks/ 是否同步到 Cloudflare R2
// 用法：node scripts/syncR2.js

import { r2Url } from "../lib/r2.js";

// 验证 R2 配置
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_API_TOKEN = process.env.R2_API_TOKEN;
const R2_BUCKET = process.env.R2_BUCKET_NAME || "weacond-ebooks";

if (!R2_PUBLIC_URL || !R2_ACCOUNT_ID || !R2_API_TOKEN) {
  console.error("Missing R2 env vars. Check .env.example");
  process.exit(1);
}

// 验证索引文件可访问
async function main() {
  try {
    // r2Url returns a string (sync)
    const indexUrl = r2Url("ebooks/index.json");
    const res = await fetch(indexUrl);
    if (res.ok) {
      const index = await res.json();
      console.log(`✓ R2 index accessible: ${index.length} books found`);
      // 验证每本书的 content 文件
      for (const book of index) {
        if (book.content) {
          const contentUrl = r2Url(book.content);
          const contentRes = await fetch(contentUrl);
          if (contentRes.ok) {
            console.log(`  ✓ ${book.slug}: content OK`);
          } else {
            console.warn(`  ⚠ ${book.slug}: content not found (${contentRes.status})`);
          }
        }
      }
    } else {
      console.warn(`⚠ R2 index returned ${res.status}`);
    }
  } catch (err) {
    console.error("R2 check failed:", err.message);
  }

  console.log("✓ R2 sync verification complete");
}

main();