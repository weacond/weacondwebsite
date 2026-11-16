import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getPlan,
  isSubscribable,
  planPriceCents,
  createSubscriptionSession,
  PLAN_CATALOG,
} from "../lib/stripe.js";
import subscribeHandler from "../pages/api/subscribe.js";

// ---------- getPlan ----------
test("getPlan: 已知方案", () => {
  assert.equal(getPlan("basic").name, "Basic");
  assert.equal(getPlan("putseller").type, "paid");
  assert.equal(getPlan("free").type, "free");
  assert.equal(getPlan("enterprise").type, "contact");
});

test("getPlan: 未知 / 非字符串 → undefined（不抛错）", () => {
  assert.equal(getPlan("nope"), undefined);
  assert.equal(getPlan(undefined), undefined);
  assert.equal(getPlan(""), undefined);
});

// ---------- isSubscribable（关键安全不变量：free/contact/未知绝不发起支付）----------
test("isSubscribable: 付费档 true", () => {
  assert.equal(isSubscribable("basic"), true);
  assert.equal(isSubscribable("putseller"), true);
  assert.equal(isSubscribable("proquant"), true);
});

test("isSubscribable: free / enterprise / 未知 → false", () => {
  assert.equal(isSubscribable("free"), false);
  assert.equal(isSubscribable("enterprise"), false);
  assert.equal(isSubscribable("nope"), false);
  assert.equal(isSubscribable(undefined), false);
  assert.equal(isSubscribable(""), false);
});

// ---------- planPriceCents ----------
test("planPriceCents: 月/年价正确（缺省 month）", () => {
  assert.equal(planPriceCents("basic", "month"), 990);
  assert.equal(planPriceCents("basic"), 990);
  assert.equal(planPriceCents("basic", "year"), 9900);
  assert.equal(planPriceCents("putseller"), 2990);
  assert.equal(planPriceCents("proquant", "year"), 149000);
});

test("planPriceCents: 未知方案 / 缺失档期 → null", () => {
  assert.equal(planPriceCents("nope"), null);
  assert.equal(planPriceCents("enterprise", "year"), null); // enterprise 无年价
});

// ---------- createSubscriptionSession 入参守护（network-free：必须在 fetch 之前抛错）----------
test("createSubscriptionSession: 未知方案 → 抛 Invalid plan key（不触网）", async () => {
  await assert.rejects(() => createSubscriptionSession("nope", "a@b.com"), /Invalid plan key/);
});

test("createSubscriptionSession: free 档 → 抛 not subscribable（不触网）", async () => {
  await assert.rejects(() => createSubscriptionSession("free", "a@b.com"), /not subscribable/);
});

test("createSubscriptionSession: enterprise → 抛 not subscribable（不触网）", async () => {
  await assert.rejects(
    () => createSubscriptionSession("enterprise", "a@b.com"),
    /not subscribable/
  );
});

test("createSubscriptionSession: enterprise 年付价缺失 → 走 not subscribable", async () => {
  // enterprise 是 contact 档，先被 not subscribable 拦截（其 null 年价不会到达 price 校验）。
  await assert.rejects(
    () => createSubscriptionSession("enterprise", "a@b.com", "year"),
    /not subscribable/
  );
});


// ---------- createSubscriptionSession 成功路径（mock global.fetch，断言订阅参数）----------
test("createSubscriptionSession: 合法方案 → 调 Stripe 并返回 session", async () => {
  const origFetch = globalThis.fetch;
  let called = 0;
  globalThis.fetch = async (url, opts) => {
    called++;
    assert.match(String(url), /api\.stripe\.com\/v1\/checkout\/sessions/);
    const body = String(opts && opts.body);
    assert.match(body, /mode=subscription/);
    assert.match(body, /recurring/); // recurring interval 已序列化
    assert.match(body, /customer_email=a%40b\.com/);
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "cs_test_1", url: "https://checkout.stripe.com/c/test" }),
      text: async () => "",
    };
  };
  const prev = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  try {
    const session = await createSubscriptionSession("putseller", "a@b.com", "month");
    assert.equal(called, 1);
    assert.equal(session.url, "https://checkout.stripe.com/c/test");
  } finally {
    if (prev === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prev;
    globalThis.fetch = origFetch;
  }
});

// ---------- pages/api/subscribe.js 端点守护 ----------
function makeRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(c) {
      res.statusCode = c;
      return res;
    },
    json(o) {
      res.body = o;
      return res;
    },
  };
  return res;
}

test("subscribe: 非 POST → 405", async () => {
  const res = makeRes();
  await subscribeHandler({ method: "GET", body: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, "Method Not Allowed");
});

test("subscribe: 无 STRIPE_SECRET_KEY → 503（不触网）", async () => {
  const prev = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    const res = makeRes();
    await subscribeHandler(
      { method: "POST", body: { plan: "basic", email: "a@b.com" } },
      res
    );
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, "Stripe not configured");
  } finally {
    if (prev === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prev;
  }
});

test("subscribe: 已配 key 但缺 plan/email → 400", async () => {
  const prev = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  try {
    const res = makeRes();
    await subscribeHandler({ method: "POST", body: {} }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "Missing plan or email");
  } finally {
    if (prev === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prev;
  }
});

test("subscribe: 已配 key 但方案不可订阅 → 400 Invalid plan", async () => {
  const prev = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  try {
    const res = makeRes();
    await subscribeHandler(
      { method: "POST", body: { plan: "free", email: "a@b.com" } },
      res
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "Invalid plan");
  } finally {
    if (prev === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prev;
  }
});

test("subscribe: 合法方案 → 200 + url（mock fetch）", async () => {
  const prev = process.env.STRIPE_SECRET_KEY;
  const origFetch = globalThis.fetch;
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ id: "cs_test_2", url: "https://checkout.stripe.com/c/year" }),
    text: async () => "",
  });
  try {
    const res = makeRes();
    await subscribeHandler(
      { method: "POST", body: { plan: "proquant", interval: "year", email: "a@b.com" } },
      res
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.url, "https://checkout.stripe.com/c/year");
  } finally {
    if (prev === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prev;
    globalThis.fetch = origFetch;
  }
});

// ---------- PLAN_CATALOG 一致性（与 pages/pricing.js 显示价对齐）----------
test("PLAN_CATALOG: 付费档月/年价正确", () => {
  const byKey = Object.fromEntries(PLAN_CATALOG.map((p) => [p.key, p]));
  assert.equal(byKey.basic.price_month_cents, 990);
  assert.equal(byKey.basic.price_year_cents, 9900);
  assert.equal(byKey.putseller.price_month_cents, 2990);
  assert.equal(byKey.proquant.price_month_cents, 14900);
  assert.equal(byKey.proquant.price_year_cents, 149000);
});
