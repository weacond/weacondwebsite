// tests/resolveEmail.test.mjs
// 守护 lib/resolveEmail.js —— 5 个端点共用的「解析真实用户 email」安全不变量：
// 生产环境绝不信任 URL 的 ?email=（否则可被 ?email=已付费邮箱 窥探/白嫖），
// 仅本地未配 Supabase 时才退回 query.email。机制：__setTestServiceClient 注入假客户端。
import test from "node:test";
import assert from "node:assert/strict";

const { __setTestServiceClient } = await import("../lib/supabase.js");
const { resolveEmail } = await import("../lib/resolveEmail.js");

// 假 service client：auth.getUser(token) → { data: { user: { email } } } 或 error
function makeClient({ email = "buyer@example.com", error = null } = {}) {
  return {
    auth: {
      async getUser() {
        return error ? { data: null, error } : { data: { user: { email } }, error: null };
      },
    },
  };
}

function withEnv(setup) {
  const prev = process.env.SUPABASE_SERVICE_ROLE_KEY;
  setup();
  return () => {
    if (prev === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prev;
  };
}

test("resolveEmail: cookie token → 经 auth.getUser 解析出真实 email", async () => {
  __setTestServiceClient(makeClient({ email: "tok@example.com" }));
  const email = await resolveEmail({ headers: { cookie: "sb-access-token=abc123" }, query: {} });
  __setTestServiceClient(null);
  assert.equal(email, "tok@example.com");
});

test("resolveEmail: 生产模式 + 无 cookie → 绝不信任 query.email（返回 null）", async () => {
  const restore = withEnv(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "svc_role_dummy";
  });
  __setTestServiceClient(makeClient({}));
  const email = await resolveEmail({
    headers: { cookie: "" },
    query: { email: "rich@example.com" },
  });
  __setTestServiceClient(null);
  restore();
  assert.equal(email, null, "生产绝不信任 ?email=，防窥探/白嫖");
});

test("resolveEmail: 本地未配 Supabase → 退回 query.email（方便调试）", async () => {
  const restore = withEnv(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
  __setTestServiceClient(null); // 未配 Supabase → getSupabaseServiceClient 返回 null
  const email = await resolveEmail({
    headers: { cookie: "" },
    query: { email: "dev@example.com" },
  });
  restore();
  assert.equal(email, "dev@example.com");
});

test("resolveEmail: 无 cookie 且无 query.email → null", async () => {
  const restore = withEnv(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
  __setTestServiceClient(null);
  const email = await resolveEmail({ headers: { cookie: "" }, query: {} });
  restore();
  assert.equal(email, null);
});

test("resolveEmail: token 无效（getUser 报错）→ 生产返回 null、本地退回 query.email", async () => {
  const errClient = makeClient({ error: { message: "invalid token" } });
  // 生产模式
  let restore = withEnv(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "svc_role_dummy";
  });
  __setTestServiceClient(errClient);
  const prodEmail = await resolveEmail({
    headers: { cookie: "sb-access-token=bad" },
    query: { email: "rich@example.com" },
  });
  __setTestServiceClient(null);
  restore();
  assert.equal(prodEmail, null, "生产：token 失败 → null（不信 query.email）");

  // 本地模式
  restore = withEnv(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
  __setTestServiceClient(null);
  const devEmail = await resolveEmail({
    headers: { cookie: "sb-access-token=bad" },
    query: { email: "dev@example.com" },
  });
  restore();
  assert.equal(devEmail, "dev@example.com", "本地：token 失败 → 退回 query.email");
});
