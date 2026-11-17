export const runtime = "edge";

// POST /api/manage-subscription — 为当前用户创建 Stripe Billing Portal 会话（管理/取消/升级订阅）。
//
// 流程：cookie 解析 email（同 /api/purchases）→ getUserSubscriptions 取【有效订阅】的
//       customer_id → createBillingPortalSession → 返回 { url } 供前端 window.location 跳转。
//
// 降级（绝不泄漏、绝不 500 给空壳）：
//   - 非 POST → 405；
//   - 未配 STRIPE_SECRET_KEY → 503（前端降级为「暂未开放」）；
//   - 未登录/无法解析 email → 401；
//   - 无有效订阅 → 409（没有可管理的对象，前端引导去定价页订阅）。

import { resolveEmail } from "../../lib/resolveEmail.js";
import { getUserSubscriptions } from "../../lib/ebookStore.js";
import { createBillingPortalSession } from "../../lib/stripe.js";

// 安全设计集中在 lib/resolveEmail.js：生产用 cookie token 验真实 email，绝不信任 query.email。

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", url: null });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: "Stripe not configured", url: null });
  }

  const email = await resolveEmail(req);
  if (!email) {
    return res.status(401).json({ error: "Unauthorized", url: null });
  }

  // 取用户【有效订阅】的 customer_id（§0e 落库；列名是 stripe_customer_id，见 buildSubscriptionRow /
  // subscriptions 表；无有效订阅或无 customer id → 无可管理对象）
  const subs = await getUserSubscriptions(email);
  const customerId = subs.find((s) => s && s.stripe_customer_id)?.stripe_customer_id;
  if (!customerId) {
    return res.status(409).json({ error: "No active subscription to manage", url: null });
  }

  try {
    const portal = await createBillingPortalSession(customerId);
    if (!portal || !portal.url) {
      return res.status(500).json({ error: "Portal session failed", url: null });
    }
    res.status(200).json({ url: portal.url, email });
  } catch (e) {
    console.error("manage-subscription handler error:", e);
    res.status(500).json({ error: "Internal error", url: null });
  }
}
