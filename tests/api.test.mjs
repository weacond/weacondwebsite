import { test } from "node:test";
import assert from "node:assert/strict";
import healthHandler from "../pages/api/health.js";
import backtestHandler from "../pages/api/backtest.js";
import aiHandler from "../pages/api/ai.js";

// 轻量 mock：模拟 Next 的 res（status/json/send/setHeader 链式）
function makeRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(k, v) {
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
    send(t) {
      res.body = t;
      return res;
    },
  };
  return res;
}

// ---------- /api/health ----------
test("health: 任意请求 → 200 + status ok + no-store 头", () => {
  const res = makeRes();
  healthHandler({ method: "GET" }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.service, "weacond");
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.ok(typeof res.body.time === "string", "应含 ISO 时间戳");
});

// ---------- /api/backtest ----------
test("backtest: 非 POST → 405 Method Not Allowed", () => {
  const res = makeRes();
  backtestHandler({ method: "GET", body: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, "Method Not Allowed");
});

test("backtest: POST 缺 strategy → 400", () => {
  const res = makeRes();
  backtestHandler({ method: "POST", body: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "strategy is required");
});

test("backtest: POST 合法策略 → 200 + 完整结果（trades/metrics）", async () => {
  const res = makeRes();
  await backtestHandler(
    { method: "POST", body: { strategy: "ma_cross", preset: "SPY_2023" } },
    res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.strategy, "ma_cross");
  assert.ok(Array.isArray(res.body.trades), "应返回 trades 数组");
  assert.ok("metrics" in res.body, "应含 metrics");
  assert.ok("candles" in res.body, "应含 candles 摘要");
});

test("backtest: POST 未知策略 → 400（runFullBacktest 抛错被 catch 捕获）", async () => {
  const res = makeRes();
  await backtestHandler(
    { method: "POST", body: { strategy: "no_such_strategy" } },
    res
  );
  assert.equal(res.statusCode, 400);
  assert.ok(/Unknown strategy/.test(res.body.error), "错误信息应透传");
});

// ---------- /api/ai（优雅降级契约，不触网） ----------
test("ai: 非 POST → 405", () => {
  const res = makeRes();
  aiHandler({ method: "GET" }, res);
  assert.equal(res.statusCode, 405);
});

test("ai: 非法 JSON body → 400", async () => {
  const res = makeRes();
  await aiHandler(
    { method: "POST", json: async () => { throw new Error("bad json"); } },
    res
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Invalid JSON body");
});

test("ai: 缺 prompt → 400", async () => {
  const res = makeRes();
  await aiHandler({ method: "POST", json: async () => ({}) }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "prompt is required");
});

test("ai: 有 prompt 无密钥 → 200 模拟降级（不打真实网络）", async () => {
  const prev = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const res = makeRes();
    await aiHandler({ method: "POST", json: async () => ({ prompt: "explain IV" }) }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.model, "simulated", "无密钥应走模拟降级");
    assert.ok(typeof res.body.response === "string");
  } finally {
    if (prev === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prev;
  }
});