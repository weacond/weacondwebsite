export const runtime = "edge";

// GET /api/subscription-status — 返回当前用户的【有效订阅】列表（status ∈ active/trialing）
//
// 镜像 /api/purchases.js（安全设计同款），消费 lib/ebookStore.js 的 getUserSubscriptions
// （其内部用 isSubscriptionActive 过滤，canceled/past_due 一律排除）。
//
// 安全设计（与 /api/purchases 一致）：
//   - 优先用 cookie 里的 Supabase access token 验证得到真实 email；
//   - query.email 仅作本地调试 fallback（生产绝不信任，否则可被 ?email= 窥探）；
//   - 用 service_role 客户端查询（绕过 RLS，因 subscriptions 表已禁止 anon 直读）。
//
// 用法：浏览器 fetch("/api/subscription-status", { credentials: "include" })
// 返回：{ email, plans: ["putseller", "proquant", ...] }（仅有效订阅；无则 []）

import { getSupabaseServiceClient } from "../../lib/supabase.js";
import { getUserSubscriptions } from "../../lib/ebookStore.js";

// 与 /api/purchases.js 的 resolveEmail 同款：token 优先，生产不信 query.email。
async function resolveEmail(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/sb-access-token=([^;]+)/);
  if (match) {
    try {
      const supabase = getSupabaseServiceClient();
      if (supabase) {
        const { data, error } = await supabase.auth.getUser(match[1]);
        if (!error && data?.user?.email) return data.user.email;
      }
    } catch (e) {
      console.warn("resolveEmail via token failed:", e.message);
    }
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return req.query.email || null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed", plans: [] });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    // Supabase 未配置：返回空列表，前端降级到 localStorage 演示
    return res.status(200).json({ email: null, plans: [], dev: true });
  }

  const email = await resolveEmail(req);
  if (!email) {
    return res.status(401).json({ error: "Unauthorized", plans: [] });
  }

  try {
    // getUserSubscriptions 已按 isSubscriptionActive 过滤，仅返回有效订阅
    const subs = await getUserSubscriptions(email);
    const plans = [...new Set(subs.map((r) => r.plan).filter(Boolean))];
    res.status(200).json({ email, plans, subscriptions: subs });
  } catch (e) {
    console.error("subscription-status handler error:", e);
    res.status(500).json({ error: "Internal error", plans: [] });
  }
}
