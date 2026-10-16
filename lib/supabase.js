import { createClient } from "@supabase/supabase-js";

/**
 * Supabase 客户端 — 用户认证 + 数据库
 *
 * 环境变量（.env.local）：
 *   NEXT_PUBLIC_SUPABASE_URL      — 项目 URL，例如 https://xxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY — 匿名 public key
 *   SUPABASE_SERVICE_ROLE_KEY     — 服务端专用（仅 API routes 使用，不要暴露给前端）
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseClient = null;

export function getSupabaseClient() {
  if (!url || !anonKey) {
    console.warn(
      "Supabase env vars not set. Auth features will be unavailable.",
    );
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    });
  }
  return supabaseClient;
}

/**
 * 服务端专用（API routes 中使用）
 */
export function getSupabaseServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}