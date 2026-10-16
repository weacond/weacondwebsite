export const runtime = "edge";

// GET /api/ebook-content?slug=xxx
// 返回电子书【完整正文】。安全设计（不会泄漏）：
//   - 全文永远只从【私有桶】读取（R2_API_TOKEN + 私有桶名），公开桶里只有第1章预览。
//   - 付费书：必须先在 Supabase purchases 里有记录（按 email 或 auth token 查）才返回全文。
//   - 免费书（price_cents===0，若存在）：跳过购买校验，但仍从私有桶读全文。
// 绝不在任何分支从公开桶(R2_PUBLIC_URL)读取 content/* 全文。
//
// 用法：浏览器 fetch("/api/ebook-content?slug=xxx", { credentials: "include" })

import { getBook, hasAccess, getR2Key } from "../../lib/stripe.js";
import { fetchPrivateContent } from "../../lib/r2.js";
import { getSupabaseServiceClient } from "../../lib/supabase.js";

// 从 cookie 的 sb-access-token 取 email；取不到就退回 query.email（仅本地调试用）
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
  // 否则付费内容可被 "?email=已付款邮箱" 白嫖；仅本地未配 Supabase 时才退回 query.email 方便调试
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return req.query.email || null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug } = req.query;
  if (!slug) {
    return res.status(400).json({ error: "Missing slug" });
  }

  try {
    // 1. 从内存目录找这本书（含套装）
    const book = getBook(slug);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // 2. 付费书：校验购买记录（免费书跳过）
    const isFree = book.price_cents === 0 || !book.price_cents;
    const supabase = getSupabaseServiceClient();

    if (!isFree && supabase) {
      const email = await resolveEmail(req);
      if (!email) {
        return res.status(401).json({ error: "请先登录", slug });
      }
      // 拉该用户名下所有已购 slug，交给 hasAccess 处理套装逻辑
      const { data } = await supabase
        .from("purchases")
        .select("book_slug")
        .eq("email", email);
      const owned = (data || []).map((r) => r.book_slug);
      if (!hasAccess(owned, slug)) {
        return res.status(403).json({
          error: "未购买",
          message: "需要购买此电子书才能查看完整内容",
          slug,
          price: book.price_cents,
        });
      }
    }

    // 3. 全文只从【私有桶】读取，绝不碰公开桶
    const key = getR2Key(slug); // content/{slug}.md
    try {
      const content = await fetchPrivateContent(key);
      return res.status(200).json({
        slug,
        content,
        isPreview: false,
        isFree,
      });
    } catch (err) {
      // 没有 R2 凭证（本地未配）时给个开发占位，避免整站崩
      console.error("private content fetch failed:", err.message);
      if (!process.env.R2_API_TOKEN) {
        return res.status(200).json({
          slug,
          content: `# ${book.title_en || slug}\n\n(开发占位：尚未配置 R2 私有桶)` ,
          isPreview: false,
          devMode: true,
        });
      }
      return res.status(502).json({ error: "Content fetch failed" });
    }
  } catch (err) {
    console.error("ebook-content error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}