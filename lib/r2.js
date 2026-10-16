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

/** 从公开桶拉取 index.json（书籍目录），并归一化字段 */
export async function fetchEbookIndex() {
  try {
    const res = await fetch(`${R2_PUBLIC_URL}/index.json`, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) { console.error(`R2 index ${res.status}`); return []; }
    const raw = await res.json();
    if (!Array.isArray(raw)) return [];
    // 归一化：统一 price（美元，来自 price_cents）、desc_cn/number 等，
    // 让所有消费方（ebooks.js / [slug].js / ebookStore.js）用 .price 即可
    return raw.map((b, i) => ({
      ...b,
      price: b.price_cents != null ? b.price_cents / 100 : Number(b.price || 0),
      desc_cn: b.desc_cn || b.desc || b.title_cn || "",
      desc: b.desc || b.desc_cn || b.title_en || "",
      number: b.number != null ? b.number : i + 1,
    }));
  } catch (err) {
    console.error("R2 index error:", err.message);
    return [];
  }
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