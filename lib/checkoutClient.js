/**
 * 客户端购买助手 — 把"购买"按钮接到 Stripe Checkout
 * 用法：import { buyBook } from "../../lib/checkoutClient";
 *       <button onClick={() => buyBook("equity-pricing")} />
 *
 * 流程：取邮箱（优先登录态 Supabase session，否则弹窗询问）
 *       → POST /api/checkout → 拿到 Stripe URL → 跳转。
 *       Stripe 会再次核对邮箱，webhook 负责写入 Supabase purchases。
 *
 * 注意：本文件仅在前端运行；导入的 getSupabaseClient 未配置时会返回 null，
 *       自动降级到弹窗询问邮箱，因此本地未配 Supabase 也能跑通购买演示。
 */

import { getSupabaseClient } from "./supabase";

async function resolveEmail(lang) {
  // 1. 登录态：Supabase session（已登录用户）
  try {
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client.auth.getSession();
      if (data?.session?.user?.email) return data.session.user.email;
    }
  } catch {}

  // 2. 本地降级：localStorage 里的 weacond_user
  try {
    const raw = localStorage.getItem("weacond_user");
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.email) return String(u.email).trim().toLowerCase();
    }
  } catch {}

  // 3. 询问用户（Stripe 也会再核一次邮箱）
  const label =
    lang === "en"
      ? "Enter the email to receive this book (purchase will be tied to it):"
      : "请输入接收本书的邮箱（购买将绑定此邮箱）：";
  const email = window.prompt(label, "");
  if (!email) return null;
  return email.trim().toLowerCase();
}

/**
 * 发起购买
 * @param {string} slug        书籍 slug 或 "bundle-all"
 * @param {{ titleCn?:string, titleEn?:string }} [meta]
 * @returns {Promise<boolean>}  是否成功发起跳转
 */
export async function buyBook(slug, meta = {}) {
  if (!slug) return false;
  const lang =
    (typeof window !== "undefined" && localStorage.getItem("weacond_lang")) || "zh";

  const email = await resolveEmail(lang);
  if (!email) {
    if (typeof window !== "undefined")
      alert(lang === "en" ? "Purchase cancelled." : "已取消购买。");
    return false;
  }

  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookSlug: slug, email }),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error || (lang === "en" ? "Checkout failed" : "创建支付失败");
      alert(
        (lang === "en" ? "Payment error: " : "支付错误：") + msg + " (HTTP " + res.status + ")",
      );
      return false;
    }

    const { url } = await res.json();
    if (!url) {
      alert(lang === "en" ? "No checkout URL returned." : "未返回支付链接。");
      return false;
    }
    window.location.href = url;
    return true;
  } catch (e) {
    alert((lang === "en" ? "Network error: " : "网络错误：") + (e && e.message ? e.message : e));
    return false;
  }
}