export const runtime = "edge";

// Stripe Checkout 创建接口
// POST /api/checkout  { bookSlug: "equity-pricing" | "bundle-all", email: "user@example.com" }
// 返回 Stripe Checkout Session URL
//
// 动态定价：价格直接来自 lib/stripe.js 的 BOOK_CATALOG / BUNDLE，
// 不需要在 Stripe 后台预先创建 22 个产品。

import { createCheckoutSession } from "../../lib/stripe";

export default async function handler(req, res) {
  // 顶层防御：任何异常都返回 JSON（含诊断），避免通用 500 页掩盖真因
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
    // Edge 运行时 req.body 可能是字符串/流，安全解析
    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    } catch {
      body = {};
    }
    const { bookSlug, email } = body;
    // 诊断：揭示密钥是否注入、是否解析到参数（暂不调用 Stripe）
    return res.status(200).json({
      ok: false,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY ? String(process.env.STRIPE_SECRET_KEY).slice(0, 8) : null,
      keyLength: process.env.STRIPE_SECRET_KEY ? String(process.env.STRIPE_SECRET_KEY).length : 0,
      hasSupabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      gotBookSlug: !!bookSlug,
      gotEmail: !!email,
      note: "诊断响应，未真正调用 Stripe",
    });
  } catch (topErr) {
    res.status(500).json({
      error: "Top-level",
      detail: topErr && topErr.message ? topErr.message : String(topErr),
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    });
  }
}