export const runtime = "edge";

// Supabase Auth API — 用户注册/登录代理
// 支持邮箱+密码、OAuth 占位

import { getSupabaseClient } from "../../lib/supabase";

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

      default:
        return res.status(400).json({ error: "Unknown action" });
    }
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ error: "Auth failed" });
  }
}