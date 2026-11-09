import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import webhookHandler from "../pages/api/checkout/webhook.js";

// 关键：用 Node crypto.createHmac（独立于路由内的 Web Crypto crypto.subtle）
// 计算 Stripe 风格签名，跨实现校验路由的验签逻辑是否正确。
// 格式同 Stripe：t=<ts>;v1=<hmac-sha256-hex of `${ts}.${rawBody}` with secret>
const WH_SECRET = "whsec_test_dummy";
function makeSignature(rawBody, timestamp = Math.floor(Date.now() / 1000)) {
  const sig = createHmac("sha256", WH_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return `t=${timestamp};v1=${sig}`;
}

// 轻量 mock res
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

// 构造一个合法的 checkout.session.completed 事件
function sampleEvent(amountCents = "700", slug = "the-nature-of-money") {
  return JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        customer_email: "buyer@example.com",
        metadata: { slug, is_bundle: "false", amount_cents: amountCents },
        payment_intent: "pi_test",
      },
    },
  });
}

// 配 Stripe 密钥（否则 503）+ 确保无 Supabase（成功路径不写库、不触网）
async function withStripeSecrets(fn) {
  const prevKey = process.env.STRIPE_SECRET_KEY;
  const prevWh = process.env.STRIPE_WEBHOOK_SECRET;
  const prevSvc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.STRIPE_WEBHOOK_SECRET = WH_SECRET;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origLog = console.log;
  const origErr = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    await fn();
  } finally {
    console.log = origLog;
    console.error = origErr;
    if (prevKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prevKey;
    if (prevWh === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevWh;
    if (prevSvc === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevSvc;
  }
}

test("webhook: 非 POST → 405", async () => {
  const res = makeRes();
  await webhookHandler({ method: "GET", headers: {}, text: async () => "{}" }, res);
  assert.equal(res.statusCode, 405);
});

test("webhook: 未配置 Stripe 密钥 → 503（优雅降级）", async () => {
  const prevKey = process.env.STRIPE_SECRET_KEY;
  const prevWh = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  const res = makeRes();
  try {
    await webhookHandler({ method: "POST", headers: {}, text: async () => "{}" }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, "Stripe not configured");
  } finally {
    if (prevKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prevKey;
    if (prevWh === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevWh;
  }
});

// 资金安全核心：合法签名的事件被接受并处理（无 supabase 时不写库、不触网）
test("webhook: 合法签名 → 200 received", async () => {
  await withStripeSecrets(async () => {
    const rawBody = sampleEvent();
    const sig = makeSignature(rawBody);
    const res = makeRes();
    await webhookHandler(
      { method: "POST", headers: { "stripe-signature": sig }, text: async () => rawBody },
      res
    );
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { received: true });
  });
});

// 关键安全不变量：篡改原始体（如把金额改小）但签名不变 → 400，防伪造/篡改支付事件
test("webhook: 篡改 body 而签名不变 → 400（防伪造）", async () => {
  await withStripeSecrets(async () => {
    const rawBody = sampleEvent("700");
    const sig = makeSignature(rawBody);
    const tampered = rawBody.replace('"amount_cents":"700"', '"amount_cents":"0"');
    assert.notEqual(tampered, rawBody, "前置：篡改确实改变了 body");
    const res = makeRes();
    await webhookHandler(
      { method: "POST", headers: { "stripe-signature": sig }, text: async () => tampered },
      res
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "Invalid signature");
  });
});

// 关键安全不变量：缺签名头 → 400
test("webhook: 缺 stripe-signature 头 → 400", async () => {
  await withStripeSecrets(async () => {
    const rawBody = sampleEvent();
    const res = makeRes();
    await webhookHandler({ method: "POST", headers: {}, text: async () => rawBody }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "Invalid signature");
  });
});

// 关键安全不变量：重放攻击——合法签名但时间戳超 5 分钟 → 400（防重放）
test("webhook: 合法签名但时间戳过期 → 400（防重放）", async () => {
  await withStripeSecrets(async () => {
    const rawBody = sampleEvent();
    const oldTs = Math.floor(Date.now() / 1000) - 600; // 10 分钟前，超出 300s 容差
    const sig = makeSignature(rawBody, oldTs);
    const res = makeRes();
    await webhookHandler(
      { method: "POST", headers: { "stripe-signature": sig }, text: async () => rawBody },
      res
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "Invalid signature");
  });
});