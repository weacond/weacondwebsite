// GET /api/purchases  — 返回当前用户已购书籍 slug 列表（服务端真实来源）
//
// 安全设计：
//   - 优先用 cookie 里的 Supabase access token 验证得到真实 email；
//   - query.email 仅作本地调试 fallback（生产可移除）；
//   - 用 service_role 客户端查询 purchases（绕过 RLS，
//     因为 RLS 已禁止 anon 直接读 purchases，避免隐私泄漏）。
//
// 用法：浏览器 fetch("/api/purchases", { credentials: "include" })
// 返回：{ email, slugs: ["equity-pricing", "bundle-all", ...] }

import { getSupabaseServiceClient } from "../../lib/supabase.js";

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
  // 生产环境（已配 SUPABASE_SERVICE_ROLE_KEY）绝不信任 URL 里的 ?email=，
  // 否则已购列表可被 "?email=已付款邮箱" 窥探；仅本地未配 Supabase 时才退回 query.email 方便调试
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return req.query.email || null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed", slugs: [] });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    // Supabase 未配置：返回空列表，前端降级到 localStorage 演示
    return res.status(200).json({ email: null, slugs: [], dev: true });
  }

  const email = await resolveEmail(req);
  if (!email) {
    return res.status(401).json({ error: "Unauthorized", slugs: [] });
  }

  try {
    const { data, error } = await supabase
      .from("purchases")
      .select("book_slug")
      .eq("email", email);
    if (error) {
      console.error("purchases query error:", error.message);
      return res.status(500).json({ error: "DB error", slugs: [] });
    }
    const slugs = (data || []).map((r) => r.book_slug).filter(Boolean);
    res.status(200).json({ email, slugs });
  } catch (e) {
    console.error("purchases handler error:", e);
    res.status(500).json({ error: "Internal error", slugs: [] });
  }
}