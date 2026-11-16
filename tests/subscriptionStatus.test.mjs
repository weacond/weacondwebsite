// tests/subscriptionStatus.test.mjs
// 守护订阅访问控制：lib/ebookStore.js 的 getUserSubscriptions / hasActiveSubscription。
// 与 tests/accessControl.test.mjs 同款机制：用 __setTestServiceClient 注入假 Supabase client，
// 驱动真实的 .from("subscriptions").select().eq() 查询链；生产注入点恒为 null（行为零改变）。
// 核心不变量：只有 status ∈ active/trialing 的订阅算「有权」，canceled/past_due/unknown 一律无权。
import test from "node:test";
import assert from "node:assert/strict";

const { __setTestServiceClient } = await import("../lib/supabase.js");
const {
  getUserSubscriptions,
  hasActiveSubscription,
} = await import("../lib/ebookStore.js");

// 假 service client：from().select().eq() → { data: subs, error: null }（镜像 accessControl 的 mock）
function makeFakeClient({ subs = [], error = null } = {}) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return Promise.resolve({ data: subs, error });
            },
          };
        },
      };
    },
  };
}

test("getUserSubscriptions: 无 Supabase（注入 null）→ []", async () => {
  __setTestServiceClient(null);
  assert.deepEqual(await getUserSubscriptions("a@b.com"), []);
});

test("getUserSubscriptions: 只返回 active/trialing，排除 canceled/past_due", async () => {
  __setTestServiceClient(
    makeFakeClient({
      subs: [
        { plan: "putseller", status: "active" },
        { plan: "basic", status: "canceled" },
        { plan: "proquant", status: "trialing" },
        { plan: "basic", status: "past_due" },
      ],
    })
  );
  const out = await getUserSubscriptions("a@b.com");
  __setTestServiceClient(null);
  assert.equal(out.length, 2, "只留 active + trialing");
  assert.ok(out.every((r) => r.status === "active" || r.status === "trialing"));
});

test("getUserSubscriptions: 查询出错 → []（安全降级）", async () => {
  __setTestServiceClient(makeFakeClient({ subs: [], error: new Error("db down") }));
  assert.deepEqual(await getUserSubscriptions("a@b.com"), []);
  __setTestServiceClient(null);
});

test("hasActiveSubscription: 有效订阅匹配 plan → true", async () => {
  __setTestServiceClient(makeFakeClient({ subs: [{ plan: "putseller", status: "active" }] }));
  assert.equal(await hasActiveSubscription("a@b.com", "putseller"), true);
  __setTestServiceClient(null);
});

test("hasActiveSubscription: cancelled（英拼）归一后无权 → false", async () => {
  __setTestServiceClient(makeFakeClient({ subs: [{ plan: "putseller", status: "cancelled" }] }));
  assert.equal(await hasActiveSubscription("a@b.com", "putseller"), false);
  __setTestServiceClient(null);
});

test("hasActiveSubscription: 不指定 plan → 任意有效订阅", async () => {
  __setTestServiceClient(makeFakeClient({ subs: [{ plan: "basic", status: "active" }] }));
  assert.equal(await hasActiveSubscription("a@b.com"), true);
  __setTestServiceClient(null);
});

test("hasActiveSubscription: 空邮箱 → false（不触网）", async () => {
  assert.equal(await hasActiveSubscription(""), false);
  assert.equal(await hasActiveSubscription(null), false);
});

test("hasActiveSubscription: 无 Supabase → false（无订阅即无权）", async () => {
  __setTestServiceClient(null);
  assert.equal(await hasActiveSubscription("a@b.com", "putseller"), false);
});
