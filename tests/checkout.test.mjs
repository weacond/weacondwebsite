import { test } from "node:test";
import assert from "node:assert/strict";
import checkoutHandler from "../pages/api/checkout.js";

// 轻量 mock res（status/json 链式）
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

test("checkout: 非 POST → 405", async () => {
  const res = makeRes();
  await checkoutHandler({ method: "GET", body: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, "Method Not Allowed");
});

// 关键不变量：未配置 Stripe 时优雅降级 503（不抛 500、不触网）
test("checkout: 无 STRIPE_SECRET_KEY → 503 Stripe not configured", async () => {
  const prev = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    const res = makeRes();
    await checkoutHandler(
      { method: "POST", body: { bookSlug: "the-nature-of-money", email: "a@b.com" } },
      res
    );
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, "Stripe not configured");
  } finally {
    if (prev === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prev;
  }
});

// 已配 key 但缺必填字段 → 400（在 createCheckoutSession/fetch 之前返回，network-free）
test("checkout: 已配 key 但缺 bookSlug/email → 400", async () => {
  const prev = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  try {
    const res = makeRes();
    await checkoutHandler({ method: "POST", body: {} }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "Missing bookSlug or email");
  } finally {
    if (prev === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prev;
  }
});