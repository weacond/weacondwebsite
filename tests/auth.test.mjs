// tests/auth.test.mjs
// 契约守护 /api/auth（Supabase 认证代理）的可确定性分支。
//
// 重要背景（架构观察）：经核查，客户端 pages/login.js 直接使用 supabase-js 客户端做
// 认证（client.auth.signInWithPassword），【从未经过 /api/auth】。故 /api/auth 当前是
// 一条【休眠代理路由】——无客户端调用。本测试守护其契约边界（方法/配置），使其即便
// 将来被启用也行为正确，同时记录这一死代码事实供后续清理决策。
//
// 仅覆盖无网络确定性分支：
//   - 非 POST → 405
//   - 未配置 Supabase → 503 优雅降级（getSupabaseClient 返回 null）
// 动作分发（signup/login/logout/unknown）需真实/注入 supabase client，依赖网络，不在本文件覆盖。
//
// 无副作用：仅依赖环境缺失返回 503，不触网。
import test from "node:test";
import assert from "node:assert/strict";

const handler = (await import("../pages/api/auth.js")).default;

function makeRes() {
  const res = {
    statusCode: null, body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    send(o) { this.body = o; return this; },
  };
  return res;
}

// 本路由依赖 getSupabaseClient() 在【模块加载时】读取的 NEXT_PUBLIC_SUPABASE_URL/ANON_KEY。
// 测试进程默认未设置 → client 为 null → 503。显式清除以防环境泄漏（不影响已捕获常量，仅表意）。
function clearSupabaseEnv() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

test("auth: 非 POST → 405", () => {
  const res = makeRes();
  handler({ method: "GET" }, res);
  assert.equal(res.statusCode, 405);
});

test("auth: 未配置 Supabase → 503（优雅降级）", () => {
  clearSupabaseEnv();
  const res = makeRes();
  handler({ method: "POST", body: { action: "login" } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body?.error, "Auth not configured");
});

test("auth: oauth 未配置 Supabase → 503（优雅降级，provider 白名单在 client 缺失前不触网）", () => {
  clearSupabaseEnv();
  const res = makeRes();
  handler({ method: "POST", body: { action: "oauth", provider: "google" } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body?.error, "Auth not configured");
});
