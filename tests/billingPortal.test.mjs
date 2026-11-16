// tests/billingPortal.test.mjs
// 守护「订阅自助管理」链路：lib/stripe.js 的 createBillingPortalSession +
// /api/manage-subscription 端点。机制：mock global.fetch（拦截对 Stripe REST API 的调用）
// + __setTestServiceClient（拦截 supabase 查询），驱动真实逻辑，生产行为零改变。
import test from "node:test";
import assert from "node:assert/strict";

const { __setTestServiceClient } = await import("../lib/supabase.js");
const { createBillingPortalSession } = await import("../lib/stripe.js");
const manageHandler = (await import("../pages/api/manage-subscription.js")).default;

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

// 假 service client：auth.getUser→用户；from().select().eq()→{ data: subs }
function makeFakeClient({ subs = [], email = "buyer@example.com" }) {
  return {
    auth: {
      async getUser() {
        return { data: { user: { email } }, error: null };
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

// 临时替换 global.fetch
function mockFetch(impl) {
  const prev = globalThis.fetch;
  globalThis.fetch = impl;
  return () => {
    globalThis.fetch = prev;
  };
}

function withEnv(setup) {
  const prev = {};
  for (const k of ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_SITE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    prev[k] = process.env[k];
  }
  setup();
  return () => {
    for (const k of Object.keys(prev)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  };
}

// ---------- createBillingPortalSession ----------

test("billingPortal: 无 STRIPE_SECRET_KEY → null（不触网）", async () => {
  const restore = withEnv(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });
  let called = false;
  const restoreFetch = mockFetch(async () => {
    called = true;
    return { ok: true, json: async () => ({ url: "x" }) };
  });
  const r = await createBillingPortalSession("cust_123");
  restoreFetch();
  restore();
  assert.equal(r, null);
  assert.equal(called, false, "无 key 时绝不发起 Stripe 请求");
});

test("billingPortal: 缺 customerId → null（不触网）", async () => {
  const restore = withEnv(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  });
  let called = false;
  const restoreFetch = mockFetch(async () => {
    called = true;
    return { ok: true, json: async () => ({ url: "x" }) };
  });
  const r = await createBillingPortalSession("");
  restoreFetch();
  restore();
  assert.equal(r, null);
  assert.equal(called, false);
});

test("billingPortal: happy → 返回 { url }，body 携带 customer + return_url + Bearer", async () => {
  const restore = withEnv(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.NEXT_PUBLIC_SITE_URL = "https://weacond.com";
  });
  let captured;
  const restoreFetch = mockFetch(async (url, opts) => {
    captured = { url, opts };
    return { ok: true, status: 200, json: async () => ({ url: "https://billing.stripe.com/p/session/xyz" }) };
  });
  const r = await createBillingPortalSession("cust_abc");
  restoreFetch();
  restore();
  assert.equal(r.url, "https://billing.stripe.com/p/session/xyz");
  assert.ok(captured.url.includes("/v1/billing_portal/sessions"), "打到 billing_portal/sessions");
  const body = captured.opts.body;
  assert.ok(/customer=cust_abc/.test(body), "body 携带 customer");
  assert.ok(/return_url=/.test(body), "body 携带 return_url");
  assert.ok(/Bearer sk_test_dummy/.test(captured.opts.headers.Authorization), "Bearer 鉴权");
});

// ---------- createBillingPortalSession: 错误路径 ----------

test("billingPortal: Stripe 返回非 2xx → 抛错", async () => {
  const restore = withEnv(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  });
  const restoreFetch = mockFetch(async () => ({
    ok: false,
    status: 400,
    text: async () => "bad request",
  }));
  await assert.rejects(() => createBillingPortalSession("cust_abc"), /billing portal failed 400/);
  restoreFetch();
  restore();
});

// ---------- /api/manage-subscription ----------

test("manage-subscription: 非 POST → 405", async () => {
  const res = makeRes();
  await manageHandler({ method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 405);
});

test("manage-subscription: 未配 STRIPE_SECRET_KEY → 503（优雅降级）", async () => {
  const restore = withEnv(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });
  const res = makeRes();
  await manageHandler({ method: "POST", headers: {}, query: {} }, res);
  restore();
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, "Stripe not configured");
});

test("manage-subscription: 生产模式 + 无 cookie → 401（绝不信任 query.email）", async () => {
  const restore = withEnv(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "svc_role_dummy";
  });
  __setTestServiceClient(makeFakeClient({ subs: [] }));
  const res = makeRes();
  await manageHandler(
    { method: "POST", headers: {}, query: { email: "rich@example.com" } },
    res
  );
  __setTestServiceClient(null);
  restore();
  assert.equal(res.statusCode, 401);
});

test("manage-subscription: 无有效订阅 → 409（无可管理对象）", async () => {
  const restore = withEnv(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  });
  __setTestServiceClient(makeFakeClient({ subs: [] }));
  const res = makeRes();
  await manageHandler(
    { method: "POST", headers: { cookie: "sb-access-token=tok" }, query: {} },
    res
  );
  __setTestServiceClient(null);
  restore();
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, "No active subscription to manage");
});

test("manage-subscription: 有有效订阅 → 200 + url（透传 customer_id 给 Portal）", async () => {
  const restore = withEnv(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.NEXT_PUBLIC_SITE_URL = "https://weacond.com";
  });
  __setTestServiceClient(
    makeFakeClient({
      subs: [{ plan: "putseller", status: "active", customer_id: "cust_999", stripe_subscription_id: "sub_999" }],
    })
  );
  let capturedCustomer;
  const restoreFetch = mockFetch(async (_url, opts) => {
    const m = String(opts.body).match(/customer=([^&]+)/);
    capturedCustomer = m ? m[1] : null;
    return { ok: true, status: 200, json: async () => ({ url: "https://billing.stripe.com/p/session/q" }) };
  });
  const res = makeRes();
  await manageHandler(
    { method: "POST", headers: { cookie: "sb-access-token=tok" }, query: {} },
    res
  );
  restoreFetch();
  __setTestServiceClient(null);
  restore();
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.url, "https://billing.stripe.com/p/session/q");
  assert.equal(capturedCustomer, "cust_999", "端点把有效订阅的 customer_id 透传给 Billing Portal");
});
