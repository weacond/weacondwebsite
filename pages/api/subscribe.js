export const runtime = "edge";

// Stripe 订阅 Checkout 创建接口
// POST /api/subscribe  { plan: "basic" | "putseller" | "proquant", interval: "month" | "year", email: "..." }
// 返回 Stripe Checkout Session URL。动态定价来自 lib/stripe.js 的 PLAN_CATALOG，无需后台建产品。
//
// 守护顺序（与 /api/checkout 一致，network-free）：
//   非 POST        → 405
//   未配 Stripe    → 503 "Stripe not configured"
//   缺 plan/email  → 400 "Missing plan or email"
//   方案不可订阅   → 400 "Invalid plan"（free / enterprise / 未知 —— 绝不发起支付）

import { createSubscriptionSession, isSubscribable } from "../../lib/stripe.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: "Stripe not configured" });
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    body = {};
  }
  const { plan, interval, email } = body;
  if (!plan || !email) {
    return res.status(400).json({ error: "Missing plan or email" });
  }
  if (!isSubscribable(plan)) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const iv = interval === "year" ? "year" : "month";
  try {
    const session = await createSubscriptionSession(plan, email, iv);
    res.status(200).json({ url: session.url });
  } catch (err) {
    const detail = err && err.message ? err.message : String(err);
    console.error("Stripe subscription error:", detail);
    res.status(500).json({ error: "Subscription failed", detail });
  }
}
