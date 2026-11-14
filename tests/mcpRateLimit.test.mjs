// tests/mcpRateLimit.test.mjs — 内存令牌桶限流
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeLimiter } from "../lib/mcp/rateLimit.js";

test("限额内允许，超出拒绝并给出 retryAfterMs", () => {
  const check = makeLimiter(3);
  const key = "test-key-" + Math.random();
  assert.equal(check(key).ok, true);
  assert.equal(check(key).ok, true);
  assert.equal(check(key).ok, true);
  const over = check(key);
  assert.equal(over.ok, false);
  assert.equal(over.limit, 3);
  assert.ok(over.retryAfterMs > 0);
});

test("不同 key 独立计数", () => {
  const check = makeLimiter(1);
  assert.equal(check("a").ok, true);
  assert.equal(check("a").ok, false); // a 耗尽
  assert.equal(check("b").ok, true); // b 独立
});

test("限流器工厂返回可调用的函数", () => {
  assert.equal(typeof makeLimiter(10), "function");
});
