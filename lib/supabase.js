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

// 测试注入点：仅测试代码可设置一个假 service client，使 API 路由的 Supabase 依赖分支
// （如"付费书未购买 → 403 拒绝访问"）可被无网络单元测试覆盖。生产环境从不设置，
// 默认 null，getSupabaseServiceClient 行为与原先完全一致（零改变）。
let __testServiceClient = null;
export function __setTestServiceClient(client) {
  __testServiceClient = client;
}

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
  // 测试注入优先：仅在测试显式设置时生效，生产环境恒为 null，走下方原逻辑。
  if (__testServiceClient) return __testServiceClient;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}