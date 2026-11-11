export const runtime = "edge";

// Supabase Auth API — 用户注册/登录代理
// 支持邮箱+密码、OAuth 占位

import { getSupabaseClient } from "../../lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const client = getSupabaseClient();
  if (!client) {
    return res.status(503).json({ error: "Auth not configured" });
  }

  const { action, email, password, ...rest } = req.body;

  try {
    switch (action) {
      case "signup": {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: rest },
        });
        if (error) return res.status(400).json({ error: error.message });
        res.status(200).json({ user: data.user, session: data.session });
        break;
      }

      case "login": {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return res.status(400).json({ error: error.message });
        res.status(200).json({ user: data.user, session: data.session });
        break;
      }

      case "logout": {
        await client.auth.signOut();
        res.status(200).json({ ok: true });
        break;
      }

      case "oauth": {
        // OAuth（Google / GitHub / Apple 等）：provider 白名单化，默认 google,github,apple，
        // 可用 NEXT_PUBLIC_OAUTH_PROVIDERS（逗号分隔）覆盖。返回授权 URL 供前端跳转。
        const provider = String(rest.provider || "").trim().toLowerCase();
        const allowed = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS || "google,github,apple")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        if (!provider || !allowed.includes(provider)) {
          return res.status(400).json({ error: `OAuth provider not allowed. Allowed: ${allowed.join(", ") || "none"}` });
        }
        const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          : "/auth/callback";
        const { data, error } = await client.auth.signInWithOAuth({
          provider,
          options: { redirectTo },
        });
        if (error) return res.status(400).json({ error: error.message });
        res.status(200).json({ provider, redirectTo, url: data.url });
        break;
      }

      default:
        return res.status(400).json({ error: "Unknown action" });
    }
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ error: "Auth failed" });
  }
}