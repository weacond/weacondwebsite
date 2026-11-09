// tests/accessControl.test.mjs
// 守护 /api/ebook-content 的【安全最关键不变量】：付费书未购买 → 403 拒绝访问全文。
// 这是防止"未付费白嫖付费电子书"的最后防线，故用测试注入点（__setTestServiceClient）
// 驱动路由内真实的 hasAccess 判定逻辑，而非 mock 路由本身。
//
// 机制：lib/supabase.js 的 getSupabaseServiceClient 在测试注入假 client 时返回它，
// 生产环境该注入点恒为 null（行为零改变）。假 client 模拟 Supabase 查询链：
//   auth.getUser(token) → { data:{user:{email}} }（由 cookie 的 sb-access-token 触发）
//   from("purchases").select().eq() → { data:[已购 slug] }
//
// 覆盖：
//   - 付费书 + 用户已购该书 → 放行（granted，无 R2 时回退开发占位 200）
//   - 付费书 + 用户未购（无 slug）→ 403 拒绝
//   - 付费书 + 用户仅持有套装(bundle-all) → 放行（hasAccess 套装逻辑）
//   - 付费书 + 无 cookie 无 query.email → 401 未登录
// 每个测试独立设置自己的假 client，互不污染；文件内 node --test 进程隔离。
import test from "node:test";
import assert from "node:assert/strict";

const { __setTestServiceClient } = await import("../lib/supabase.js");
const handler = (await import("../pages/api/ebook-content.js")).default;

function makeRes() {
  const res = {
    statusCode: null, body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    send(o) { this.body = o; return this; },
  };
  return res;
}

// 构造一个模拟 Supabase service client 的假对象：
//  - getUser：有 userEmail 则返回该用户，否则返回 error（无用户）。
//  - from().select().eq()：解析为 { data: rows }，rows 是 purchases 表行
//    （形如 { book_slug: "..." }），因路由会用 r.book_slug 映射出已购 slug 列表。
function makeFakeServiceClient({ userEmail = null, ownedSlugs = [] }) {
  const rows = ownedSlugs.map((s) => ({ book_slug: s }));
  return {
    auth: {
      async getUser() {
        if (userEmail) return { data: { user: { email: userEmail } }, error: null };
        return { data: null, error: new Error("no user for token") };
      },
    },
    from() {
      return {
        select() {
          return {
            eq() {
              return Promise.resolve({ data: rows, error: null });
            },
          };
        },
      };
    },
  };
}

// 确保无 R2 凭证（让"放行"分支走开发占位 200，不触网、不泄漏真文）。
function clearR2Env() {
  delete process.env.R2_API_TOKEN;
  delete process.env.R2_ACCOUNT_ID;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// the-nature-of-money 是付费书（price_cents=700），用于验证付费访问控制。
const PAID_SLUG = "the-nature-of-money";

test("access: 付费书 + 用户已购该书 → 放行（granted，graceful 200）", async () => {
  clearR2Env();
  __setTestServiceClient(makeFakeServiceClient({
    userEmail: "buyer@example.com",
    ownedSlugs: [PAID_SLUG],
  }));
  const res = makeRes();
  await handler(
    { method: "GET", query: { slug: PAID_SLUG }, headers: { cookie: "sb-access-token=tok" } },
    res,
  );
  __setTestServiceClient(null);
  // hasAccess([slug], slug)=true → 跳过 403 → fetchPrivateContent(无R2) → 200 开发占位。
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.slug, PAID_SLUG);
});

test("access: 付费书 + 用户【未购买】→ 403 拒绝访问（核心安全不变量）", async () => {
  clearR2Env();
  __setTestServiceClient(makeFakeServiceClient({
    userEmail: "stranger@example.com",
    ownedSlugs: [], // 该用户无任何购买
  }));
  const res = makeRes();
  await handler(
    { method: "GET", query: { slug: PAID_SLUG }, headers: { cookie: "sb-access-token=tok" } },
    res,
  );
  __setTestServiceClient(null);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body?.error, "未购买");
  assert.equal(res.body?.slug, PAID_SLUG);
});

test("access: 付费书 + 用户仅持有套装 bundle-all → 放行（hasAccess 套装逻辑）", async () => {
  clearR2Env();
  __setTestServiceClient(makeFakeServiceClient({
    userEmail: "bundle-buyer@example.com",
    ownedSlugs: ["bundle-all"], // 持有全集套装，应可访问单本
  }));
  const res = makeRes();
  await handler(
    { method: "GET", query: { slug: PAID_SLUG }, headers: { cookie: "sb-access-token=tok" } },
    res,
  );
  __setTestServiceClient(null);
  assert.equal(res.statusCode, 200);
});

test("access: 付费书 + 无 cookie 无 query.email → 401 未登录", async () => {
  clearR2Env();
  __setTestServiceClient(makeFakeServiceClient({ userEmail: null, ownedSlugs: [] }));
  const res = makeRes();
  await handler({ method: "GET", query: { slug: PAID_SLUG }, headers: {} }, res);
  __setTestServiceClient(null);
  assert.equal(res.statusCode, 401);
});

// 安全卫生：确认测试结束后注入点已复位为 null（不泄漏到其它测试/后续进程行为）。
test("access: 注入点复位后 getSupabaseServiceClient 不再返回假 client", async () => {
  __setTestServiceClient(null);
  const { getSupabaseServiceClient } = await import("../lib/supabase.js");
  clearR2Env();
  // 无注入、无 service role → 返回 null（生产行为）。
  assert.equal(getSupabaseServiceClient(), null);
});
