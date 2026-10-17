/**
 * Cloudflare R2 — 双桶架构
 *
 * 公开桶 weacond-public: 预览、封面、index.json（任何人可访问）
 * 私有桶 weacond-private: 完整内容、PDF/EPUB（需签名 URL）
 *
 * 环境变量：
 *   R2_PUBLIC_URL       — 公开桶 URL（构建时注入）
 *   R2_ACCOUNT_ID       — Cloudflare 账号 ID（运行时）
 *   R2_API_TOKEN        — R2 API Token（运行时，仅服务端）
 *   R2_PRIVATE_BUCKET   — 私有桶名（默认 weacond-private）
 */

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://weacond-public.r2.cloudflarestorage.com";
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_API_TOKEN = process.env.R2_API_TOKEN;
const R2_PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET || "weacond-private";

/* ========== 公开读取 ========== */

// 归一化字段：统一 price（美元，来自 price_cents）、desc_cn/number，
// 让所有消费方（ebooks.js / [slug].js / ebookStore.js）用 .price 即可。
function normalizeBook(b, i) {
  return {
    ...b,
    price: b.price_cents != null ? b.price_cents / 100 : Number(b.price || 0),
    desc_cn: b.desc_cn || b.desc || b.title_cn || "",
    desc: b.desc || b.desc_cn || b.title_en || "",
    number: b.number != null ? b.number : i + 1,
  };
}

/**
 * 拉取书籍目录 index.json。
 * 策略：本地打包目录优先（public/ebooks/index.json，构建期永远可用，保证书列表/详情永不空白），
 * R2 公开桶作为线上覆盖（有则用线上数据，无/拉不到则用本地）。
 * 注意：Edge 运行时无 Node fs，自动跳过本地读取，仅走 R2。
 */
export async function fetchEbookIndex() {
  // 1. 本地打包目录（仅 Node/构建期；Edge 运行时跳过）
  if (!process.env.EDGE_RUNTIME) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const localPath = path.join(process.cwd(), "public", "ebooks", "index.json");
      if (fs.existsSync(localPath)) {
        const raw = JSON.parse(fs.readFileSync(localPath, "utf-8"));
        if (Array.isArray(raw) && raw.length) {
          const local = raw.map(normalizeBook);
          // 尝试用 R2 线上数据覆盖（R2 正常时用线上，异常时保留本地）
          try {
            const res = await fetch(`${R2_PUBLIC_URL}/index.json`, {
              headers: { "Cache-Control": "no-cache" },
            });
            if (res.ok) {
              const r2 = await res.json();
              if (Array.isArray(r2) && r2.length) {
                console.log(`Using R2 index (${r2.length} books)`);
                return r2.map(normalizeBook);
              }
            }
          } catch (e) {
            console.warn("R2 index override skipped:", e.message);
          }
          console.warn(`Using local fallback public/ebooks/index.json (${local.length} books)`);
          return local;
        }
      }
    } catch (err) {
      console.error("Local index read failed:", err.message);
    }
  }

  // 2. 仅 R2 公开桶（Edge 运行时，或本地无文件时）
  try {
    const res = await fetch(`${R2_PUBLIC_URL}/index.json`, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const raw = await res.json();
      if (Array.isArray(raw)) return raw.map(normalizeBook);
    } else {
      console.error(`R2 index ${res.status}`);
    }
  } catch (err) {
    console.error("R2 index error:", err.message);
  }
  return [];
}

/** 公开资源 URL（封面、预览等） */
export function publicUrl(key) {
  return `${R2_PUBLIC_URL}/${key}`;
}

/** 拉取单本电子书正文（公开桶的预览） */
export async function fetchEbookContent(slug) {
  try {
    const index = await fetchEbookIndex();
    const book = index.find((b) => b.slug === slug);
    if (!book || !book.preview) return null;
    const res = await fetch(publicUrl(book.preview), {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    return markdownToBlocks(await res.text());
  } catch (err) {
    console.error("R2 preview fetch error:", err.message);
    return null;
  }
}

/* ========== 私有读取（需 R2 API Token） ========== */

/** 生成私有文件的签名 URL（默认 1 小时有效） */
export async function generateSignedUrl(key, expirySeconds = 3600) {
  if (!R2_ACCOUNT_ID || !R2_API_TOKEN) {
    console.warn("R2 credentials missing, returning public URL fallback");
    return `${R2_PUBLIC_URL}/${key}`;
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_PRIVATE_BUCKET}/objects/${encodeURIComponent(key)}/presign`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${R2_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiry: expirySeconds, method: "GET" }),
    });
    if (!res.ok) { console.warn(`R2 presign ${res.status}`); return null; }
    const data = await res.json();
    return data.result?.url || null;
  } catch (err) {
    console.error("R2 presign error:", err.message);
    return null;
  }
}

/** 从私有桶读取完整内容（服务端，付费验证后调用） */
export async function fetchPrivateContent(key) {
  if (!R2_ACCOUNT_ID || !R2_API_TOKEN) {
    throw new Error("R2 credentials not configured");
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_PRIVATE_BUCKET}/objects/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${R2_API_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`R2 fetch ${key} failed: ${res.status}`);
  }
  return await res.text();
}

/* ========== 写入（服务端） ========== */

/** 上传到私有桶 */
export async function uploadPrivate(key, body, contentType = "application/octet-stream") {
  if (!R2_ACCOUNT_ID || !R2_API_TOKEN) return false;
  const url = `https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_PRIVATE_BUCKET}/objects/${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${R2_API_TOKEN}`, "Content-Type": contentType },
      body,
    });
    if (!res.ok) { console.error(`R2 upload ${res.status}`); return false; }
    console.log(`✓ R2 upload: ${key}`);
    return true;
  } catch (err) {
    console.error("R2 upload error:", err.message);
    return false;
  }
}

/* ========== Markdown 解析 ========== */

export function markdownToBlocks(md) {
  const lines = md.split("\n");
  const blocks = [];
  let inCode = false;
  let codeBuffer = [];
  let paragraphBuffer = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      blocks.push({ type: "paragraph", text: paragraphBuffer.join(" ").trim() });
      paragraphBuffer = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", text: codeBuffer.join("\n") });
        codeBuffer = []; inCode = false;
      } else { flushParagraph(); inCode = true; }
      continue;
    }
    if (inCode) { codeBuffer.push(line); continue; }
    if (line.startsWith("### ")) { flushParagraph(); blocks.push({ type: "h3", text: line.slice(4) }); }
    else if (line.startsWith("## ")) { flushParagraph(); blocks.push({ type: "h2", text: line.slice(3) }); }
    else if (line.startsWith("# ")) { flushParagraph(); blocks.push({ type: "h1", text: line.slice(2) }); }
    else if (line.startsWith("> ")) { flushParagraph(); blocks.push({ type: "quote", text: line.slice(2) }); }
    else if (line.startsWith("- ") || line.startsWith("* ")) { flushParagraph(); blocks.push({ type: "list_item", text: line.slice(2) }); }
    else if (line.trim() === "") { flushParagraph(); }
    else { paragraphBuffer.push(line.trim()); }
  }
  if (inCode) { blocks.push({ type: "code", text: codeBuffer.join("\n") }); }
  flushParagraph();
  return blocks;
}