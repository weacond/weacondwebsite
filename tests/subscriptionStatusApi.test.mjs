// tests/subscriptionStatusApi.test.mjs
// 守护 /api/subscription-status 端点（镜像 /api/purchases 的安全设计，消费 getUserSubscriptions）。
// 机制：__setTestServiceClient 注入假 Supabase client（auth.getUser + from().select().eq()），
// 驱动端点内真实逻辑；生产注入点恒为 null（行为零改变）。
// 覆盖：非 GET 405 / 无 supabase 200 dev / 生产模式无 token 401 / 有效用户返回有效订阅 /
//       仅 canceled 订阅被过滤 / 本地模式 query.email 兜底。
import test from "node:test";
import assert from "node:assert/strict";

const { __setTestServiceClient } = await import("../lib/supabase.js");
const handler = (await import("../pages/api/subscription-status.js")).default;

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(o) {
      this.body = o;
      return this;
    },
  };
  return res;
}

// 假 service client：auth.getUser(token)→用户；from().select().eq()→{ data: subs }
function makeFakeClient({ userEmail = null, subs = [] }) {
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
              return Promise.resolve({ data: subs, error: null });
            },
          };
        },
      };
    },
  };
}

function withEnv(setup) {
  const prev = {
    svc: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  setup();
  return () => {
    if (prev.svc === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prev.svc;
  };
}

test("subscription-status: 非 GET → 405", async () => {
  const res = makeRes();
  await handler({ method: "POST", headers: {} }, res);
  assert.equal(res.statusCode, 405);
});

test("subscription-status: 无 Supabase → 200 dev:true（前端降级）", async () => {
  __setTestServiceClient(null);
  const res = makeRes();
  await handler({ method: "GET", headers: {}, query: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.dev, true);
  assert.deepEqual(res.body.plans, []);
});

test("subscription-status: 生产模式 + 无 token → 401（绝不信任 query.email）", async () => {
  const restore = withEnv(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "svc_role_dummy";
  });
  __setTestServiceClient(makeFakeClient({ userEmail: null, subs: [] }));
  const res = makeRes();
  // 即便 query.email 给了已付费邮箱，生产模式也不信 → 401
  await handler({ method: "GET", headers: {}, query: { email: "rich@example.com" } }, res);
  __setTestServiceClient(null);
  restore();
  assert.equal(res.statusCode, 401);
});

test("subscription-status: 有效用户（token）+ 有效订阅 → 200 + plans", async () => {
  __setTestServiceClient(
    makeFakeClient({
      userEmail: "buyer@example.com",
      subs: [
        { plan: "putseller", status: "active" },
        { plan: "proquant", status: "trialing" },
      ],
    })
  );
  const res = makeRes();
  await handler(
    { method: "GET", headers: { cookie: "sb-access-token=tok" }, query: {} },
    res
  );
  __setTestServiceClient(null);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.email, "buyer@example.com");
  assert.deepEqual(res.body.plans.sort(), ["proquant", "putseller"]);
});

test("subscription-status: 仅 canceled 订阅 → 被 isSubscriptionActive 过滤 → plans:[]", async () => {
  __setTestServiceClient(
    makeFakeClient({
      userEmail: "leaver@example.com",
      subs: [{ plan: "putseller", status: "cancelled" }],
    })
  );
  const res = makeRes();
  await handler(
    { method: "GET", headers: { cookie: "sb-access-token=tok" }, query: {} },
    res
  );
  __setTestServiceClient(null);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.plans, []);
});

test("subscription-status: 本地模式（无 service role）+ query.email 兜底 → 200", async () => {
  const restore = withEnv(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });
  __setTestServiceClient(
    makeFakeClient({ userEmail: "local@example.com", subs: [{ plan: "basic", status: "active" }] })
  );
  const res = makeRes();
  await handler(
    { method: "GET", headers: {}, query: { email: "local@example.com" } },
    res
  );
  __setTestServiceClient(null);
  restore();
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.plans, ["basic"]);
});
