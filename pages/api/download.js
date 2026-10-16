export const runtime = "edge";

// GET /api/download?slug=xxx&format=pdf
// 验证用户购买记录，返回 R2 签名 URL 或重定向
// 需要 Cookie 中的 Supabase access token 或 query param email

import { getSupabaseServiceClient } from "../../lib/supabase.js";
import { getDownloadUrl, isFreeBook } from "../../lib/ebookStore.js";

// 从 cookie 的 Supabase access token 解析出【真实邮箱】；取不到退回 query.email（仅本地调试）
async function resolveEmail(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/sb-access-token=([^;]+)/);
  if (match) {
    try {
      const supabase = getSupabaseServiceClient();
      if (supabase) {
        // 关键：用 auth.getUser 验证 token 并取出 email，而不是把 JWT 当 email
        const { data, error } = await supabase.auth.getUser(match[1]);
        if (!error && data?.user?.email) return data.user.email;
      }
    } catch (e) {
      console.warn("resolveEmail via token failed:", e.message);
    }
  }
  // 生产环境（已配 SUPABASE_SERVICE_ROLE_KEY）绝不信任 URL 里的 ?email=，
  // 否则付费下载可被 "?email=已付款邮箱" 白嫖；仅本地未配 Supabase 时才退回 query.email 方便调试
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return req.query.email || null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug, format = "pdf" } = req.query;
  if (!slug) {
    return res.status(400).json({ error: "Missing slug parameter" });
  }

  // 从 cookie 的 Supabase token 解析真实邮箱（见文件顶部 resolveEmail）
  const userEmail = await resolveEmail(req);

  if (!userEmail) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "请先登录后再下载",
    });
  }

  try {
    const url = await getDownloadUrl(userEmail, slug, format);
    if (!url) {
      return res.status(403).json({
        error: "Forbidden",
        message: "未购买此书或购买记录不存在",
      });
    }

    // 重定向到 R2 签名 URL
    res.redirect(302, url);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
}