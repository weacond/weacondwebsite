// Stripe Webhook — 处理支付事件并记录到 Supabase
// 事件: checkout.session.completed
//
// 购买记录写入 purchases 表（按 email 去重，唯一索引 email+book_slug）
// 套装逻辑：is_bundle=true 时，写入 bundle-all + 全部 25 本书 slug

import { getStripe, BOOK_CATALOG } from "../../../lib/stripe";
import { getSupabaseServiceClient } from "../../../lib/supabase";

const BUNDLE_SLUG = "bundle-all";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "Stripe not configured" });
  }

  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
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