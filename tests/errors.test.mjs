import { test } from "node:test";
import assert from "node:assert/strict";
import errorsHandler from "../pages/api/errors.js";

// 轻量 mock：模拟 Next/Edge 的 res（status/json/end 链式）
function makeRes() {
  const res = {
    statusCode: 200,
    body: null,
    ended: false,
    setHeader(k, v) {
      res.headers = res.headers || {};
      res.headers[k] = v;
      return res;
    },
    status(c) {
      res.statusCode = c;
      return res;
    },
    json(o) {
      res.body = o;
      return res;
    },
    end() {
      res.ended = true;
      return res;
    },
  };
  return res;
}

// 静默 console.error，避免合法上报测试污染输出
function withSilencedConsole(fn) {
  const orig = console.error;
  console.error = () => {};
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      console.error = orig;
    });
}

test("errors: 非 POST → 405", async () => {
  const res = makeRes();
  await errorsHandler({ method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, "Method Not Allowed");
});

test("errors: 非法 JSON body → 400", async () => {
  const res = makeRes();
  await errorsHandler(
    { method: "POST", headers: {}, json: async () => { throw new Error("bad"); } },
    res
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Invalid JSON body");
});

test("errors: 缺 message → 400", async () => {
  const res = makeRes();
  await errorsHandler(
    { method: "POST", headers: {}, json: async () => ({ stack: "x" }) },
    res
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "message is required");
});

test("errors: 合法上报 → 204（fire-and-forget）", async () => {
  await withSilencedConsole(async () => {
    const res = makeRes();
    await errorsHandler(
      {
        method: "POST",
        headers: { "cf-connecting-ip": "9.9.9.9" }, // 唯一 IP，隔离计数
        json: async () => ({
          message: "boom",
          stack: "at X",
          url: "/home",
          ua: "node-test",
        }),
      },
      res
    );
    assert.equal(res.statusCode, 204);
    assert.equal(res.ended, true);
  });
});

// 关键不变量：单 IP 超频被限流（LIMIT=50/分钟）。用唯一 IP 隔离计数，
// 发够数量后必出现 429，且不依赖精确 LIMIT 值（只要 LIMIT < 迭代次数）。
test("errors: 单 IP 超频 → 429 限流", async () => {
  const ip = `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.7`;
  let got429 = false;
  for (let i = 0; i < 80; i++) {
    const res = makeRes();
    await withSilencedConsole(async () => {
      await errorsHandler(
        {
          method: "POST",
          headers: { "cf-connecting-ip": ip },
          json: async () => ({ message: `err-${i}` }),
        },
        res
      );
      if (res.statusCode === 429) got429 = true;
    });
    if (got429) break;
  }
  assert.ok(got429, "单 IP 超过限流阈值后应返回 429");
});