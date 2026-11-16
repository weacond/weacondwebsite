// tests/subscriptionLifecycle.test.mjs — 订阅生命周期落库逻辑
// 覆盖 lib/stripe.js 的 isSubscriptionEvent / normalizeSubStatus / isSubscriptionActive /
// buildSubscriptionRow，以及 webhook 的 recordEvent(event, supabase)。
// supabase 用 mock 注入，全程无网络、无真实数据库（与 tests/webhook.test.mjs 的验签测试互补）。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSubscriptionEvent,
  normalizeSubStatus,
  isSubscriptionActive,
  buildSubscriptionRow,
} from "../lib/stripe.js";
import { recordEvent } from "../pages/api/checkout/webhook.js";

// ── mock Supabase：链式 from(table).upsert(row, opts)，记录调用 ──
function makeMockSupabase() {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        upsert: async (row, opts) => {
          calls.push({ table, row, opts });
          return { error: null };
        },
      };
    },
  };
}

test("isSubscriptionEvent：3 类生命周期事件为真，其余为假", () => {
  for (const t of [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ]) {
    assert.equal(isSubscriptionEvent(t), true, t);
  }
  assert.equal(isSubscriptionEvent("checkout.session.completed"), false);
  assert.equal(isSubscriptionEvent("invoice.payment_failed"), false);
  assert.equal(isSubscriptionEvent(undefined), false);
});

test("normalizeSubStatus：canceled/cancelled 两种拼写归一为 canceled；全小写", () => {
  assert.equal(normalizeSubStatus("cancelled"), "canceled");
  assert.equal(normalizeSubStatus("canceled"), "canceled");
  assert.equal(normalizeSubStatus("CANCELED"), "canceled");
  assert.equal(normalizeSubStatus("Active"), "active");
  assert.equal(normalizeSubStatus("  TRIALING "), "trialing");
  assert.equal(normalizeSubStatus(null), "");
});

test("isSubscriptionActive：active / trialing 为有权，其余一律无权", () => {
  assert.equal(isSubscriptionActive("active"), true);
  assert.equal(isSubscriptionActive("trialing"), true);
  assert.equal(isSubscriptionActive("canceled"), false);
  assert.equal(isSubscriptionActive("cancelled"), false);
  assert.equal(isSubscriptionActive("past_due"), false);
  assert.equal(isSubscriptionActive("unpaid"), false);
  assert.equal(isSubscriptionActive("incomplete"), false);
  assert.equal(isSubscriptionActive("deleted"), false);
  assert.equal(isSubscriptionActive(undefined), false);
});

test("buildSubscriptionRow：从 created 事件提取完整行（email 归一小写）", () => {
  const event = {
    type: "customer.subscription.created",
    data: {
      object: {
        id: "sub_123",
        customer: "cus_1",
        status: "active",
        current_period_end: 1700000000,
        cancel_at_period_end: false,
        metadata: { plan: "putseller", interval: "month", email: "User@Weacond.com" },
      },
    },
  };
  const row = buildSubscriptionRow(event);
  assert.ok(row, "应返回行");
  assert.equal(row.email, "user@weacond.com");
  assert.equal(row.plan, "putseller");
  assert.equal(row.interval, "month");
  assert.equal(row.status, "active");
  assert.equal(row.stripe_subscription_id, "sub_123");
  assert.equal(row.stripe_customer_id, "cus_1");
  assert.equal(row.cancel_at_period_end, false);
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(row.current_period_end));
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(row.updated_at));
});

test("buildSubscriptionRow：cancelled 状态归一 + updated 事件", () => {
  const event = {
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_x",
        status: "cancelled",
        cancel_at_period_end: true,
        metadata: { plan: "basic", interval: "year", email: "a@b.com" },
      },
    },
  };
  const row = buildSubscriptionRow(event);
  assert.equal(row.status, "canceled");
  assert.equal(row.interval, "year");
  assert.equal(row.cancel_at_period_end, true);
});

test("buildSubscriptionRow：缺 email → null（绝不写无主记录）", () => {
  const event = { type: "customer.subscription.created", data: { object: { id: "s", status: "active" } } };
  assert.equal(buildSubscriptionRow(event), null);
});

test("buildSubscriptionRow：非订阅事件 / 缺 data → null", () => {
  assert.equal(buildSubscriptionRow({ type: "checkout.session.completed", data: { object: {} } }), null);
  assert.equal(buildSubscriptionRow(null), null);
  assert.equal(buildSubscriptionRow({ type: "customer.subscription.deleted" }), null);
});
// ── recordEvent（mock supabase 注入，无网络、无真实库）──
test("recordEvent：订阅 created → upsert subscriptions（onConflict stripe_subscription_id）", async () => {
  const mock = makeMockSupabase();
  const event = {
    type: "customer.subscription.created",
    data: {
      object: {
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        metadata: { plan: "putseller", interval: "month", email: "user@weacond.com" },
      },
    },
  };
  await recordEvent(event, mock);
  assert.equal(mock.calls.length, 1, "应恰好一次写入");
  assert.equal(mock.calls[0].table, "subscriptions");
  assert.equal(mock.calls[0].opts.onConflict, "stripe_subscription_id");
  assert.equal(mock.calls[0].row.email, "user@weacond.com");
  assert.equal(mock.calls[0].row.status, "active");
});

test("recordEvent：supabase 为 null 时跳过写入且不抛错", async () => {
  const event = {
    type: "customer.subscription.updated",
    data: { object: { id: "sub_2", status: "canceled", metadata: { plan: "basic", email: "a@b.com" } } },
  };
  await assert.doesNotReject(() => recordEvent(event, null));
});

test("recordEvent：订阅事件缺 email → 不写入（buildSubscriptionRow 返回 null）", async () => {
  const mock = makeMockSupabase();
  await recordEvent(
    { type: "customer.subscription.deleted", data: { object: { id: "s", status: "deleted" } } },
    mock
  );
  assert.equal(mock.calls.length, 0);
});

test("recordEvent：非订阅/非结账事件 → 不写入", async () => {
  const mock = makeMockSupabase();
  await recordEvent({ type: "some.random.event", data: { object: {} } }, mock);
  assert.equal(mock.calls.length, 0);
});

test("recordEvent：checkout.session.completed → upsert purchases", async () => {
  const mock = makeMockSupabase();
  await recordEvent(
    {
      type: "checkout.session.completed",
      data: {
        object: {
          customer_email: "a@b.com",
          payment_intent: "pi_1",
          metadata: { slug: "the-nature-of-money", amount_cents: "2900" },
        },
      },
    },
    mock
  );
  assert.equal(mock.calls.length, 1);
  assert.equal(mock.calls[0].table, "purchases");
  assert.equal(mock.calls[0].row.book_slug, "the-nature-of-money");
});

test("recordEvent：订阅 payment_failed → 不写 subscriptions（仅日志）", async () => {
  const mock = makeMockSupabase();
  await recordEvent(
    { type: "invoice.payment_failed", data: { object: { customer: "cus_x" } } },
    mock
  );
  assert.equal(mock.calls.length, 0);
});

