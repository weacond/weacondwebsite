export const runtime = "edge";

// Stripe Checkout 创建接口
// POST /api/checkout  { bookSlug: "equity-pricing" | "bundle-all", email: "user@example.com" }
// 返回 Stripe Checkout Session URL
//
// 动态定价：价格直接来自 lib/stripe.js 的 BOOK_CATALOG / BUNDLE，
// 不需要在 Stripe 后台预先创建 22 个产品。

import { createCheckoutSession } from "../../lib/stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: "Stripe not configured" });
  }

  const { bookSlug, email } = req.body || {};
  if (!bookSlug || !email) {
    return res.status(400).json({ error: "Missing bookSlug or email" });
  }

  try {
    const session = await createCheckoutSession(bookSlug, email);
    res.status(200).json({ url: session.url });
  } catch (err) {
    const detail = err && err.message ? err.message : String(err);
    console.error("Stripe checkout error:", detail);
    // 临时返回真实错误便于排查（生产上线前可去掉 detail 字段）
    res.status(500).json({ error: "Checkout failed", detail, hasKey: !!process.env.STRIPE_SECRET_KEY });
  }
}