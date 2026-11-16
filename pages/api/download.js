export const runtime = "edge";

// GET /api/download?slug=xxx&format=pdf
// 验证用户购买记录，返回 R2 签名 URL 或重定向
// 需要 Cookie 中的 Supabase access token 或 query param email

import { resolveEmail } from "../../lib/resolveEmail.js";
import { getDownloadUrl, isFreeBook } from "../../lib/ebookStore.js";

// 安全设计集中在 lib/resolveEmail.js：生产用 cookie token 验真实 email，绝不信任 query.email。

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug, format = "pdf", lang = "en" } = req.query;
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
    const url = await getDownloadUrl(userEmail, slug, format, lang);
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