/**
 * 客户端订阅助手 — 把"订阅"按钮接到 Stripe 订阅 Checkout。
 * 用法：import { subscribe } from "../lib/subscribeClient";
 *       <button onClick={() => subscribe("putseller", "month")} />
 *
 * 流程：取邮箱（登录态 Supabase session → localStorage → 弹窗询问）
 *       → POST /api/subscribe → 拿到 Stripe URL → 跳转。
 *       Stripe 会再次核对邮箱；首次扣款成功触发 /api/checkout/webhook 写库。
 *
 * 仅在前端运行；未配 Supabase 时 getSupabaseClient 返回 null，
 * 自动降级到弹窗询问邮箱，因此本地未配后端也能跑通订阅演示。
 */

import { getSupabaseClient } from "./supabase.js";

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
      ? "Enter the email to start your subscription (it will be billed to this address):"
      : "请输入接收订阅的邮箱（账单将发到此地址）：";
  const email = window.prompt(label, "");
  if (!email) return null;
  return email.trim().toLowerCase();
}

/**
 * 发起订阅
 * @param {string} plan        方案 key（basic / putseller / proquant）
 * @param {string} [interval]  "month" | "year"，缺省 "month"
 * @param {string} [lang]      "zh" | "en"，缺省读 localStorage / "zh"
 * @returns {Promise<boolean>}  是否成功发起跳转
 */
export async function subscribe(plan, interval = "month", lang = "zh") {
  if (!plan) return false;
  const iv = interval === "year" ? "year" : "month";
  const l =
    (typeof window !== "undefined" && localStorage.getItem("weacond_lang")) || lang || "zh";

  const email = await resolveEmail(l);
  if (!email) {
    if (typeof window !== "undefined")
      alert(l === "en" ? "Subscription cancelled." : "已取消订阅。");
    return false;
  }

  try {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, interval: iv, email }),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error || (l === "en" ? "Subscription failed" : "创建订阅失败");
      alert(
        (l === "en" ? "Subscription error: " : "订阅错误：") + msg + " (HTTP " + res.status + ")",
      );
      return false;
    }

    const { url } = await res.json();
    if (!url) {
      alert(l === "en" ? "No checkout URL returned." : "未返回支付链接。");
      return false;
    }
    window.location.href = url;
    return true;
  } catch (e) {
    alert((l === "en" ? "Network error: " : "网络错误：") + (e && e.message ? e.message : e));
    return false;
  }
}
