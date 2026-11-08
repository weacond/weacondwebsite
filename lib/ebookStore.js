/**
 * 电子书商店 — 购买 + 下载 + 访问控制
 *
 * 数据流：
 *   用户点击购买 → Stripe Checkout → Webhook → 记录购买到 Supabase
 *   用户点击下载 → 验证购买记录 → 生成 R2 签名 URL → 返回给浏览器
 *
 * 环境变量：
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase 服务密钥（服务端）
 *   R2_ACCOUNT_ID, R2_API_TOKEN — R2 写入权限
 */

import { getSupabaseServiceClient } from "./supabase.js";
import { generateSignedUrl } from "./r2.js";

/**
 * 检查用户是否购买了某本书
 * @param {string} userEmail - 用户邮箱
 * @param {string} bookSlug - 书籍 slug
 * @returns {Promise<boolean>}
 */
export async function hasPurchased(userEmail, bookSlug) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    // 降级：免费书直接放行
    return isFreeBook(bookSlug);
  }

  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .eq("email", userEmail)
    .eq("book_slug", bookSlug)
    .single();

  if (error) return false;
  return !!data;
}

/**
 * 记录一笔购买
 * @param {string} userEmail
 * @param {string} bookSlug
 * @param {string} stripePaymentId
 */
export async function recordPurchase(userEmail, bookSlug, stripePaymentId) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    console.warn("Supabase not configured, purchase not recorded");
    return false;
  }

  const { error } = await supabase.from("purchases").insert({
    email: userEmail,
    book_slug: bookSlug,
    stripe_payment_id: stripePaymentId,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Record purchase failed:", error.message);
    return false;
  }
  console.log(`✓ Purchase recorded: ${userEmail} → ${bookSlug}`);
  return true;
}

/**
 * 获取下载 URL
 * @param {string} userEmail
 * @param {string} bookSlug
 * @param {string} format - "pdf" | "epub" | "html"
 * @returns {Promise<string|null>} 签名 URL 或 null（未购买）
 */
export async function getDownloadUrl(userEmail, bookSlug, format = "pdf", lang = "en") {
  // 归一化语言：zh/cn → 中文版(.cn.pdf)；其余 → 英文版(.pdf)
  const langKey = lang === "cn" || lang === "zh" ? "cn" : "en";
  const key =
    langKey === "cn" ? `files/${bookSlug}.cn.${format}` : `files/${bookSlug}.${format}`;

  // 免费书直接放行（isFreeBook 是 async，必须 await，否则恒为真 → 跳过购买校验）
  if (await isFreeBook(bookSlug)) {
    return getFreeBookUrl(bookSlug, format, langKey);
  }

  // 付费书验证购买
  const purchased = await hasPurchased(userEmail, bookSlug);
  if (!purchased) return null;

  // 生成 R2 签名 URL（中文取 .cn.pdf，英文取 .pdf）
  return generateSignedUrl(key, 43200); // 30天有效
}

/**
 * 免费书判断
 */
export async function isFreeBook(bookSlug) {
  try {
    const { fetchEbookIndex } = await import("./r2.js");
    const books = await fetchEbookIndex();
    const book = books.find((b) => b.slug === bookSlug);
    return book ? book.price === 0 : true;
  } catch {
    return true; // 降级放行
  }
}

/**
 * 免费书直接 URL
 */
function getFreeBookUrl(bookSlug, format, lang = "en") {
  const R2_PUBLIC_URL =
    process.env.R2_PUBLIC_URL || "https://your-bucket.r2.cloudflarestorage.com";
  const key =
    lang === "cn" ? `files/${bookSlug}.cn.${format}` : `files/${bookSlug}.${format}`;
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * 获取用户已购书单
 */
export async function getUserPurchases(userEmail) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("purchases")
    .select("book_slug, created_at")
    .eq("email", userEmail);

  return error ? [] : data.map((r) => r.book_slug);
}