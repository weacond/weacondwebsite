// tests/purchases.test.mjs
// 契约守护 /api/purchases 与 /api/ebook-content —— 付费内容访问控制链路的安全边界。
//
// 仅覆盖【无网络确定性】分支（不依赖 Supabase/R2 真实调用）：
//   /api/purchases:
//     - 非 GET → 405
//     - 未配 service role → 200 { email:null, slugs:[], dev:true }（优雅降级，不崩）
//   /api/ebook-content:
//     - 非 GET → 405
//     - 缺 slug → 400
//     - 未知 slug → 404（getBook 纯内存返回 null，不触网）
//     - 已知书(付费)但无 service role + 无 R2 凭证 → 200 开发占位（graceful 降级，不崩、不泄漏真文）
//
// 这些路由的【付费书已购校验 / 403 未购买】需 mock Supabase service client 才能测，
// 属后续可选增强。本文件锁定其可确定性安全边界。
//
// 环境隔离：显式清除 SUPABASE_SERVICE_ROLE_KEY / R2_API_TOKEN，确保走到无凭证降级路径。
import test from "node:test";
import assert from "node:assert/strict";

const purchasesHandler = (await import("../pages/api/purchases.js")).default;
const ebookContentHandler = (await import("../pages/api/ebook-content.js")).default;

// 模拟 Next API res：status() 链式、json() 记体。
function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    send(o) { this.body = o; return this; },
  };
  return res;
}

// 确保无 service role / R2 凭证（走无凭证降级路径，纯内存、不触网）。
function clearSecretEnv() {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.R2_API_TOKEN;
}

// ---- /api/purchases ----

test("purchases: 非 GET → 405", async () => {
  const res = makeRes();
  await purchasesHandler({ method: "POST", query: {}, headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: "Method not allowed", slugs: [] });
});

test("purchases: 未配 service role → 200 空列表(dev:true) 优雅降级", async () => {
  clearSecretEnv();
  const res = makeRes();
  await purchasesHandler({ method: "GET", query: {}, headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { email: null, slugs: [], dev: true });
});

// ---- /api/ebook-content ----

test("ebook-content: 非 GET → 405", async () => {
  const res = makeRes();
  await ebookContentHandler({ method: "POST", query: { slug: "x" }, headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: "Method not allowed" });
});

test("ebook-content: 缺 slug → 400", async () => {
  clearSecretEnv();
  const res = makeRes();
  await ebookContentHandler({ method: "GET", query: {}, headers: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: "Missing slug" });
});

test("ebook-content: 未知 slug → 404（getBook 纯内存返回 null，不触网）", async () => {
  clearSecretEnv();
  const res = makeRes();
  await ebookContentHandler({ method: "GET", query: { slug: "nonexistent-book-xyz" }, headers: {} }, res);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: "Book not found" });
});

test("ebook-content: 已知付费书 + 无 service role + 无 R2 → 200 开发占位（graceful，不崩）", async () => {
  clearSecretEnv();
  const res = makeRes();
  // the-nature-of-money 是付费书(price_cents=700)；无 service role → 跳过购买校验；
  // 无 R2_API_TOKEN → 私有内容拉取失败时回退开发占位（不泄漏真文、不 500）。
  // 必须 await：handler 在 fetchPrivateContent 之后才 res.status(200)。
  await ebookContentHandler({ method: "GET", query: { slug: "the-nature-of-money" }, headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.slug, "the-nature-of-money");
});
