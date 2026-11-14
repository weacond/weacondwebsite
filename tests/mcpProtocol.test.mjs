// tests/mcpProtocol.test.mjs — MCP/JSON-RPC 2.0 协议辅助（无状态、纯函数）
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RPC,
  PROTOCOL_VERSION,
  SERVER_INFO,
  ok,
  fail,
  isRequest,
  clientProtocolVersion,
} from "../lib/mcp/protocol.js";

test("isRequest 只认合法 JSON-RPC 2.0 请求", () => {
  assert.equal(isRequest({ jsonrpc: "2.0", id: 1, method: "ping" }), true);
  assert.equal(isRequest({ jsonrpc: "2.0", method: "ping" }), true); // 通知可无 id
  assert.equal(isRequest({ id: 1, method: "ping" }), false); // 缺 jsonrpc
  assert.equal(isRequest(null), false);
  assert.equal(isRequest("nope"), false);
});

test("ok / fail 产出标准 JSON-RPC 结果与错误形状", () => {
  assert.deepEqual(ok(1, { x: 1 }), { jsonrpc: "2.0", id: 1, result: { x: 1 } });
  // 通知（无 id）→ id 为 null
  assert.equal(ok(undefined, {}).id, null);
  const e = fail(2, RPC.INVALID_PARAMS, "bad");
  assert.equal(e.error.code, RPC.INVALID_PARAMS);
  assert.equal(e.error.message, "bad");
  assert.equal("data" in e.error, false); // 无 data 时不挂字段
  assert.deepEqual(fail(2, RPC.INVALID_PARAMS, "bad", { a: 1 }).error.data, { a: 1 });
});

test("RPC 错误码取值符合 JSON-RPC 标准", () => {
  assert.equal(RPC.PARSE_ERROR, -32700);
  assert.equal(RPC.INVALID_REQUEST, -32600);
  assert.equal(RPC.METHOD_NOT_FOUND, -32601);
  assert.equal(RPC.INVALID_PARAMS, -32602);
  assert.equal(RPC.INTERNAL_ERROR, -32603);
  // MCP 自定义码在 -32000..-32099 区间
  for (const c of [RPC.UNSUPPORTED_PROTOCOL_VERSION, RPC.AUTH_REQUIRED, RPC.RATE_LIMITED, RPC.UNKNOWN_TOOL]) {
    assert.ok(c >= -32099 && c <= -32000, `code ${c} 应在 -32000..-32099 区间`);
  }
});

test("PROTOCOL_VERSION 为带日期字符串，SERVER_INFO 有名称与版本", () => {
  assert.match(PROTOCOL_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(SERVER_INFO.name && SERVER_INFO.version);
});

test("clientProtocolVersion 从 _meta 或顶层读取", () => {
  assert.equal(
    clientProtocolVersion({ _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" } }),
    "2026-07-28",
  );
  assert.equal(clientProtocolVersion({ protocolVersion: "2025-03-26" }), "2025-03-26");
  assert.equal(clientProtocolVersion({}), null);
  assert.equal(clientProtocolVersion(null), null);
});
