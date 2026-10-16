export const runtime = "edge";

// Stripe Webhook — 处理支付事件并记录到 Supabase
// 事件: checkout.session.completed
//
// 购买记录写入 purchases 表（按 email 去重，唯一索引 email+book_slug）
// 套装逻辑：is_bundle=true 时，写入 bundle-all + 全部 25 本书 slug

import { BOOK_CATALOG } from "../../../lib/stripe";
import { getSupabaseServiceClient } from "../../../lib/supabase";

const BUNDLE_SLUG = "bundle-all";

/**
 * Stripe Webhook 验签（Edge 兼容版，用 Web Crypto 的 HMAC-SHA256 实现）。
 * 等价于 Stripe Node SDK 的 webhooks.constructEvent，但无需 Node 运行时。
 * 参考官方算法：https://stripe.com/docs/webhooks/verify-signature
 */
async function verifyStripeWebhook(rawBody, signatureHeader, secret) {
  if (!signatureHeader) throw new Error("Missing stripe-signature header");

  const parts = {};
  for (const pair of signatureHeader.split(",")) {
    const [k, v] = pair.split("=");
    if (k) parts[k.trim()] = v.trim();
  }
  const timestamp = parts["t"];
  const signatureHash = parts["v1"];
  if (!timestamp || !signatureHash) throw new Error("Malformed stripe-signature");

  // 防重放：拒绝时间戳超过 5 分钟的请求
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (Number.isNaN(timestamp) || ageSeconds > 300) {
    throw new Error("Timestamp outside tolerance window");
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${rawBody}`)
  );

  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // 恒定时间比较，避免时序攻击
  if (hex.length !== signatureHash.length) throw new Error("Signature length mismatch");
  let mismatch = 0;
  for (let i = 0; i < hex.length; i++) {
    mismatch |= hex.charCodeAt(i) ^ signatureHash.charCodeAt(i);
  }
  if (mismatch !== 0) throw new Error("Signature verification failed");

  return JSON.parse(rawBody);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "Stripe not configured" });
  }

  // Edge 运行时下 req.body 是原始请求体流，先取成字符串用于验签
  // （Stripe 要求对原始字节做 HMAC，不能是已解析的 JSON 对象）
  const rawBody = await req.text();
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = await verifyStripeWebhook(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  const supabase = getSupabaseServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const email = session.customer_email;
      const meta = session.metadata || {};
      const slug = meta.slug || "unknown";
      const isBundle = String(meta.is_bundle) === "true";
      const amountCents = parseInt(meta.amount_cents || "0", 10);

      console.log(`✓ Purchase: ${slug} (bundle=${isBundle}) for ${email} — $${(amountCents / 100).toFixed(2)}`);

      if (supabase) {
        // 套装：解锁全部 25 本 + 记录 bundle-all
        const slugsToWrite = isBundle
          ? [BUNDLE_SLUG, ...BOOK_CATALOG.map((b) => b.slug)]
          : [slug];

        for (const s of slugsToWrite) {
          const { error } = await supabase
            .from("purchases")
            .upsert(
              {
                email,
                book_slug: s,
                stripe_payment_id: session.payment_intent || null,
                amount_cents: s === BUNDLE_SLUG ? amountCents : (isBundle ? 0 : amountCents),
                is_bundle: isBundle && s === BUNDLE_SLUG,
                created_at: new Date().toISOString(),
              },
              { onConflict: "email,book_slug" }
            );
          if (error) console.error(`Supabase purchase write failed for ${s}:`, error.message);
        }
        console.log(`✓ Wrote ${slugsToWrite.length} purchase rows for ${email}`);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      console.log(`⚠ Payment failed for customer: ${invoice.customer}`);
      // 生产环境可在此发提醒邮件
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
}