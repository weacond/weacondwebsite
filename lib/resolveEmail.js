// lib/resolveEmail.js — 共享：从请求解析【真实】用户 email（服务端真实来源）。
//
// 安全设计（3 个端点共用，集中这条关键不变量，避免各写一份导致漂移）：
//   - 优先用 cookie 里的 Supabase access token 验证得到真实 email（生产权威来源）；
//   - 生产环境（已配 SUPABASE_SERVICE_ROLE_KEY）【绝不】信任 URL 的 ?email= ——
//     否则攻击者可用 ?email=已付费邮箱 窥探/伪造他人权益；
//   - 仅【本地未配 Supabase】时才退回 query.email 方便开发调试。
//
// 用法：const email = await resolveEmail(req);  // email 为 null 表示未认证/不可信
// 依赖 getSupabaseServiceClient（未配 Supabase 时返回 null，则跳过 token 验证、走 query 兜底）。
// Edge 安全（仅用 fetch 风格的 req + 纯逻辑），可单测（注入 __setTestServiceClient）。

import { getSupabaseServiceClient } from "./supabase.js";

export async function resolveEmail(req) {
  const cookie = (req.headers && req.headers.cookie) || "";
  const match = cookie.match(/sb-access-token=([^;]+)/);
  if (match) {
    try {
      const supabase = getSupabaseServiceClient();
      if (supabase) {
        const { data, error } = await supabase.auth.getUser(match[1]);
        if (!error && data?.user?.email) return data.user.email;
      }
    } catch (e) {
      console.warn("resolveEmail via token failed:", e && e.message);
    }
  }
  // 生产已配 service role：绝不信任 URL 里的 ?email=（防窥探/伪造）
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  // 仅本地未配 Supabase 时退回 query.email 方便调试
  return (req.query && req.query.email) || null;
}
